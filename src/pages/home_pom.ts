import { type Locator, type Page } from '@playwright/test';
import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from '../config/browser_common';
import { site } from '../config/site_common';
import { log } from '../utils/logger_common';
import { appears, waitVisible } from '../utils/wait_common';

export class HomePage {
  private readonly searchBox: Locator;
  private readonly searchButton: Locator;
  private readonly acceptCookies: Locator;
  private readonly closeDialog: Locator;

  constructor(private readonly page: Page) {
    this.searchBox = page.locator('#gh-ac');
    this.searchButton = page.locator('#gh-search-btn');
    this.acceptCookies = page.getByRole('button', { name: /accept all|i agree|agree/i });
    this.closeDialog = page.getByRole('button', { name: /close dialog|close dialogue/i });
  }

  async open(): Promise<void> {
    await this.page.setViewportSize({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT }).catch(() => undefined);
    await this.page.goto(site.HOME, { waitUntil: 'domcontentloaded' });
    await this.dismissPopups();
    await this.closeCountryPopup();
    // A fresh load sometimes lands on eBay's error page. Refresh before the test uses the page.
    log.info('refreshing the homepage');
    await this.reloadUntilReady();
  }

  async closeCountryPopup(): Promise<void> {
    const dialog = this.page.locator('.address-dialog__lightbox');
    if (!(await appears(dialog, 4_000))) return;

    const button = dialog.getByRole('button').first();
    await button.click({ force: true, timeout: 3_000 }).catch(async () => {
      await this.page.keyboard.press('Escape');
    });
    await dialog.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  }

  private async blocked(): Promise<boolean> {
    const title = await this.page.title();
    const url = this.page.url();
    if (title.includes('Error Page') || title.includes('Pardon Our Interruption') || url.includes('/splashui/')) {
      return true;
    }
    const body = await this.page.locator('body').innerText().catch(() => '');
    return /something went wrong|pardon our interruption/i.test(body);
  }

  private async homeReady(): Promise<boolean> {
    if (await this.blocked()) return false;
    return appears(this.searchBox);
  }

  // Reloads until the search box is on screen. eBay's error page has no #gh-ac.
  private async reloadUntilReady(): Promise<void> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.dismissPopups();
      await this.closeCountryPopup();
      if (await this.homeReady()) return;
      log.info(`homepage not ready, refreshing again (${attempt})`);
    }

    throw new Error('eBay showed an error page. The homepage was refreshed and the search box still did not appear.');
  }

  async search(query: string): Promise<void> {
    if (!(await this.homeReady())) {
      log.info('search box missing, refreshing the homepage');
      await this.reloadUntilReady();
    }

    try {
      await this.submitSearch(query);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.info(`search did not start (${message}), refreshing the homepage`);
      await this.reloadUntilReady();
      await this.submitSearch(query);
    }
  }

  private async submitSearch(query: string): Promise<void> {
    await this.closeCountryPopup();
    await waitVisible(this.searchBox);
    // force: the shipping dialog covers the header and blocks a normal click.
    await this.searchBox.click({ force: true });
    await this.searchBox.fill(query);
    await waitVisible(this.searchButton);
    await this.searchButton.click({ force: true });
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
