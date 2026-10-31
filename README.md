# eBay cart budget

Playwright + TypeScript test for ebay.com.

The test searches for a product, keeps items under a max price, adds them to the cart, and checks that the item total stays within the budget.

## What you need

- Node.js 20 or newer
- Google Chrome installed
- Internet access to ebay.com

Java and the Allure command line are optional. The HTML report works without them.

## Get the project

```bash
git clone https://github.com/avishaaz1/ebay-e2e-homework.git
cd ebay-e2e-homework
npm install
```

If you already have the folder, skip the clone and start from `npm install`.

## Run the test

```bash
npm test
```

Chrome opens on its own. You can watch the run.

The inputs live in `src/utils/scenario_common.ts`:

- search: `shoes`
- max price: `220`
- items: `5`

Login is optional. With no username and password the test continues as a guest, and Add to cart still works. If eBay shows a captcha on login, leave the credentials empty.

PowerShell:

```powershell
$env:EBAY_USERNAME = "your-email"
$env:EBAY_PASSWORD = "your-password"
npm test
```

You can copy `.env.example` to `.env` and fill the same values there. That file is optional.

## Reports and screenshots

After a run:

```bash
npm run report:html
```

Files:

- `reports/html` — Playwright HTML report
- `reports/junit/results.xml` — JUnit
- `reports/allure-results` — raw Allure results
- `artifacts/screenshots` — one screenshot per added item, plus the cart

Allure report, only if Allure is installed:

```bash
npm run report:allure
```

## How the code is organized

```
src/config/site_common.ts          site addresses
src/config/browser_common.ts       window size and locale
src/pages/*_pom.ts                 page objects and their locators
src/utils/scenario_common.ts       test input
src/flows/ebay_shop_common.ts      the four actions
src/utils/price_common.ts          price parsing
tests/cart-budget.spec.ts          the scenario
```

`EbayShop` methods:

- `signIn()` — log in, or stay a guest
- `searchItemsByNameUnderPrice(query, maxPrice, limit = 5)`
- `addItemsToCart(urls)`
- `assertCartTotalNotExceeds(budgetPerItem, itemsCount)`

Search reads result cards with xpath (`li.s-card` and an `/itm/` link). Locators stay on stable ids and labels: `#gh-ac`, `#gh-search-btn`, `#atcBtn_btn_1`, and `a[aria-label="Go to next search page"]`. If the current page does not have enough items under the price, the test clicks Next until it reaches the limit or the pages run out.

## Assumptions

- Prices are compared in the currency eBay shows. With an Israel ship-to address that is ILS, so `maxPrice` is compared to that number.
- No `EBAY_USERNAME` / `EBAY_PASSWORD` means guest checkout. Each run opens a new Incognito window, so the cart and history start empty.
- Quantity stays 1. Size and color are picked at random from the options that are in stock. A random quantity would fail the budget check even when the unit price is fine.
- A price range such as `ILS 12.42 to ILS 31.10` uses the higher number, so a more expensive variant still fits under `maxPrice`.
- The cart check reads the Item line (`data-test-id="ITEM_TOTAL"`). eBay's Subtotal includes shipping, and the search filter does not. The Subtotal is only written to the log.
- Listings with no Add to cart button are skipped and screenshotted. The test does not click Buy It Now.
- The placeholder "Shop on eBay" card (`/itm/123456`) is ignored.
- The homework sample says the cart total should be `>= 220 * item count`. The function name and the line above it say the total must not go over the limit, so the assertion is `<=`.

The bug-review writeup is in `ReadMeAIBugs.md`.
