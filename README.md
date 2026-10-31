# eBay cart budget

Playwright + TypeScript test for ebay.com.

The test opens eBay, searches for a product, keeps items under a max price, adds them to the cart, and checks that the item total stays within the budget.

## What you need

A Windows PC with internet. The steps below install everything else.

Open PowerShell: press the Windows key, type `PowerShell`, and open **Windows PowerShell**. Paste each command and press Enter. After you install Node, Git, or Chrome, close that window and open a new one. The new programs are not visible in the old window.

You do not need `npx playwright install`. The test uses the Chrome you install below.

### 1. Node.js

Node.js includes `npm`, which installs the project packages.

Check what you already have:

```powershell
node -v
npm -v
```

You need Node.js 20 or newer. The version looks like `v20.something` or `v22.something`. If the command is not recognized, or the number is below 20, install the current LTS:

```powershell
winget install OpenJS.NodeJS.LTS
```

Close PowerShell, open it again, and run `node -v` once more. It must be 20 or higher before you continue.

If `winget` is not recognized, download the LTS installer from [https://nodejs.org](https://nodejs.org) and run it. Leave the default options checked, including the one that adds Node to PATH. Then open a new PowerShell and run `node -v`.

### 2. Git

Git downloads the project.

```powershell
git --version
```

If that is not recognized:

```powershell
winget install Git.Git
```

Close PowerShell, open a new one, and run `git --version` again.

If `winget` is not recognized, download Git from [https://git-scm.com/download/win](https://git-scm.com/download/win) and run the installer with the default options.

### 3. Google Chrome

The test drives the normal Google Chrome app, not a browser that comes with Playwright.

If Chrome is not already installed:

```powershell
winget install Google.Chrome
```

If `winget` is not recognized, download it from [https://www.google.com/chrome](https://www.google.com/chrome) and run the installer.

### 4. Download the project and install its packages

```powershell
cd $env:USERPROFILE
git clone https://github.com/avishaaz1/ebay-e2e-homework.git
cd ebay-e2e-homework
npm install
```

`npm install` can take a minute. Wait until the prompt comes back. If you already have the folder, skip the `git clone` line, `cd` into that folder, and run `npm install`.

## Run the test

```bash
npm test
```

Chrome opens an Incognito window and you can watch the run. Before the test itself, the project opens ebay.com, closes the shipping popup if it is there, and continues as a guest.

The default search is in `src/utils/scenario_common.ts`:

- search: `shoes`
- max price: `220`
- items: `5`

Change those three values and run `npm test` again.

To hide the browser window, in PowerShell:

```powershell
$env:HEADLESS = "1"
npm test
```

## Optional login

With no username and password the test stays a guest, and Add to cart still works. If eBay shows a captcha on login, leave the credentials empty.

Copy `.env.example` to `.env` and fill in:

```
EBAY_USERNAME=your-email
EBAY_PASSWORD=your-password
```

Or set them for one run:

```powershell
$env:EBAY_USERNAME = "your-email"
$env:EBAY_PASSWORD = "your-password"
npm test
```

`.env` is not part of the project download. Do not commit it.

## Reports and screenshots

These folders are created on your machine when the test runs. They are not in git.

- `reports/html` — the HTML report
- `artifacts/screenshots` — one screenshot per added item, plus the cart

Open the report:

```bash
npm run report:html
```

## Debug in the editor

In Cursor or VS Code, open **Run and Debug**, choose **Debug Playwright test**, and start it. Put a breakpoint in the test or in a page method, then use step over (`F10`) and step into (`F11`).

That launch config expects Node at `C:\Program Files\nodejs\node.exe`. If Node is installed somewhere else, change `runtimeExecutable` in `.vscode/launch.json`.

## How the code is organized

```
src/pages/*_pom.ts            page objects and their locators
src/flows/ebay_shop_common.ts the shop actions
src/config/site_common.ts     site addresses
src/config/browser_common.ts  window size and locale
src/utils/scenario_common.ts  search, max price, item limit
src/utils/price_common.ts     price parsing
src/utils/env_common.ts       reads .env
src/utils/logger_common.ts    console log
src/browser/chrome_common.ts  starts and stops Chrome
tests/cart-budget.spec.ts     the test
tests/fixtures_common.ts      builds the shop before the test
```

`EbayShop` methods:

- `signIn()` — log in, or stay a guest. The fixture calls this before the test.
- `searchItemsByNameUnderPrice(query, maxPrice, limit = 5)`
- `addItemsToCart(urls)`
- `assertCartTotalNotExceeds(budgetPerItem, itemsCount)`

Search reads result cards with xpath (`li.s-card` and an `/itm/` link). Locators stay on stable ids and labels: `#gh-ac`, `#gh-search-btn`, `#atcBtn_btn_1`, and `a[aria-label="Go to next search page"]`. If the current page does not have enough items under the price, the test clicks Next until it reaches the limit or the pages run out.

## Assumptions

- Prices are compared in the currency eBay shows. With an Israel ship-to address that is ILS, so `maxPrice` is compared to that number.
- Each run opens a new Incognito window, so the cart and history start empty.
- Quantity stays 1. Size and color are picked at random from the options that are in stock.
- A price range such as `ILS 12.42 to ILS 31.10` uses the higher number.
- The cart check reads the Item line (`data-test-id="ITEM_TOTAL"`). eBay's Subtotal includes shipping, and the search filter does not. The Subtotal is only written to the log.
- The cart total must be `<= maxPrice * item count`.
- Listings with no Add to cart button are skipped and screenshotted. The test does not click Buy It Now.
- The placeholder "Shop on eBay" card (`/itm/123456`) is ignored.

The bug-review writeup is in `ReadMeAIBugs.md`.
