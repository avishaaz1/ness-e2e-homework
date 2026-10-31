import { expect, type Locator, type Page } from '@playwright/test';
import { PAGE_READY_TIMEOUT, site } from '../config/site_common';
import { dismissPopups, gotoPage } from '../utils/page_common';

// Every selector on this page. Change one here and the page object follows.
const HOME_SELECTORS = {
  searchBox: '#search-words',
};

export class HomePage {
  private readonly searchBox: Locator;

  constructor(private readonly page: Page) {
    this.searchBox = page.locator(HOME_SELECTORS.searchBox);
  }

  async open(): Promise<void> {
    await gotoPage(this.page, site.HOME);
    await expect(this.searchBox, 'AliExpress home should show the search box').toBeVisible({ timeout: PAGE_READY_TIMEOUT });
    await dismissPopups(this.page);
  }

  async search(query: string): Promise<void> {
    await expect(this.searchBox, 'the search box should be on the page before typing').toBeVisible({ timeout: PAGE_READY_TIMEOUT });
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
