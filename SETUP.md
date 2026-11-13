# SETUP

## הרצה מקומית
1. פתחו `dist/index.html` בדפדפן, או הגישו את התיקייה מעל http (נדרש ל-PWA): `npx serve dist`.
2. בנייה מחדש: `node build.js` (Node 18+). אייקונים: `ICONS=1 node build.js` (Python + Pillow).
3. בדיקות: `npm i` ואז `node tests/run-tests.js dist/index.html` ו-`node tests/pwa-tests.js deploy`.

## פריסה ל-Netlify
ב-Netlify פתחו את האתר ← Deploys וגררו לשם את `Easy-Record-V5-Netlify.zip` **כמו שהוא, בלי לחלץ**. (אם מחלצים: לגרור את התיקייה שמכילה ישירות את `index.html`, אחרת מתקבל "Page not found".) אין משתני סביבה ואין סודות. HTTPS נדרש ל-Service Worker.

## התקנה בטלפון
iPhone: Safari ← שיתוף ← "הוסף למסך הבית". Android: Chrome ← "התקן אפליקציה".

## ענן וחשבונות
האפליקציה עובדת מקומית בלי חשבון. הסנכרון הנוכחי רץ על יכולת `db` של Claude Artifact (תלוי בסביבת Claude). כניסה/הרשמה עובדות רק אחרי מילוי `config.js` (כתובת פרויקט Supabase + מפתח **ציבורי** anon). אחרי כניסה הנתונים מסתנכרנים ל-Supabase (נבדק מול mock בלבד; יש לבצע בדיקה ראשונה בין שני מכשירים אמיתיים). כדי להמשיך נדרשת החלטה שלכם: Supabase או Firebase, ויצירת פרויקט על ידכם. נדרשים רק כתובת הפרויקט ומפתח ציבורי (anon) — לעולם לא מפתח סודי ולא בצ'אט.

## אפליקציות iOS / Android
ראו `native/STORE-PUBLISHING.md`. בקצרה: `node build.js` ← `cd native && npm install` ← `npx cap add android` / `npx cap add ios` ← `npm run assets` ← `npm run sync` ← בנייה וחתימה ב-Android Studio / Xcode.
