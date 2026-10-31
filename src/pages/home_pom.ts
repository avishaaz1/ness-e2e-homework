import { expect, type Locator, type Page } from '@playwright/test';
import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from '../config/browser_common';
import { site } from '../config/site_common';

export class HomePage {
  private readonly searchBox: Locator;
  private readonly searchButton: Locator;
  private readonly acceptCookies: Locator;
  private readonly closeDialog: Locator;
  private readonly countryPopupClose: Locator;

  constructor(private readonly page: Page) {
    this.searchBox = page.locator('#gh-ac');
    this.searchButton = page.locator('#gh-search-btn');
    this.acceptCookies = page.getByRole('button', { name: /accept all|i agree|agree/i });
    this.closeDialog = page.getByRole('button', { name: /close dialog|close dialogue/i });
    this.countryPopupClose = page.locator('.address-dialog__lightbox').getByRole('button', { name: 'Dismiss' });
  }

  async open(): Promise<void> {
    await this.page.setViewportSize({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT }).catch(() => undefined);

    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.page.goto(site.HOME, { waitUntil: 'domcontentloaded' });
      await this.dismissPopups();
      if (!(await this.blocked())) break;
      // eBay sometimes shows a short challenge on a fresh profile, then lets the next load through
      await this.page.waitForTimeout(4_000);
    }

    if (await this.blocked()) {
      throw new Error('eBay blocked this browser (error page or interruption). Close other Chrome windows started by the test and run again.');
    }

    await expect(this.searchBox).toBeVisible();
    await this.closeCountryPopup();
  }

  async closeCountryPopup(): Promise<void> {
    if (!(await this.countryPopupClose.isVisible({ timeout: 3_000 }).catch(() => false))) return;
    await this.countryPopupClose.click();
    await this.countryPopupClose.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  }

  private async blocked(): Promise<boolean> {
    const title = await this.page.title();
    const url = this.page.url();
    return title.includes('Error Page') || title.includes('Pardon Our Interruption') || url.includes('/splashui/');
  }

  async search(query: string): Promise<void> {
    await this.searchBox.click();
    await this.searchBox.fill(query);
    await this.searchButton.click();
    await this.page.waitForURL(/\/sch\//, { timeout: 30_000 });
    await this.dismissPopups();
  }

  private async dismissPopups(): Promise<void> {
    if (await this.acceptCookies.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await this.acceptCookies.first().click();
    }

    if (await this.closeDialog.first().isVisible({ timeout: 1_000 }).catch(() => false)) {
      await this.closeDialog.first().click();
    }
  }
}
