import { type Locator, type Page } from '@playwright/test';
import { site } from '../config/site_common';

export class HomePage {
  private readonly searchBox: Locator;

  constructor(private readonly page: Page) {
    this.searchBox = page.locator('#search-words');
  }

  async open(): Promise<void> {
    await this.page.goto(site.HOME, { waitUntil: 'domcontentloaded' });
    await this.searchBox.waitFor({ state: 'visible', timeout: 20_000 });
    await this.page.keyboard.press('Escape');
  }

  async search(query: string): Promise<void> {
    await this.searchBox.waitFor({ state: 'visible', timeout: 20_000 });
    await this.searchBox.click({ force: true });
    await this.searchBox.fill(query);
    await this.searchBox.press('Enter');
    // A product id opens that item. Any other search opens the results page.
    await this.page.waitForURL(/\/item\/|\/w\/wholesale|SearchText/, { timeout: 30_000 });
  }
}
