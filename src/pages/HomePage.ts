import { expect, type Page } from '@playwright/test';

export class HomePage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.setViewportSize({ width: 1366, height: 900 }).catch(() => undefined);

    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.page.goto('https://www.ebay.com/', { waitUntil: 'domcontentloaded' });
      await this.dismissPopups();
      if (!(await this.blocked())) break;
      // eBay sometimes shows a short challenge on a fresh profile, then lets the next load through
      await this.page.waitForTimeout(4_000);
    }

    if (await this.blocked()) {
      throw new Error('eBay blocked this browser (error page or interruption). Close other Chrome windows started by the test and run again.');
    }

    await expect(this.page.locator('#gh-ac')).toBeVisible();
  }

  private async blocked(): Promise<boolean> {
    const title = await this.page.title();
    const url = this.page.url();
    return title.includes('Error Page') || title.includes('Pardon Our Interruption') || url.includes('/splashui/');
  }

  async search(query: string): Promise<void> {
    const box = this.page.locator('#gh-ac');
    await box.click();
    await box.fill(query);
    await this.page.locator('#gh-search-btn').click();
    await this.page.waitForURL(/\/sch\//, { timeout: 30_000 });
    await this.dismissPopups();
  }

  private async dismissPopups(): Promise<void> {
    const accept = this.page.getByRole('button', { name: /accept all|i agree|agree/i });
    if (await accept.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await accept.first().click();
    }

    const close = this.page.getByRole('button', { name: /close dialog|close dialogue/i });
    if (await close.first().isVisible({ timeout: 1_000 }).catch(() => false)) {
      await close.first().click();
    }
  }
}
