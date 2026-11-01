import { type Locator, type Page } from '@playwright/test';
import { log } from '../utils/logger_common';

// The site shows popups at random times, and they cover the header. Class names ending in a
// code change between releases, so the close icons are found by what they are, not by class.
const POPUP_SELECTORS = {
  // The x of the "Sign up for notifications" box, found by its image file.
  notificationBannerClose: 'img[src*="TB1GSux3fb2gK0jSZK9XXaEgFXa"]',
  // The x of the big sale popup in the middle of the page.
  salePopupClose: '.pop-close-btn',
};

const POPUP_CLOSE_TIMEOUT = 5_000;

export class Popups {
  private readonly notificationBannerClose: Locator;
  private readonly salePopupClose: Locator;

  constructor(private readonly page: Page) {
    this.notificationBannerClose = page.locator(POPUP_SELECTORS.notificationBannerClose).first();
    this.salePopupClose = page.locator(POPUP_SELECTORS.salePopupClose).first();
  }

  // From now on, a popup that shows up before a click or hover is closed first.
  // The close icons sit under a transparent layer, so a real mouse click never reaches them.
  // Sending the click event straight to the icon is what works.
  // noWaitAfter: a closed popup can stay in the page with a size, so waiting for it to count as hidden never ends.
  closeWhenTheyAppear(): void {
    this.closeWith(this.notificationBannerClose, 'notification banner');
    this.closeWith(this.salePopupClose, 'sale popup');
  }

  private closeWith(closeIcon: Locator, name: string): void {
    void this.page.addLocatorHandler(
      closeIcon,
      async () => {
        log.info(`closing the ${name}`);
        await closeIcon.dispatchEvent('click', undefined, { timeout: POPUP_CLOSE_TIMEOUT }).catch(() => undefined);
      },
      { noWaitAfter: true },
    );
  }
}
