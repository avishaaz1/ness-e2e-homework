# AliExpress cart budget

Playwright + TypeScript test for AliExpress.

The test opens AliExpress, searches for a product, keeps items under a max price, adds them to the cart, and checks that the item total stays within the budget.

## Quick start

Already have Node.js 20 or newer, Git and Google Chrome? Open PowerShell and run:

```powershell
git clone https://github.com/avishaaz1/ness-e2e-homework.git
cd ness-e2e-homework
npm install
npm test
```

That is all. `npm test` opens Chrome and runs the tests one by one. When it ends, the report of this run opens in your browser. A full run takes about 10 minutes.

New to this? The next section installs the tools step by step. Something went wrong? Go to [Troubleshooting](#troubleshooting).

## Install the tools (first time only)

<details>
<summary>Step by step: Node.js, Git, Chrome and the project</summary>

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

</details>

## Run the tests

```powershell
npm test
```

Chrome opens and you can watch the run. Each test starts in a fresh window, so the cart and history are empty. The cart tests stay a guest, so no login is needed. One test can take 1 to 3 minutes, so a full run is about 10 minutes.

The tests are in three folders. If you changed one area, run only that area. Every command builds its own report.

| Command | What it runs | Needs the internet |
| --- | --- | --- |
| `npm test` | all the tests | yes |
| `npm run test:cart` | search under a price, add to cart, cart total, paging (AliExpress) | yes |
| `npm run test:login` | login on Sauce Demo, and the AliExpress login tests | yes |
| `npm run test:data` | the JSON data files and their checks (takes a few seconds) | no |

`test:data` is the quickest way to check that the install worked.

To run one test file, or one test by its title, call Playwright directly: `npx playwright test tests/login/login.spec.ts`, or `npx playwright test -g "locked out"`. That does not build a report.

To hide the browser window, in PowerShell:

```powershell
$env:HEADLESS = "1"
npm test
```

AliExpress is more likely to block a hidden browser, so run with the window visible when you can.

The four cart scenarios are rows in `data/cart_scenarios.json` (query, max price, limit):

- `fiveItems` — 5 shoes under 50, then the cart check
- `fewerThanFive` — one product id, so the search opens that single item
- `noneFound` — max price 0, so the result list is empty
- `nextPage` — shoes under 50, more than one page holds, so the run clicks Next

## The report

**Every run builds a new report.** It is named with the date and time the run started, for example:

```
reports/allureReport-2026-11-01_23-03-23/index.html
```

Earlier reports stay in the `reports` folder, so you can compare runs. Delete old folders when you do not need them. The `reports` folder is created on your machine and is not in git.

Each report is one HTML file with everything inside, a few MB. It needs no server.

**How to open it:**

- `npm test` opens it for you when the run ends. The terminal also prints its path.
- To open the report of the latest run again: `npm run report:open`.
- Or double click `index.html` in File Explorer. It must open in a browser. If you open it in the editor, you see HTML text instead of the report.

**What the report shows:**

- The overview: how many tests passed, failed, or were skipped.
- The list of tests. Open one to see its steps, such as "search", "item 1: <link>" and "check cart total", with the time of each step.
- For every item that is added to the cart: a screenshot of the item page, attached to the step of that item, and a line with what the random choice picked (size or color), or that the item asked for no choice. The cart check has a screenshot of the cart.
- For a failed test: the error, and a screenshot of the page at the failure.
- For a skipped test: the reason.

The same screenshots are also saved as files in `artifacts/screenshots` (`item-1.png`, `item-2.png`, ..., `cart.png`). The next run overwrites them, but the report keeps its own copy. This folder is not in git.

**Example report.** `sample-report/` holds the report of one complete run, so you can see what a report looks like without running anything. Open `sample-report/allureReport-2026-11-01_23-03-23/index.html` in a browser. In that run 19 tests passed, none failed, and 3 were skipped. Open the cart test to see the steps "item 1" to "item 5", each with its screenshot, and the cart screenshot. All 3 skips are on AliExpress login, where the captcha needs a person (see [Login tests](#login-tests)): two need a test account that was turned off with `ALI_LOGIN=off`, and one could not open the sign in form because the robot check covered the page.

To replace the example with a new run, in PowerShell:

```powershell
$env:ALI_LOGIN = "off"
npm test
npm run report:sample
```

`report:sample` copies the report of the latest run into `sample-report/`, and removes the old example.

Two switches for `npm test`, in PowerShell: `$env:REPORT_OPEN = "0"` builds the report without opening it, and `$env:TRACE = "on"` keeps the Playwright traces of failed tests, which makes the report much bigger.

## Troubleshooting

**`node`, `npm` or `git` is "not recognized".**
The program is not installed, or the PowerShell window is older than the install. Close PowerShell, open a new one, and try again. If it is still missing, install it with the steps in [Install the tools](#install-the-tools-first-time-only).

**`npm` says "running scripts is disabled on this system".**
PowerShell blocks `npm`. Run this once, then open a new PowerShell:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**Chrome does not open, or Playwright says it cannot find Chrome.**
The test uses the normal Google Chrome app. Install Chrome (see [Install the tools](#install-the-tools-first-time-only)). If Chrome is installed and the error stays, run `npx playwright install chrome`.

**`npm install` fails or hangs.**
Check the internet connection, and that `node -v` shows 20 or higher. Then delete the `node_modules` folder and run `npm install` again.

**A slider or "We need to check if you are a robot" appears.**
That is the AliExpress bot protection. Drag the slider yourself in the Chrome window. The run waits up to 2 minutes. If it keeps coming back, wait a while, or run from another network, and run with the window visible (no `HEADLESS`). The tests do not try to get around it.

**A cart test fails with "found fewer than 5", or finds no items.**
AliExpress is a real shop, so prices and stock change. Run the test again. Check that you run from Israel, or from a place sent to `he.aliexpress.com`, because the price is read in ILS (see [Assumptions and limits](#assumptions-and-limits)).

**The test seems stuck.**
It is probably waiting. One test can take 1 to 3 minutes, and a slider waits for you for up to 2 minutes. Look at the Chrome window.

**The report did not open, or it is not the report I expected.**
Run `npm run report:open`, or open `reports/allureReport-<date>_<time>/index.html` in a browser. A run that you stop with `Ctrl+C` builds no report. Run it again and let it finish.

**The report is only text.**
You opened `index.html` in the editor. Open the file in Chrome instead (double click it in File Explorer).

**The AliExpress login tests are "skipped".**
This is expected. They need a test account and a person for the captcha (see [Login tests](#login-tests)). The login method is tested in full on Sauce Demo.

Still stuck? Run `npm run test:data`. If it passes, the install is fine and the problem is the site or the network. If it fails, the install is not complete, so check the steps above.

## Login tests

`tests/login/login.spec.ts` checks the sign in flow on [Sauce Demo](https://www.saucedemo.com/), a practice shop made for automation. AliExpress shows a slider captcha after the password in automated runs, so it cannot be tested without a person. The tests do not try to get around it. Sauce Demo prints its test accounts on the login page, so they are in `data/login_cases.json` and are not secret.

- A valid login opens the shop, survives a reload, and ends with a logout.
- Each of these is refused, stays on the login page, and shows the right message: a wrong password, an unknown username, a locked out user, an empty username, an empty password.
- The shop address cannot be opened without logging in.

```powershell
npm run test:login
```

The refused cases are one table in the test file. Add a row to add a case.

`tests/login/login-aliexpress.spec.ts` has the same cases on AliExpress, to show the attempt and the blocker. The empty field test needs no account. If AliExpress puts its robot check over the home page, that test cannot open the sign in form, so it is skipped with that reason. The other two (wrong password, valid login) need a test account in `.env` (`ALI_USERNAME`, `ALI_PASSWORD`) and a person to drag the slider, so they are skipped without the account. Set `ALI_LOGIN=off` to skip them even when the account is in `.env`:

```
ALI_USERNAME=your test account email
ALI_PASSWORD=your test account password
```

`.env` is not in git, and the password is never printed in the log. To run them, leave `HEADLESS` empty, then:

```powershell
npx playwright test tests/login/login-aliexpress.spec.ts
```

When the slider appears the run prints a message and waits up to 2 minutes. The sign in dialog also has two versions, picked at random by the site. The page object handles both.

## Test data

The inputs are JSON files in the `data` folder, not code. JSON can hold numbers, empty values and a short description for each row. A CSV cannot hold an empty username as clearly.

- `data/cart_scenarios.json` — the cart scenarios: `id`, `description`, `query`, `maxPrice`, `limit`. A new scenario is a new row. The test file asks for a row by its `id`.
- `data/login_cases.json` — the Sauce Demo account that logs in, and the refused cases. Each refused case is a row with the username, password, and the text the page must show. A new refused case is a new row, and `tests/login/login.spec.ts` makes a test from it.

A broken file stops the run at the start with the file name and the row in the message. For example, a negative max price or a missing query. `tests/data/data-files.spec.ts` checks this. It needs no browser and no internet, so it runs in a second.

To run another set of scenarios, put a file with the same ids in `data` and name it in `SCENARIOS_FILE` (in the environment or in `.env`). `.env.example` shows the line.

## Debug in the editor

In Cursor or VS Code, open **Run and Debug**, choose **Debug Playwright test**, and start it. Put a breakpoint in the test or in a page method, then use step over (`F10`) and step into (`F11`).

That launch config expects Node at `C:\Program Files\nodejs\node.exe`. If Node is installed somewhere else, change `runtimeExecutable` in `.vscode/launch.json`.

## Architecture

The tests are built in layers. Each layer only talks to the one below it:

1. **Spec** (`tests/cart`, `tests/login`, `tests/data`) says what to check. It has no selectors and no waits.
2. **Fixture** (`tests/fixtures_common.ts`) builds the flow and opens the site before the test body runs. It is the Playwright way of a "before" step.
3. **Flow** (`AliShop`, `SauceDemo`) holds the user actions, such as "search under a price" or "log in". It uses `test.step`, so each action is one line in the report.
4. **Page object** (`src/pages/*_pom.ts`) owns the locators of one page and the small actions on it. Every selector sits in one named constant at the top of its file, so a site change is fixed in one place.
5. **Config and utils** (`src/config`, `src/utils`) hold the addresses, timeouts, scenarios (the data), price parsing, and the log.

Test data is separate from test code. The cart scenarios and the login cases are JSON files in `data` (see Test data). A new case is a new row.

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
data/cart_scenarios.json               the cart scenarios (query, max price, limit)
data/login_cases.json                  the Sauce Demo accounts and refused login cases
src/utils/data_common.ts               reads and checks the JSON files
src/utils/scenario_common.ts           turns the scenario rows into typed scenarios
src/utils/login_cases_common.ts        turns the login rows into typed cases
src/utils/random_common.ts             random pick for item options
src/utils/price_common.ts              price parsing
src/utils/logger_common.ts             console log
src/config/credentials_common.ts       AliExpress account, read from .env
tests/cart/cart-budget.spec.ts         the cart tests
tests/login/login.spec.ts              the login tests (Sauce Demo)
tests/login/login-aliexpress.spec.ts   the login tests on AliExpress (captcha needs a person)
tests/data/data-files.spec.ts          checks the data files (no site needed)
src/flows/sauce_demo_common.ts         the Sauce Demo sign in actions
tests/fixtures_common.ts               builds the shop (shop or sauce) before the test
```

`AliShop` methods:

- `open()` — open AliExpress. The fixture calls this before the test.
- `searchItemsByNameUnderPrice(query, maxPrice, limit = 5)`
- `addItemsToCart(urls)`
- `assertCartTotalNotExceeds(budgetPerItem, itemsCount)`

Search finds the result cards with XPath (an `a` whose class has the word `search-card-item`) and reads the price from the same card. The sale price is the first ILS amount on the card. If the current page does not have enough items under the price, the test clicks Next until it reaches the limit or the pages run out. A product id opens that item directly, so the result is that one URL. A max price of 0 returns an empty list.

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

- The task names eBay as the example shop. This project tests AliExpress instead. The four functions and the scenarios are the same, and only the page objects and locators belong to the site.
- The site redirects to `he.aliexpress.com`. Prices are in ILS, so `maxPrice` is compared to that number.
- Each run starts in a fresh browser window, so the cart and history start empty. The test stays a guest.
- Each item opens in its own tab, and the tab closes after the item is added, so the run is back on the search tab. All tabs of a test share one cart.
- Quantity stays 1. The cart check multiplies the budget by the number of items, so a bigger quantity would break it.
- If the item asks for a size or color, one random option is picked in each group, and a sold out option is never picked. This runs inside the full cart test, in `addItemsToCart`. The log and the report (one `item N options` line per item) show what was picked, or that the item asked for no choice. Many items ask for none, so a run may not pick anything. The 5 shoes in the last full run asked for no choice, so the random pick has not run on the real site yet.
- The sale price is the first amount on the line. The crossed-out original price and the "you save" amount are not the price paid.
- The cart check sums the line prices (`.cart-product-price-buynow`). The summary stays 0 until a checkbox is ticked, so it is not the total.
- The cart total must be `<= maxPrice * item count`.
- The Next test does not add those items to the cart.

The bug-review writeup is in `ReadMeAIBugs.md`.
