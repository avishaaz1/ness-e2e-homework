import { expect, type Locator, type Page } from '@playwright/test';
import { PAGE_READY_TIMEOUT, site } from '../config/site_common';
import { dismissPopups, gotoPage } from '../utils/page_common';

// Every selector on this page. Change one here and the page object follows.
const HOME_SELECTORS = {
  searchBox: '#search-words',
  // The person icon in the header. Class names end in a changing code, so only the start is matched.
  accountMenu: '[class*="my-account--menuItem"]',
  // The Sign in button inside the account menu. It only exists while nobody is signed in.
  signInButton: 'button[class*="my-account--signin"]',
  // The Sign out link inside the account menu. It only exists while somebody is signed in.
  signOutLink: 'a[class*="my-account--out"]',
};

const SIGN_IN_MENU_TIMEOUT = 60_000;

export class HomePage {
  private readonly searchBox: Locator;
  private readonly accountMenu: Locator;
  private readonly signInButton: Locator;
  private readonly signOutLink: Locator;

  constructor(private readonly page: Page) {
    this.searchBox = page.locator(HOME_SELECTORS.searchBox);
    this.accountMenu = page.locator(HOME_SELECTORS.accountMenu);
    this.signInButton = page.locator(HOME_SELECTORS.signInButton);
    this.signOutLink = page.locator(HOME_SELECTORS.signOutLink);
  }

  // Person icon, then Sign in. Opens the sign in form on top of the home page.
  async openSignIn(): Promise<void> {
    // Moving the mouse onto the icon already opens the menu, and a click would close it again.
    // Popups can show up late and are closed on the way, so these two steps get extra time.
    await this.accountMenu.first().hover({ timeout: SIGN_IN_MENU_TIMEOUT });
    await this.signInButton.first().click({ timeout: SIGN_IN_MENU_TIMEOUT });
  }

  // True once the account menu offers Sign out. Only a signed in visitor sees it.
  async isSignedIn(): Promise<boolean> {
    await this.accountMenu.first().hover({ timeout: SIGN_IN_MENU_TIMEOUT });
    return this.signOutLink
      .first()
      .waitFor({ state: 'visible', timeout: PAGE_READY_TIMEOUT })
      .then(() => true)
      .catch(() => false);
  }

  // Account menu, then Sign out.
  async signOut(): Promise<void> {
    await this.accountMenu.first().hover({ timeout: SIGN_IN_MENU_TIMEOUT });
    await this.signOutLink.first().click({ timeout: SIGN_IN_MENU_TIMEOUT });
  }

  // True once the Sign in button is back in the account menu. Only a signed out visitor has it.
  async isSignedOut(): Promise<boolean> {
    return this.signInButton
      .first()
      .waitFor({ state: 'attached', timeout: PAGE_READY_TIMEOUT })
      .then(() => true)
      .catch(() => false);
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
