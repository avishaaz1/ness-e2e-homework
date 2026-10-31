import { type Locator } from '@playwright/test';
import { ELEMENT_TIMEOUT } from '../config/browser_common';

// Wait until the control is on screen, then the caller types or clicks.
export async function waitVisible(locator: Locator): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout: ELEMENT_TIMEOUT });
}

// Optional controls (a popup, a next-page link, a variant list) may never show up.
export async function appears(locator: Locator, timeout = ELEMENT_TIMEOUT): Promise<boolean> {
  return locator.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
}
