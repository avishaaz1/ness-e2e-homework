# ReadMeAIBugs

עברתי על הקוד סטטית, בלי להריץ אותו. הוא לא בודק חיפוש, גם אם הדפדפן נפתח.

הקוד המקורי:

```python
from playwright.sync_api import sync_playwright
from selenium import webdriver
import time

def test_search_functionality():
    browser = sync_playwright().start().chromium.launch()
    page = browser.new_page()
    page.goto("https://example.com")

    time.sleep(2)

    search_box = page.locator("#search")
    search_box.fill("playwright testing")

    page.locator(".button").click()

    time.sleep(3)

    results = page.locator(".result-item")

    browser.close()
```

## 1. שתי ספריות מעורבבות, ואחת מהן לא בשימוש

`from selenium import webdriver` לא קשור ל-Playwright. `webdriver` לא מופיע שוב בקובץ. נראה שהקוד הודבק משני מדריכים, אחד של Selenium ואחד של Playwright.

אם מישהו מנסה להתקין ולהריץ, הוא עלול להתקין `selenium` בלי צורך, או לחשוב שצריך driver של Chrome בשביל Selenium. השורה לא שוברת את הריצה לבד, אבל היא סימן שהקוד לא עקבי, והיא מיותרת.

תיקון: למחוק את שורת ה-Selenium.

```python
from playwright.sync_api import sync_playwright, expect
```

## 2. אין שום assertion, אז הטסט "עובר" גם כשכלום לא קרה

```python
results = page.locator(".result-item")
```

`locator` רק בונה מצביע לאלמנט. הוא לא מחפש אותו בדף ולא בודק שיש תוצאות. אין `expect`, אין בדיקה שהטקסט "playwright testing" מופיע, ואין בדיקה ש-`count()` גדול מ-0.

אם אין `#search`, ה-`fill` כן זורק והטסט נופל. אבל אם `.button` לוחץ על כפתור אחר והעמוד לא מציג תוצאות, השורה `results = ...` לא זורקת כלום. pytest יסמן הצלחה בלי שהחיפוש נבדק.

תיקון:

```python
results = page.locator(".result-item")
expect(results.first).to_be_visible()
expect(page.locator("body")).to_contain_text("playwright testing")
```

## 3. `time.sleep` ולוקייטורים כלליים מדי

```python
time.sleep(2)
search_box = page.locator("#search")
...
page.locator(".button").click()
time.sleep(3)
results = page.locator(".result-item")
```

`sleep` מחכה זמן קבוע. אם העמוד איטי יותר מ-2 שניות, `fill` רץ לפני שהשדה קיים ונופל. אם העמוד מהיר, מחכים סתם. זה גם לא אומר שהתוצאות באמת נטענו.

`.button` תופס את הכפתור הראשון עם ה-class הזה. ב-Playwright, אם יש יותר מכפתור אחד, `click()` נכשל ב-strict mode. אם יש רק אחד, זה יכול להיות כפתור של cookies ולא כפתור החיפוש. `#search` ו-`.result-item` הם שמות גנריים שהאתר יכול לשנות, והם לא קשורים לתפקיד של האלמנט.

בנוסף `https://example.com` הוא דף בלי תיבת חיפוש ובלי `#search`. גם עם המתנה נכונה אין שם מה למלא.

תיקון: לחכות לאלמנט, וללחוץ לפי השם שלו.

```python
page.goto("https://the-real-site.example")
search_box = page.get_by_role("textbox", name="Search")
expect(search_box).to_be_visible()
search_box.fill("playwright testing")
page.get_by_role("button", name="Search").click()
expect(page.locator("[data-testid='result-item']").first).to_be_visible()
```

## 4. הדפדפן לא נסגר אם משהו נופל באמצע, ו-Playwright עצמו לא נעצר

```python
browser = sync_playwright().start().chromium.launch()
...
browser.close()
```

`sync_playwright().start()` מחזיר אובייקט, והקוד לא שומר אותו ולא קורא ל-`stop()`. `browser.close()` נמצא רק בסוף המסלול המוצלח. אם `fill` או `click` זורקים, הדפדפן נשאר פתוח והתהליך של Playwright נשאר ברקע.

תיקון: `with`, ו-`try/finally` לא חובה כשה-`with` עוטף את הכל.

```python
def test_search_functionality():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page()
        try:
            page.goto("https://the-real-site.example")
            search_box = page.get_by_role("textbox", name="Search")
            expect(search_box).to_be_visible()
            search_box.fill("playwright testing")
            page.get_by_role("button", name="Search").click()
            expect(page.locator("[data-testid='result-item']").first).to_be_visible()
        finally:
            browser.close()
```

ה-`with` קורא ל-`stop()` גם כשיש exception.

## מה הייתי משאיר

`browser.new_page()` כן קיים ב-Playwright (הוא פותח context חדש מאחורי הקלעים), אז זו לא הבעיה. הבעיות הן הערבוב עם Selenium, חוסר הבדיקה, ההמתנה העיוורת, הלוקייטור `.button`, האתר הלא נכון, וחוסר הסגירה כשיש שגיאה.
