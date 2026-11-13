-- Easy Record: שלב 2 — קבלות בענן (אחסון פרטי). להדביק ב-SQL Editor ולהריץ. אפשר להריץ שוב בלי נזק.
-- 1) סוג רשומה חדש: receipt (פרטי הקבלה; הקובץ עצמו נשמר ב-Storage)
alter table public.records drop constraint if exists records_type_check;
alter table public.records add constraint records_type_check
  check (type in ('client','entry','payment','session','setting','receipt'));

-- 2) bucket פרטי לקבלות: עד 10MB לקובץ, תמונות ו-PDF בלבד
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/gif','image/heic','application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 3) הרשאות: כל משתמש ניגש רק לקבצים שבתיקייה ששמה הוא מזהה המשתמש שלו (receipts/<user_id>/<קובץ>)
drop policy if exists er_receipts_select on storage.objects;
drop policy if exists er_receipts_insert on storage.objects;
drop policy if exists er_receipts_update on storage.objects;
drop policy if exists er_receipts_delete on storage.objects;
create policy er_receipts_select on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy er_receipts_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy er_receipts_update on storage.objects for update to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy er_receipts_delete on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
