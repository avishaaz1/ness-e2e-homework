# AliExpress cart budget

Playwright + TypeScript test for AliExpress.

The test opens AliExpress, searches for a product, keeps items under a max price, adds them to the cart, and checks that the item total stays within the budget.

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
git clone https://github.com/avishaaz1/ness-e2e-homework.git
cd ness-e2e-homework
npm install
```

`npm install` can take a minute. Wait until the prompt comes back. If you already have the folder, skip the `git clone` line, `cd` into that folder, and run `npm install`.

## Run the test

```bash
npm test
```

Playwright opens Chrome and you can watch the run. Each run starts in a fresh window, so the cart and history are empty. The test stays a guest. No login is required.

When the test finishes, pass or fail, Allure opens in the browser. The terminal prints a line like `Allure is running on http://127.0.0.1:54321`. That page shows whether the test passed or failed. Leave the terminal open while you read the report. Press Ctrl+C when you are done.

`npm test` runs every test in `tests`. The Allure report lists each one from that run.

The four sets are in `src/utils/scenario_common.ts`:

- `fiveItems` — 5 shoes under 50, then the cart check
- `fewerThanFive` — one product id, so the search opens that single item
- `noneFound` — max price 0, so the result list is empty
- `nextPage` — shoes under 50, more than one page holds, so the run clicks Next

To hide the browser window, in PowerShell:

```powershell
$env:HEADLESS = "1"
npm test
```

## Reports and screenshots

These folders are created on your machine when the test runs. They are not in git.

- `reports/allure-report` — the Allure report, with pass or fail on the first screen
- `artifacts/screenshots` — one screenshot per added item, plus the cart

`npm test` opens Allure and prints its link. To open the last Allure report again:

```bash
npm run report:allure
```

## Debug in the editor

In Cursor or VS Code, open **Run and Debug**, choose **Debug Playwright test**, and start it. Put a breakpoint in the test or in a page method, then use step over (`F10`) and step into (`F11`).

That launch config expects Node at `C:\Program Files\nodejs\node.exe`. If Node is installed somewhere else, change `runtimeExecutable` in `.vscode/launch.json`.

## How the code is organized

```
src/pages/*_pom.ts                     page objects and their locators
src/flows/aliexpress_shop_common.ts    the shop actions
src/config/site_common.ts              site addresses
src/config/browser_common.ts           window size and locale
src/utils/scenario_common.ts           search, max price, item limit
src/utils/price_common.ts              price parsing
src/utils/logger_common.ts             console log
tests/cart-budget.spec.ts              the tests
tests/fixtures_common.ts               builds the shop before the test
```

`AliShop` methods:

- `open()` — open AliExpress. The fixture calls this before the test.
- `searchItemsByNameUnderPrice(query, maxPrice, limit = 5)`
- `addItemsToCart(urls)`
- `assertCartTotalNotExceeds(budgetPerItem, itemsCount)`

Search reads `a.search-card-item`. The sale price is the first ILS amount on the card. If the current page does not have enough items under the price, the test clicks Next until it reaches the limit or the pages run out. A product id opens that item directly, so the result is that one URL. A max price of 0 returns an empty list.

The Next test opens the results address directly. Opening the homepage first hides the Next control.

## Assumptions

- The site redirects to `he.aliexpress.com`. Prices are in ILS, so `maxPrice` is compared to that number.
- Each run starts in a fresh browser window, so the cart and history start empty. The test stays a guest.
- Quantity stays 1. If the item asks for a size or color, the first available option is chosen.
- The sale price is the first amount on the line. The crossed-out original price and the "you save" amount are not the price paid.
- The cart check sums the line prices (`.cart-product-price-buynow`). The summary stays 0 until a checkbox is ticked, so it is not the total.
- The cart total must be `<= maxPrice * item count`.
- The Next test does not add those items to the cart.

The bug-review writeup is in `ReadMeAIBugs.md`.
