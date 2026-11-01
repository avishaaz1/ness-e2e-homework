import fs from 'node:fs';
import path from 'node:path';

// Copies the report of the latest run (the newest reports/allureReport-* folder) into sample-report,
// so it can be committed as an example. Any earlier sample is replaced.
const root = process.cwd();
const reportsDir = path.join(root, 'reports');
const sampleDir = path.join(root, 'sample-report');

const folders = fs.existsSync(reportsDir)
  ? fs.readdirSync(reportsDir).filter((name) => name.startsWith('allureReport-')).sort()
  : [];

if (folders.length === 0) {
  console.error('There is no report yet. Run npm test first.');
  process.exit(1);
}

// The names hold the date and time of the run, so the last one in order is the newest.
const latest = folders[folders.length - 1];
fs.rmSync(sampleDir, { recursive: true, force: true });
fs.cpSync(path.join(reportsDir, latest), path.join(sampleDir, latest), { recursive: true });
console.log(`Saved ${latest} in ${sampleDir}`);
