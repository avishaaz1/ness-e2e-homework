import type { Page } from '@playwright/test';
import { HomePage } from '../pages/home_pom';
import { AliCartFlow } from './aliexpress_cart_common';
import { AliLoginFlow } from './aliexpress_login_common';
import { AliSearchFlow } from './aliexpress_search_common';
import type { LoginResult } from './login_result_common';

// The shop as a test sees it. It holds the three flows (login, search, cart) and passes each call to the
// right one, so a test talks to one object and the code of each area stays in its own file.
export class AliShop {
  private readonly home: HomePage;
  private readonly loginFlow: AliLoginFlow;
  private readonly searchFlow: AliSearchFlow;
  private readonly cartFlow: AliCartFlow;

  constructor(private readonly page: Page) {
    this.home = new HomePage(page);
    this.loginFlow = new AliLoginFlow(page);
    this.searchFlow = new AliSearchFlow(page);
    this.cartFlow = new AliCartFlow(page);
  }

  // How many result pages the last search looked at.
  get pagesOpened(): number {
    return this.searchFlow.pagesOpened;
  }

  async open(): Promise<void> {
    await this.home.open();
  }

  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
  }

  // Login
  attemptLogin(username: string, password: string): Promise<LoginResult> {
    return this.loginFlow.attemptLogin(username, password);
  }

  login(username: string, password: string): Promise<void> {
    return this.loginFlow.login(username, password);
  }

  logout(): Promise<void> {
    return this.loginFlow.logout();
  }

  isSignedIn(): Promise<boolean> {
    return this.loginFlow.isSignedIn();
  }

  openSignInForm(): Promise<void> {
    return this.loginFlow.openSignInForm();
  }

  isCaptchaCoveringPage(): Promise<boolean> {
    return this.loginFlow.isCaptchaCoveringPage();
  }

  isContinueEnabled(): Promise<boolean> {
    return this.loginFlow.isContinueEnabled();
  }

  // Search
  // Up to `limit` item URLs whose sale price is <= maxPrice. Fewer, including 0, is a valid result.
  searchItemsByNameUnderPrice(query: string, maxPrice: number, limit: number, direct = false): Promise<string[]> {
    return this.searchFlow.searchItemsByNameUnderPrice(query, maxPrice, limit, direct);
  }

  // Cart
  addItemsToCart(urls: string[]): Promise<void> {
    return this.cartFlow.addItemsToCart(urls);
  }

  assertCartTotalNotExceeds(budgetPerItem: number, itemsCount: number): Promise<void> {
    return this.cartFlow.assertCartTotalNotExceeds(budgetPerItem, itemsCount);
  }
}
