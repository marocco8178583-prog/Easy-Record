# סנכרון עצמאי עם Supabase — מצב: מוכן להתקנה, **לא מחובר ולא נבדק**

האפליקציה לא משתמשת בשום שירות Supabase כרגע. הסנכרון הפעיל הוא על יכולת `db` של Claude Artifact (נבדק מול mock). מה שנמצא כאן הוא תשתית שמוכנה לחיבור:

| רכיב | מצב |
|---|---|
| `cloud/supabase/schema.sql` — טבלאות, RLS לפי `auth.uid()`, בדיקת גרסה (optimistic concurrency), מחיקת חשבון, מחיקות רכות (tombstone), קבלות ב-Storage פרטי | הורץ ונבדק על PostgreSQL 16 מקומי עם דימוי של סכמת auth (RLS, בקרת גרסאות, מחיקת חשבון, הרצה חוזרת). **לא הורץ על פרויקט Supabase אמיתי** |
| קוד אימות בצד האפליקציה (`src/js/32-auth.js`): הרשמה, כניסה, יציאה, שכחתי סיסמה, איפוס, מחיקת חשבון | נכתב ונבדק **מול mock בלבד**, לא מול Supabase אמיתי |
| סנכרון הנתונים (`src/js/34-sbdb.js`): מתאם PostgREST למנוע הסנכרון הקיים, סקר כל 15 שניות | נכתב ונבדק **מול mock בלבד** |

## מה אתם צריכים לעשות
1. ליצור פרויקט חינמי ב-supabase.com.
2. ב-SQL Editor להריץ את `cloud/supabase/schema.sql`.
3. לוודא ש-Authentication ← Sign In / Providers ← Email מופעל.
4. לערוך את `config.js` (בתיקיית הפריסה) ולמלא `supabaseUrl` ו-`supabaseAnonKey`, ולהעלות מחדש. או לשלוח לי רק: **Project URL** ו-**anon (public) key**. אלה מפתחות ציבוריים שמיועדים לקוד לקוח. לעולם לא `service_role`, לא סיסמה ולא טוקן.

## אחרי שיש פרויקט
נריץ יחד בדיקה אמיתית בין שני מכשירים מול הפרויקט שלכם ונתקן הבדלים מה-mock. רק אז אפשר לומר שזה עובד. האפליקציה תמשיך לעבוד מקומית גם בלי חשבון.

## הערות אבטחה
- כל הגישה מוגבלת ל-`user_id = auth.uid()` ב-RLS; מפתח anon לבדו לא נותן גישה לנתוני אחרים.
- אין מחיקה קשיחה מהלקוח, רק `deleted=true`.
- יש להפעיל אימות אימייל ומדיניות סיסמאות בהגדרות Auth.

## הגדרות Auth שצריך לבדוק בפרויקט
- Authentication ← URL Configuration: להוסיף את כתובת האתר ב-Netlify ל-Site URL ול-Redirect URLs (אחרת קישור איפוס הסיסמה לא יחזור לאפליקציה).
- אימות אימייל: אם מופעל, אחרי הרשמה צריך ללחוץ על הקישור שנשלח.
- כניסה בטלפון דורשת ספק SMS (למשל Twilio) והפעלת Phone provider.

## שלב 2: קבלות בענן
להריץ ב-SQL Editor את `cloud/supabase/migrations/002_receipts_storage.sql`. הוא יוצר bucket פרטי בשם `receipts` (עד 10MB, תמונות ו-PDF), מדיניות גישה לפי תיקיית המשתמש, ומוסיף את סוג הרשומה `receipt`. אפשר לבדוק ב-Storage שה-bucket נוצר ומסומן Private. נבדק על Postgres מקומי עם דימוי של סכמת storage, לא על Supabase אמיתי.

## שלב 4: "אני חייב"
להריץ `cloud/supabase/migrations/004_debts.sql` (או את הקובץ המאוחד `supabase-latest.sql`). מוסיף את סוג הרשומה `debt`. בלי זה החובות שלי נשמרים במכשיר בלבד.

## שלב 5: הוצאות
להריץ `cloud/supabase/migrations/005_expenses.sql` (או את הקובץ המאוחד `supabase-latest.sql`, שכולל את 002–005). מוסיף את סוג הרשומה `expense`.

## שלב 6: פרויקטים
להריץ `cloud/supabase/migrations/006_projects.sql` (או את `supabase-latest.sql`, שכולל את 002–006). מוסיף את סוג הרשומה `project`.

## שלב 7: משימות והערות קוליות
להריץ `cloud/supabase/migrations/007_tasks_voice.sql` (או את `supabase-latest.sql`, שכולל 002–007). מוסיף את הסוג `task` ומאפשר קובצי שמע ב-bucket הפרטי `receipts`.

## אפליקציות native
להוסיף ל-Redirect URLs את `com.easyrecord.app://auth` (או הסכמה שבחרת ב-`native/capacitor.config.json`).
