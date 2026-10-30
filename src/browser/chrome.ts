import { execSync, spawn } from 'child_process';
import fs from 'fs';
import http from 'http';
import path from 'path';

const PORT = 9333;
const CDP_FILE = path.resolve('artifacts/cdp.json');
const PID_FILE = path.resolve('artifacts/chrome.pid');

type Version = { webSocketDebuggerUrl: string };

function chromePath(): string {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  ];
  const found = candidates.find((candidate) => candidate && fs.existsSync(candidate));
  if (!found) {
    throw new Error('Google Chrome was not found. Install Chrome and run the test again.');
  }
  return found;
}

function readJson(url: string): Promise<Version> {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let body = '';
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        try {
          resolve(JSON.parse(body) as Version);
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('error', reject);
    request.setTimeout(2_000, () => {
      request.destroy(new Error('timeout'));
    });
  });
}

async function waitForChrome(): Promise<Version> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      return await readJson(`http://127.0.0.1:${PORT}/json/version`);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Chrome did not open the debug port. ${String(lastError)}`);
}

function freePort(): void {
  stopChrome();
  try {
    const out = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
    const pids = new Set<string>();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes(`:${PORT}`) || !line.includes('LISTENING')) continue;
      const pid = line.trim().split(/\s+/).pop();
      if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      } catch {
        // already gone
      }
    }
  } catch {
    // netstat missing, the next launch will say if the port is busy
  }
}

export async function startChrome(): Promise<void> {
  fs.mkdirSync(path.dirname(CDP_FILE), { recursive: true });

  let version: Version;
  try {
    version = await readJson(`http://127.0.0.1:${PORT}/json/version`);
  } catch {
    freePort();
    const profile = path.resolve('.chrome-profile');
    fs.mkdirSync(profile, { recursive: true });
    const child = spawn(
      chromePath(),
      [
        `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${profile}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1366,900',
        ...(process.env.HEADLESS === '1' ? ['--headless=new'] : []),
        'about:blank',
      ],
      { detached: true, stdio: 'ignore' },
    );
    child.unref();
    if (child.pid) fs.writeFileSync(PID_FILE, String(child.pid));
    version = await waitForChrome();
  }

  fs.writeFileSync(CDP_FILE, JSON.stringify({ wsEndpoint: version.webSocketDebuggerUrl }));
}

export function stopChrome(): void {
  if (!fs.existsSync(PID_FILE)) return;
  const pid = Number(fs.readFileSync(PID_FILE, 'utf8'));
  fs.unlinkSync(PID_FILE);
  if (!pid) return;
  try {
    execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
  } catch {
    // already closed
  }
}

export async function restartChrome(): Promise<void> {
  if (fs.existsSync(CDP_FILE)) fs.unlinkSync(CDP_FILE);
  freePort();
  await new Promise((resolve) => setTimeout(resolve, 800));
  await startChrome();
}

export function cdpEndpoint(): string | undefined {
  if (!fs.existsSync(CDP_FILE)) return undefined;
  const saved = JSON.parse(fs.readFileSync(CDP_FILE, 'utf8')) as { wsEndpoint?: string };
  return saved.wsEndpoint;
}
