import fs from 'fs';
import path from 'path';
import { test, type Page } from '@playwright/test';

const SCREENSHOTS = path.resolve('artifacts/screenshots');

// Where a screenshot file goes. The folder is created when it is missing.
export function screenshotPath(name: string): string {
  fs.mkdirSync(SCREENSHOTS, { recursive: true });
  return path.join(SCREENSHOTS, name);
}

// Saves the screenshot in artifacts/screenshots and attaches the same picture to the report.
export async function saveScreenshot(page: Page, fileName: string, label: string): Promise<void> {
  const file = screenshotPath(fileName);
  await page.screenshot({ path: file });
  await test.info().attach(label, { path: file, contentType: 'image/png' });
}
