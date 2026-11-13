# הכנה לתשתית Supabase (לא מחובר, לא נבדק)

**אזהרה:** הקבצים כאן הם הכנה בלבד. לא הורצו מול מסד Postgres אמיתי, ו-v4 **אינה משתמשת בהם**. אין עדיין קוד לקוח שמתחבר ל-Supabase. אין להציג שירות ענן כפעיל לפני בנייה ובדיקה.

## למה Supabase (הערכה כללית, לא נבדקה מול מחירון עדכני)
Postgres עם Row Level Security בצד השרת, אימות מובנה (דוא"ל, Google, Apple), Storage עם מדיניות, וגיבוי מנוהל. Firebase היא חלופה סבירה (Firestore + Auth + Storage). ההחלטה הסופית צריכה להיות שלך אחרי בדיקת מחירים וצרכים.

## מה אתה צריך לעשות (אל תשלח לי מפתחות)
1. פתח פרויקט ב-Supabase והפעל Auth (דוא"ל, ואם רוצים Google/Apple).
2. הרץ את `schema.sql` ב-SQL Editor ובדוק שה-RLS פעיל על כל הטבלאות.
3. צור Storage bucket פרטי בשם `receipts` (המדיניות ב-`schema.sql`).
4. העתק רק את **ה-URL ואת ה-anon key הציבורי** ל-`config/config.local.json` (ראה `config.example.json`). **את `service_role` לעולם לא מכניסים לקוד לקוח.**
5. בקש ממני להמשיך לשלב 3ב: בניית מתאם הלקוח, מיגרציית נתונים וסנכרון קבצים, ובדיקות מול הפרויקט שלך.

## מודל
טבלה `records` אחת לפי `(user_id, id)` עם `type`, `ver`, `deleted`, `data jsonb`, `updated_at`; טבלת `devices`; RLS לפי `auth.uid()`; ניתוק מכשיר = מחיקת שורה/ביטול סשן בצד השרת (דורש קוד שרת/Edge Function שלא נכתב).
