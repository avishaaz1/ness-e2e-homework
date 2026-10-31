import { type Page } from '@playwright/test';

// Every page load in the suite goes through here, so the wait rule lives in one place.
export async function gotoPage(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
}

// Closes a popup that may cover the page.
export async function dismissPopups(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
}
