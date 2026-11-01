# ReadMeAIBugs

Code review of the sample test from the task: 

1. Line 2 - `from selenium import webdriver`

This import is unused. Remove it.
_____________________________________________________

2. Line 6 - `browser = sync_playwright().start().chromium.launch()`

Playwright is started but never stopped, and `browser.close()` (line 21) runs only if every step before it passes. 
If `fill` or `click` fails, the browser and the Playwright process stay open.

Make sure Playwright is always closed, even if the test fails.
_____________________________________________________

3. Lines 10 and 17 - `time.sleep(2)` and `time.sleep(3)`

A sleep waits for time, not for a condition. 

Wait for the thing we need instead:
- `fill` and `click` already wait for the element by themselves, so the first sleep is not needed.
- After the click, use `expect(...).to_be_visible()`. It retries until the results show up, or fails.
- If you need to wait for a page change or a request, use `wait_for_url` or another wait for element.

Also delete the `import time`.
_____________________________________________________

4. Line 12 - `search_box = page.locator("#search")`

`#search` is a generic id, it can change and it says nothing about the element.

Find it by role: `page.get_by_role("textbox", name="Search")`.
_____________________________________________________

5. Line 15 - `page.locator(".button").click()`

`.button` is too general. With more than one match Playwright fails, and with one match it may be the wrong button (for example cookies).

Click by role and name, for example: `page.get_by_role("button", name="Search").click()`.
_____________________________________________________

6. Line 19 - `results = page.locator(".result-item")`

Nothing is checked in this test. `page.locator` doesn't return results, and `results` is never asserted. The test has no purpose: it passes even if the search returns nothing.

Add assertions for what we expect to see: that the results are displayed, and that they match the search term.
_____________________________________________________

7. Line 21 - `browser.close()`

Same as line 6. It is not reached when the test fails above it.

_____________________________________________________
