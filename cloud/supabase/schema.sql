-- Easy Record: סכמת ענן ל-Supabase. להדביק ב-SQL Editor ולהריץ (Run). אפשר להריץ שוב בלי נזק.
-- טבלת הרשומות: כל רשומה שייכת למשתמש אחד בלבד.
create table if not exists public.records (
  user_id    uuid not null references auth.users(id) on delete cascade,
  id         text not null,
  type       text not null check (type in ('client','entry','payment','session','setting')),
  ver        integer not null default 1,
  deleted    boolean not null default false,
  data       jsonb,
  device_id  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists records_user_type_idx on public.records (user_id, type, updated_at);

-- הרשאות: רק משתמש מחובר, ורק לשורות של עצמו. אין מחיקה קשיחה (מחיקה = deleted=true).
alter table public.records enable row level security;
revoke all on public.records from anon;
grant select, insert, update on public.records to authenticated;
drop policy if exists records_select on public.records;
drop policy if exists records_insert on public.records;
drop policy if exists records_update on public.records;
create policy records_select on public.records for select to authenticated using (user_id = auth.uid());
create policy records_insert on public.records for insert to authenticated with check (user_id = auth.uid());
create policy records_update on public.records for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- בקרת גרסאות: עדכון חייב לשאת גרסה גבוהה מהשמורה, אחרת נדחה (והאפליקציה מציגה התנגשות).
create or replace function public.records_ver_guard() returns trigger language plpgsql as $$
begin
  if new.ver <= old.ver then raise exception 'version_conflict' using errcode = 'P0001'; end if;
  new.updated_at := clock_timestamp();
  new.created_at := old.created_at;
  return new;
end $$;
drop trigger if exists records_ver_guard on public.records;
create trigger records_ver_guard before update on public.records for each row execute function public.records_ver_guard();

create or replace function public.records_ins_stamp() returns trigger language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;
drop trigger if exists records_ins_stamp on public.records;
create trigger records_ins_stamp before insert on public.records for each row execute function public.records_ins_stamp();

-- מחיקת החשבון שלי וכל הנתונים שלי (רק למשתמש המחובר, על עצמו).
create or replace function public.delete_my_account() returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
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
-- Easy Record: שלב 3 — אכיפת אימות דו־שלבי בצד השרת. להדביק ב-SQL Editor ולהריץ. אפשר להריץ שוב בלי נזק.
-- משתמש שהפעיל אימות דו־שלבי (יש לו גורם מאומת) חייב להיות מחובר ברמת aal2 כדי לגשת לנתונים ולקבצים.
-- משתמש בלי אימות דו־שלבי ממשיך לעבוד כרגיל. בלי הקובץ הזה האימות הדו־שלבי נבדק רק במסך הכניסה של האפליקציה.
create or replace function public.er_aal_ok() returns boolean language sql stable security definer set search_path = public, auth as $$
  select coalesce(auth.jwt()->>'aal','aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified');
$$;
revoke all on function public.er_aal_ok() from public, anon;
grant execute on function public.er_aal_ok() to authenticated;

drop policy if exists records_mfa on public.records;
create policy records_mfa on public.records as restrictive for all to authenticated
  using (public.er_aal_ok()) with check (public.er_aal_ok());

drop policy if exists er_receipts_mfa on storage.objects;
create policy er_receipts_mfa on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'receipts' or public.er_aal_ok()) with check (bucket_id <> 'receipts' or public.er_aal_ok());

-- גם מחיקת חשבון דורשת aal2 למי שהפעיל אימות דו־שלבי
create or replace function public.delete_my_account() returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.er_aal_ok() then raise exception 'mfa_required'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
-- Easy Record: שלב 4 — "אני חייב" (חובות שלי לאנשים). להדביק ב-SQL Editor ולהריץ. אפשר להריץ שוב בלי נזק.
-- מוסיף סוג רשומה חדש: debt. בלי הקובץ הזה החובות שלי נשמרים במכשיר בלבד ולא מסתנכרנים.
alter table public.records drop constraint if exists records_type_check;
alter table public.records add constraint records_type_check
  check (type in ('client','entry','payment','session','setting','receipt','debt'));
-- Easy Record: שלב 5 — הוצאות עסקיות. להדביק ב-SQL Editor ולהריץ. אפשר להריץ שוב בלי נזק.
-- מוסיף סוג רשומה חדש: expense. בלי הקובץ הזה ההוצאות נשמרות במכשיר בלבד ולא מסתנכרנות.
alter table public.records drop constraint if exists records_type_check;
alter table public.records add constraint records_type_check
  check (type in ('client','entry','payment','session','setting','receipt','debt','expense'));
-- Easy Record: שלב 6 — פרויקטים. להדביק ב-SQL Editor ולהריץ. אפשר להריץ שוב בלי נזק.
-- מוסיף סוג רשומה חדש: project. בלי הקובץ הזה הפרויקטים נשמרים במכשיר בלבד ולא מסתנכרנים.
alter table public.records drop constraint if exists records_type_check;
alter table public.records add constraint records_type_check
  check (type in ('client','entry','payment','session','setting','receipt','debt','expense','project'));
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
