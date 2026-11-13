-- Easy Record: שלב 6 — פרויקטים. להדביק ב-SQL Editor ולהריץ. אפשר להריץ שוב בלי נזק.
-- מוסיף סוג רשומה חדש: project. בלי הקובץ הזה הפרויקטים נשמרים במכשיר בלבד ולא מסתנכרנים.
alter table public.records drop constraint if exists records_type_check;
alter table public.records add constraint records_type_check
  check (type in ('client','entry','payment','session','setting','receipt','debt','expense','project'));
