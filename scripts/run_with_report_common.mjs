import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const resultsDir = path.join(root, 'reports', 'allure-results');
const reportDir = path.join(root, 'reports', 'allure-report');
const node = process.execPath;
const playwright = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
const allure = path.join(root, 'node_modules', 'allure', 'cli.js');

fs.rmSync(resultsDir, { recursive: true, force: true });

const test = spawn(node, [playwright, 'test', ...process.argv.slice(2)], { stdio: 'inherit' });

test.on('exit', (code, signal) => {
  const testCode = signal ? 1 : (code ?? 1);
  const hasResults = fs.existsSync(resultsDir) && fs.readdirSync(resultsDir).length > 0;

  if (!hasResults) {
    console.error('No Allure results were written, so there is no report.');
    process.exit(testCode);
  }

  console.log('Building the Allure report. The link is printed when it is ready.');
  const report = spawn(
    node,
    [allure, 'generate', resultsDir, '--clean', '--output', reportDir, '--open', '--host', '127.0.0.1'],
    { stdio: 'inherit' },
  );

  report.on('exit', () => process.exit(testCode));
});
