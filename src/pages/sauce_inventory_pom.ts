import { type Locator, type Page } from '@playwright/test';

// Every selector on the Sauce Demo product page.
const SAUCE_INVENTORY_SELECTORS = {
  productList: '[data-test="inventory-list"]',
  menuButton: '#react-burger-menu-btn',
  logoutLink: '[data-test="logout-sidebar-link"]',
};

export class SauceInventoryPage {
  private readonly productList: Locator;
  private readonly menuButton: Locator;
  private readonly logoutLink: Locator;

  constructor(private readonly page: Page) {
    this.productList = page.locator(SAUCE_INVENTORY_SELECTORS.productList);
    this.menuButton = page.locator(SAUCE_INVENTORY_SELECTORS.menuButton);
    this.logoutLink = page.locator(SAUCE_INVENTORY_SELECTORS.logoutLink);
  }

  // True when the product list shows up within the wait. False means the visitor is not signed in.
  async isShown(timeout = 10_000): Promise<boolean> {
    return this.productList
      .waitFor({ state: 'visible', timeout })
      .then(() => true)
      .catch(() => false);
  }

  async logout(): Promise<void> {
    await this.menuButton.click();
    await this.logoutLink.click();
  }
}
