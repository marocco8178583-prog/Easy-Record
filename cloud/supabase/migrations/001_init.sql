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
