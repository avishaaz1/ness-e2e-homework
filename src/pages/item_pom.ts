import { expect, type Locator, type Page } from '@playwright/test';
import { PAGE_READY_TIMEOUT } from '../config/site_common';
import { log } from '../utils/logger_common';
import { dismissPopups, gotoPage } from '../utils/page_common';
import { pickRandom } from '../utils/random_common';

// Every selector and label on this page. Change one here and the page object follows.
const ITEM_SELECTORS = {
  addToCartLabel: /הוסיפו לעגלה|add to cart/i,
  cartBadge: 'a[aria-label*="cart" i]',
  choicePromptText: /בחרו|please select/i,
  skuOption: '[class*="sku"] [class*="item"]',
  // Words in the class of an option that cannot be picked.
  unavailableClass: 'disabled|soldout|sold-out|unavailable',
  price: '[class*="price"]',
};

// A size and a color make two rounds. A third round is a spare.
const MAX_CHOICE_ROUNDS = 3;
const CHOICE_PROMPT_TIMEOUT = 2_000;

export class ItemPage {
  private readonly addToCartButton: Locator;
  private readonly cartBadge: Locator;
  private readonly choicePrompt: Locator;
  private readonly skuOption: Locator;
  private readonly price: Locator;

  constructor(private readonly page: Page) {
    this.addToCartButton = page.getByRole('button', { name: ITEM_SELECTORS.addToCartLabel });
    this.cartBadge = page.locator(ITEM_SELECTORS.cartBadge);
    this.choicePrompt = page.getByText(ITEM_SELECTORS.choicePromptText);
    this.skuOption = page.locator(ITEM_SELECTORS.skuOption);
    this.price = page.locator(ITEM_SELECTORS.price);
  }

  // Text of the first price on the item page. Empty when none shows up in time.
  async readPriceText(): Promise<string> {
    return this.price.first().innerText({ timeout: 10_000 }).catch(() => '');
  }

  async open(url: string): Promise<void> {
    await gotoPage(this.page, url);
    await dismissPopups(this.page);
    await expect(
      this.addToCartButton.first(),
      `item page should show an add-to-cart button: ${url}`,
    ).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
  }

  // `choices` lists what was picked for the item, one entry per group. Empty when the item asked for nothing.
  async addToCart(): Promise<{ added: boolean; detail: string; choices: string[] }> {
    await this.addToCartButton.first().click();

    // Some items ask for a size or color first. Each round picks a random available option and tries again.
    // A new round is only needed when the item has more than one choice, such as size and color.
    const handledGroups = new Set<number>();
    const choices: string[] = [];
    for (let round = 1; round <= MAX_CHOICE_ROUNDS && (await this.isAskingForChoice()); round++) {
      const choice = await this.chooseRandomOption(handledGroups);
      choices.push(choice);
      log.info(`item asks for a choice. ${choice}`);
      await this.addToCartButton.first().click();
    }

    await this.cartBadge.first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);
    const label = (await this.cartBadge.first().getAttribute('aria-label').catch(() => '')) ?? '';
    const added = /[1-9]/.test(label);
    const detail = added
      ? `cart badge "${label}"`
      : `cart badge did not show a count after add to cart (label: "${label || 'missing'}")`;
    if (!added) log.info(detail);
    return { added, detail, choices };
  }

  private async isAskingForChoice(): Promise<boolean> {
    return this.choicePrompt
      .first()
      .waitFor({ state: 'visible', timeout: CHOICE_PROMPT_TIMEOUT })
      .then(() => true)
      .catch(() => false);
  }

  // Picks a random choice group (size, color) that was not handled yet, then a random option in it
  // that is not sold out. Options that share a parent element are one group.
  // Quantity stays 1 on purpose: the cart check multiplies the budget by the number of items,
  // so a bigger quantity would break it.
  private async chooseRandomOption(handledGroups: Set<number>): Promise<string> {
    const available = await this.skuOption.evaluateAll(
      (nodes, unavailable) => {
        const parents: Element[] = [];
        return nodes.flatMap((node, index) => {
          const parent = node.parentElement as Element;
          if (!parents.includes(parent)) parents.push(parent);
          const off = new RegExp(unavailable, 'i').test(node.getAttribute('class') ?? '') || node.getAttribute('aria-disabled') === 'true';
          return off ? [] : [{ index, group: parents.indexOf(parent) }];
        });
      },
      ITEM_SELECTORS.unavailableClass,
    );
    if (available.length === 0) return 'no available option to pick';

    const groups = [...new Set(available.map((option) => option.group))];
    const newGroups = groups.filter((group) => !handledGroups.has(group));
    const group = pickRandom(newGroups.length > 0 ? newGroups : groups);
    handledGroups.add(group);

    const choices = available.filter((option) => option.group === group);
    const { index } = pickRandom(choices);
    await this.skuOption.nth(index).click();
    return `picked option ${index + 1} in group ${group + 1} (${choices.length} available there, ${groups.length} groups)`;
  }
}
