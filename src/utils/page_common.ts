import { type Page } from '@playwright/test';

// eBay sometimes answers with "Something went wrong" instead of the real page.
export async function isErrorPage(page: Page): Promise<boolean> {
  const title = await page.title().catch(() => '');
  if (title.includes('Error Page') || title.includes('Pardon Our Interruption') || page.url().includes('/splashui/')) {
    return true;
  }
  return page
    .getByText(/something went wrong|pardon our interruption/i)
    .first()
    .isVisible()
    .catch(() => false);
}
