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
