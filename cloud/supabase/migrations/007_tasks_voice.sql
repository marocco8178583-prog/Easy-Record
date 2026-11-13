-- Easy Record: שלב 7 — משימות ותזכורות, והערות קוליות בענן. להדביק ב-SQL Editor ולהריץ. אפשר להריץ שוב בלי נזק.
-- 1) סוג רשומה חדש: task
alter table public.records drop constraint if exists records_type_check;
alter table public.records add constraint records_type_check
  check (type in ('client','entry','payment','session','setting','receipt','debt','expense','project','task'));
-- 2) ה-bucket הפרטי של הקבלות מקבל גם קובצי שמע (הערות קוליות). הגודל המרבי לא משתנה (10MB); ההרשאות לפי תיקיית משתמש נשארות כפי שהן.
update storage.buckets
   set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/heic','application/pdf',
                                  'audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/aac']
 where id = 'receipts';
