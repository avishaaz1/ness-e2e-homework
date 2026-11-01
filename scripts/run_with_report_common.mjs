import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Runs the tests, then builds one report for this run: reports/allureReport-YYYY-MM-DD_HH-mm-ss/index.html.
// The date and time are those of the run, so reports of earlier runs stay in the reports folder.
// The report is one HTML file with everything inside. It opens by double click, with no server.
//
// Environment:
//   REPORT_OPEN=0   build the report but do not open it in the browser
//   TRACE=on        keep Playwright traces (the report gets much bigger, a failed test adds a few MB)
const root = process.cwd();
const reportsDir = path.join(root, 'reports');
const resultsDir = path.join(reportsDir, 'allure-results');
const node = process.execPath;
const playwright = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
const allure = path.join(root, 'node_modules', 'allure', 'cli.js');

function two(value) {
  return String(value).padStart(2, '0');
}

// Local time of the run, safe to use in a folder name.
function runStamp(date) {
  const day = `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
  const time = `${two(date.getHours())}-${two(date.getMinutes())}-${two(date.getSeconds())}`;
  return `${day}_${time}`;
}

function openInBrowser(file) {
  const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  // On Windows the path is quoted by hand, so a folder name with spaces still works.
  const args = process.platform === 'win32' ? ['/c', 'start', '""', `"${file}"`] : [file];
  spawn(command, args, { stdio: 'ignore', detached: true, windowsVerbatimArguments: true }).unref();
}

const startedAt = new Date();
const reportName = `allureReport-${runStamp(startedAt)}`;
const reportDir = path.join(reportsDir, reportName);

fs.rmSync(resultsDir, { recursive: true, force: true });

const traceArgs = process.env.TRACE === 'on' ? [] : ['--trace', 'off'];
const test = spawn(node, [playwright, 'test', ...traceArgs, ...process.argv.slice(2)], { stdio: 'inherit' });

test.on('exit', (code, signal) => {
  const testCode = signal ? 1 : (code ?? 1);
  // A stopped run (Ctrl+C or a killed process) must not produce a report that looks complete.
  if (signal) {
    console.error('The test run was stopped, so no report was built.');
    process.exit(testCode);
  }
  if (!fs.existsSync(resultsDir) || fs.readdirSync(resultsDir).length === 0) {
    console.error('No Allure results were written, so there is no report.');
    process.exit(testCode);
  }

  console.log(`Building ${reportName}`);
  const report = spawn(
    node,
    [allure, 'generate', resultsDir, '--config', 'allurerc.mjs', '--output', reportDir, '--report-name', reportName],
    { stdio: 'inherit' },
  );
  report.on('exit', (reportCode) => {
    const file = path.join(reportDir, 'index.html');
    if (reportCode === 0 && fs.existsSync(file)) {
      const megabytes = (fs.statSync(file).size / 1024 / 1024).toFixed(1);
      console.log(`Report ready: ${file} (${megabytes} MB)`);
      if (process.env.REPORT_OPEN !== '0') openInBrowser(file);
    } else {
      console.error('The report could not be built.');
    }
    process.exit(testCode);
  });
});
