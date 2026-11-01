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

Playwright opens Chrome and you can watch the run. Each run starts in a fresh window, so the cart and history are empty. The cart tests stay a guest. No login is required for them.

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

## Login tests

`tests/login.spec.ts` checks the sign in flow on [Sauce Demo](https://www.saucedemo.com/), a practice shop made for automation. AliExpress shows a slider captcha after the password in automated runs, so it cannot be tested without a person. The tests do not try to get around it. Sauce Demo prints its test accounts on the login page, so they are in `src/config/credentials_common.ts` and are not secret.

- A valid login opens the shop, survives a reload, and ends with a logout.
- Each of these is refused, stays on the login page, and shows the right message: a wrong password, an unknown username, a locked out user, an empty username, an empty password.
- The shop address cannot be opened without logging in.

```powershell
npx playwright test login
```

The refused cases are one table in the test file. Add a row to add a case.

`tests/login-aliexpress.spec.ts` has the same cases on AliExpress, to show the attempt and the blocker. The empty field test runs by itself. The other two (wrong password, valid login) need a test account in `.env` (`ALI_USERNAME`, `ALI_PASSWORD`) and a person to drag the slider, so they are skipped without the account:

```
ALI_USERNAME=your test account email
ALI_PASSWORD=your test account password
```

`.env` is not in git, and the password is never printed in the log. To run them, leave `HEADLESS` empty, then:

```powershell
npx playwright test login-aliexpress
```

When the slider appears the run prints a message and waits up to 2 minutes. The sign in dialog also has two versions, picked at random by the site. The page object handles both.

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

## Architecture

The tests are built in layers. Each layer only talks to the one below it:

1. **Spec** (`tests/*.spec.ts`) says what to check. It has no selectors and no waits.
2. **Fixture** (`tests/fixtures_common.ts`) builds the flow and opens the site before the test body runs. It is the Playwright way of a "before" step.
3. **Flow** (`AliShop`, `SauceDemo`) holds the user actions, such as "search under a price" or "log in". It uses `test.step`, so each action is one line in the report.
4. **Page object** (`src/pages/*_pom.ts`) owns the locators of one page and the small actions on it. Every selector sits in one named constant at the top of its file, so a site change is fixed in one place.
5. **Config and utils** (`src/config`, `src/utils`) hold the addresses, timeouts, scenarios (the data), price parsing, and the log.

Test data is separate from test code. The four cart scenarios are one table in `scenario_common.ts`, and the refused logins are one table in `login.spec.ts`. A new case is a new row.

## Why every test gets a new page

Playwright opens a new browser context for every test, and the fixture opens the site in it. A new context starts with no cookies, no storage, no cart, and no history. This is on purpose:

- **The cart total is exact.** The cart check adds up the lines, so an item left from an earlier test would break the sum.
- **Tests do not depend on each other.** Any test can run alone, in any order, and a failed test leaves nothing behind for the next one.
- **Login state does not leak.** A test that signs in cannot make another test pass or fail by accident.

The price is time: every test loads the site again. The tests run one at a time (`workers: 1`), so the site sees one visitor and the run is easy to watch.

## How the code is organized

```
src/pages/*_pom.ts                     page objects and their locators
src/flows/aliexpress_shop_common.ts    the shop actions
src/config/site_common.ts              site addresses
src/config/browser_common.ts           window size and locale
src/utils/scenario_common.ts           search, max price, item limit
src/utils/price_common.ts              price parsing
src/utils/logger_common.ts             console log
src/config/credentials_common.ts       AliExpress account (from .env) and the Sauce Demo accounts
tests/cart-budget.spec.ts              the cart tests
tests/login.spec.ts                    the login tests (Sauce Demo)
tests/login-aliexpress.spec.ts         the login tests on AliExpress (captcha needs a person)
src/flows/sauce_demo_common.ts         the Sauce Demo sign in actions
tests/fixtures_common.ts               builds the shop (shop or sauce) before the test
```

`AliShop` methods:

- `open()` — open AliExpress. The fixture calls this before the test.
- `searchItemsByNameUnderPrice(query, maxPrice, limit = 5)`
- `addItemsToCart(urls)`
- `assertCartTotalNotExceeds(budgetPerItem, itemsCount)`

Search reads `a.search-card-item`. The sale price is the first ILS amount on the card. If the current page does not have enough items under the price, the test clicks Next until it reaches the limit or the pages run out. A product id opens that item directly, so the result is that one URL. A max price of 0 returns an empty list.

The Next test opens the results address directly. Opening the homepage first hides the Next control.

## Assumptions and limits

Limits:

- **Captcha on the AliExpress login.** After the password, AliExpress shows a slider in automated runs. The tests do not get around it, so the AliExpress login tests need a person (see Login tests). The login method is tested in full on Sauce Demo.
- **Currency.** The price is read from the ILS amount on the page. A visitor from another country can be sent to another site or currency. Then the price check fails, or finds no items. The tests expect to run from Israel, or from a place that is sent to `he.aliexpress.com`.
- **A real shop, not a test system.** Prices, stock, and ranking change. A test can pass today and find fewer items tomorrow. That is why one scenario accepts "fewer than 5" and one accepts "none".
- **Slow runs.** One test can take 1 to 3 minutes. Timeouts are set long for that reason.
- **Bot protection.** In a hidden browser (`HEADLESS=1`) AliExpress sometimes sends item pages to a "punish" page, and the add to cart step fails. Run with the window visible.
- **Random popups and dialogs.** Sale popups, a notification banner, and two versions of the sign in dialog appear at random. The login flow closes the popups and handles both dialogs. The cart tests do not need that.
- **Locators.** AliExpress class names end in a changing code, so some selectors match only the start (`[class*="..."]`). A site update can still break them.

Assumptions:

- The site redirects to `he.aliexpress.com`. Prices are in ILS, so `maxPrice` is compared to that number.
- Each run starts in a fresh browser window, so the cart and history start empty. The test stays a guest.
- Quantity stays 1. If the item asks for a size or color, the first available option is chosen.
- The sale price is the first amount on the line. The crossed-out original price and the "you save" amount are not the price paid.
- The cart check sums the line prices (`.cart-product-price-buynow`). The summary stays 0 until a checkbox is ticked, so it is not the total.
- The cart total must be `<= maxPrice * item count`.
- The Next test does not add those items to the cart.

The bug-review writeup is in `ReadMeAIBugs.md`.
