import fs from 'fs';
import path from 'path';

// small .env reader so we don't need another package
export function loadDotEnv(file = '.env'): void {
  const full = path.resolve(file);
  if (!fs.existsSync(full)) return;

  for (const rawLine of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
