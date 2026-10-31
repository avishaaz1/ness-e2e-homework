import { expect, type Locator, type Page } from '@playwright/test';
import { site } from '../config/site_common';

export class HomePage {
  private readonly searchBox: Locator;

  constructor(private readonly page: Page) {
    this.searchBox = page.locator('#search-words');
  }

  async open(): Promise<void> {
    await this.page.goto(site.HOME, { waitUntil: 'domcontentloaded' });
    await expect(this.searchBox, 'AliExpress home should show the search box').toBeVisible({ timeout: 20_000 });
    await this.page.keyboard.press('Escape');
  }

  async search(query: string): Promise<void> {
    await expect(this.searchBox, 'the search box should be on the page before typing').toBeVisible({ timeout: 20_000 });
    await this.searchBox.click({ force: true });
    await this.searchBox.fill(query);
    await this.searchBox.press('Enter');
    // A product id opens that item. Any other search opens the results page.
    await expect(
      this.page,
      `search for "${query}" should open that item or the results page`,
    ).toHaveURL(/\/item\/|\/w\/wholesale|SearchText/, { timeout: 30_000 });
  }
}
