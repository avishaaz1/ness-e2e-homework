# eBay cart budget

תרחיש e2e על ebay.com: חיפוש, סינון לפי מחיר, הוספה לסל, ובדיקה שהסכום של הפריטים לא עובר את התקציב.

נכתב ב-Playwright + TypeScript, עם Page Object Model וקלט מקובץ JSON.

## מה צריך לפני

- Node.js 20 ומעלה
- Google Chrome מותקן. הטסט פותח חלון Chrome רגיל ומתחבר אליו. אם Playwright מפעיל את Chrome בעצמו, eBay מחזיר עמוד שגיאה.
- גישה לאתר ebay.com
- אופציונלי: Java ו-Allure Commandline, רק אם רוצים את דוח Allure. בלי זה יש דוח HTML ו-JUnit

## התקנה

```bash
git clone <the-repo-url>
cd ebay-e2e-homework
npm install
```

אפשר להעתיק את `.env.example` ל-`.env` ולערוך. זה לא חובה.

```bash
copy .env.example .env
```

## הרצה

הפרופיל הרגיל הוא `demo`: חיפוש `socks`, מחיר עד 15, שני פריטים. Chrome נפתח ואפשר לראות את הריצה.

```bash
npm test
```

פרופיל `shoes` הוא הדוגמה מהתרגיל (shoes, 220, 5 פריטים). הוא ארוך יותר.

PowerShell:

```powershell
$env:PROFILE = "shoes"
npm test
```

CMD:

```bat
set PROFILE=shoes
npm test
```

בלי חלון דפדפן:

```powershell
$env:HEADLESS = "1"
npm test
```

התחברות ל-eBay היא אופציונלית. בלי משתמש וסיסמה הטסט ממשיך כאורח, והסל נשמר לsession של הדפדפן.

```powershell
$env:EBAY_USERNAME = "your-email"
$env:EBAY_PASSWORD = "your-password"
npm test
```

אם eBay מוציא captcha בהתחברות, עדיף להשאיר את השדות ריקים ולרוץ כאורח.

## דוחות וצילומים

אחרי ריצה:

```bash
npm run report:html
```

הקבצים:

- `reports/html` - דוח HTML של Playwright
- `reports/junit/results.xml` - JUnit
- `reports/allure-results` - קלט ל-Allure
- `artifacts/screenshots` - צילום לכל פריט שנוסף, וצילום של הסל

דוח Allure (רק אם Allure מותקן):

```bash
npm run report:allure
```

## ארכיטקטורה

```
data/scenarios.json          קלט הבדיקה (פרופילים)
src/pages                    Page Objects
src/flows/EbayShop.ts        ארבע הפעולות של התרגיל
src/utils/price.ts           פרסור מחיר
tests/cart-budget.spec.ts    התרחיש
```

הפעולות על `EbayShop`:

- `signIn()` - הזדהות, או המשך כאורח
- `searchItemsByNameUnderPrice(query, maxPrice, limit = 5)`
- `addItemsToCart(urls)`
- `assertCartTotalNotExceeds(budgetPerItem, itemsCount)`

החיפוש שולף את הכרטיסים ב-xpath (`li.s-card` עם קישור `/itm/`). לא משתמשים ב-class אקראי ש-eBay מחליף בין טעינות. מחיר, כפתור החיפוש והעמוד הבא נתפסים לפי id, aria-label או title שנשארים קבועים (`#gh-ac`, `#gh-search-btn`, `#atcBtn_btn_1`, `a[aria-label="Go to next search page"]`).

אם בעמוד הנוכחי אין מספיק פריטים מתחת למחיר, עוברים לעמוד הבא עד ה-limit או עד שנגמרים העמודים. אם אין Next, מחזירים את מה שנמצא.

## הנחות ומגבלות

- המטבע הוא מה שהאתר מציג. אצלי, בגלל ship-to בישראל, המחירים ב-ILS. המספר ב-`maxPrice` מושווה למספר הזה, לא לדולר.
- בלי `EBAY_USERNAME` ו-`EBAY_PASSWORD` רצים כאורח. הוספה לסל עובדת בלי התחברות.
- כמות נשארת 1. מידה וצבע נבחרים אקראית ממה שזמין. כמות אקראית הייתה שוברת את בדיקת התקציב גם כשמחיר היחידה תקין.
- בטווח מחיר (`ILS 12.42 to ILS 31.10`) לוקחים את המספר הגבוה, כדי שגם וריאנט יקר יישאר מתחת ל-`maxPrice`.
- בדיקת הסל קוראת את `[data-test-id="ITEM_TOTAL"]` (שורת Item). ה-Subtotal באתר כולל משלוח, והסינון בחיפוש לא כולל משלוח. ה-Subtotal נכתב ללוג.
- פריט בלי כפתור Add to cart (רק Buy It Now, או מכרז) מדולג ומצולם, ולא נלחץ Buy It Now.
- כרטיס הדמה "Shop on eBay" (`/itm/123456`) לא נאסף.
- בדוגמה במסמך התרגיל כתוב שהסכום צריך להיות `>= 220 * מספר הפריטים`. שם הפונקציה והסעיף שמעליו אומרים שהסכום לא עולה על הסף, אז הבדיקה היא `<=`.

## תרגיל הבאגים

הקוד עם הבעיות והתיקון נמצאים ב-`ReadMeAIBugs.md`.
