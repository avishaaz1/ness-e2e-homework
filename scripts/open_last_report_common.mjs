import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Opens the report of the latest run: the newest reports/allureReport-* folder.
const reportsDir = path.join(process.cwd(), 'reports');
const folders = fs.existsSync(reportsDir)
  ? fs.readdirSync(reportsDir).filter((name) => name.startsWith('allureReport-')).sort()
  : [];

if (folders.length === 0) {
  console.error('There is no report yet. Run npm test first.');
  process.exit(1);
}

// The names hold the date and time of the run, so the last one in order is the newest.
const file = path.join(reportsDir, folders[folders.length - 1], 'index.html');
console.log(`Opening ${file}`);
const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
// On Windows the path is quoted by hand, so a folder name with spaces still works.
const args = process.platform === 'win32' ? ['/c', 'start', '""', `"${file}"`] : [file];
spawn(command, args, { stdio: 'ignore', detached: true, windowsVerbatimArguments: true }).unref();
