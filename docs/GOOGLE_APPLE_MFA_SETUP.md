# כניסה עם Google / Apple ואימות דו־שלבי — הגדרה

**מצב:** הקוד באפליקציה נכתב ונבדק מול שרת מדומה בלבד. שום דבר מכאן לא נבדק מול Google, Apple או Supabase אמיתיים. את הסודות (Client Secret וכו׳) מזינים **רק בלוח הבקרה של Supabase**, לא בקוד, לא ב-`config.js` ולא בצ׳אט.

הכפתורים "המשך עם Google" / "המשך עם Apple" מופיעים במסך הכניסה **רק אחרי** שהספק הופעל ב-Supabase. עד אז הם מוסתרים.

## Google
1. console.cloud.google.com ← פרויקט חדש ← APIs & Services ← OAuth consent screen (External) ← למלא שם אפליקציה ואימייל.
2. Credentials ← Create Credentials ← OAuth client ID ← Web application.
   - Authorized JavaScript origins: `https://easyrecordv5.netlify.app`
   - Authorized redirect URIs: `https://bpxghjerbyqxtbszbpqj.supabase.co/auth/v1/callback`
3. להעתיק Client ID ו-Client Secret.
4. Supabase ← Authentication ← Sign In / Providers ← Google ← Enable ← להדביק את שניהם ← Save.

## Apple
דורש חשבון Apple Developer בתשלום (99$ לשנה).
1. developer.apple.com ← Certificates, Identifiers & Profiles ← Identifiers: ליצור App ID, ואז Services ID עם "Sign in with Apple".
   - Domains: `bpxghjerbyqxtbszbpqj.supabase.co`
   - Return URLs: `https://bpxghjerbyqxtbszbpqj.supabase.co/auth/v1/callback`
2. Keys ← ליצור מפתח עם Sign in with Apple ולהוריד את קובץ ה-`.p8`.
3. Supabase ← Authentication ← Providers ← Apple ← Enable ← Services ID, Team ID, Key ID והמפתח ← Save. (הסוד של Apple פג כל 6 חודשים ויש לחדש אותו.)

## כתובות חזרה
Supabase ← Authentication ← URL Configuration: `https://easyrecordv5.netlify.app` ב-Site URL וב-Redirect URLs.

## אימות דו־שלבי (אפליקציית אימות)
1. Supabase ← Authentication ← Multi-Factor: לוודא ש-TOTP מופעל (ברירת מחדל).
2. להריץ ב-SQL Editor את `cloud/supabase/migrations/003_mfa_enforce.sql`. בלי זה הקוד נדרש רק במסך הכניסה של האפליקציה, ומי שיודע את הסיסמה יכול לעקוף אותו דרך ה-API. עם הקובץ, השרת עצמו חוסם גישה לנתונים ולקבלות בלי הקוד.
3. באפליקציה: הגדרות ← החשבון שלי ← אימות דו־שלבי ← לסרוק את ה-QR באפליקציית אימות ← להזין קוד.

**חשוב:** אין קודי גיבוי. מי שמאבד את הטלפון בלי גיבוי של אפליקציית האימות לא יוכל להיכנס; שחזור אפשרי רק על ידי מחיקת הגורם בלוח הבקרה של Supabase (Authentication ← Users). לשמור את המפתח הידני במקום בטוח.

## מגבלות ידועות
- כניסת Google/Apple מתוך אפליקציה שהותקנה למסך הבית באייפון עלולה להיפתח בדפדפן ולא לחזור לאפליקציה המותקנת. לא נבדק.
- SMS כגורם שני לא נתמך (רק אפליקציית אימות).
