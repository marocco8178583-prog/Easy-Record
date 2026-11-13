-- Easy Record: שלב 5 — הוצאות עסקיות. להדביק ב-SQL Editor ולהריץ. אפשר להריץ שוב בלי נזק.
-- מוסיף סוג רשומה חדש: expense. בלי הקובץ הזה ההוצאות נשמרות במכשיר בלבד ולא מסתנכרנות.
alter table public.records drop constraint if exists records_type_check;
alter table public.records add constraint records_type_check
  check (type in ('client','entry','payment','session','setting','receipt','debt','expense'));
