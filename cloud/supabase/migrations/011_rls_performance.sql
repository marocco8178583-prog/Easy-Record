-- 011: records policies evaluated once per query instead of once per row (Supabase performance advisor, 23.11.2026).
-- Same rules: auth.uid() and er_aal_ok() are wrapped in a sub-select, which Postgres runs once and reuses.
-- Matters on sync, which reads all of a user's records.
alter policy records_select on public.records using (user_id = (select auth.uid()));
alter policy records_insert on public.records with check (user_id = (select auth.uid()));
alter policy records_update on public.records using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy records_mfa on public.records using ((select public.er_aal_ok())) with check ((select public.er_aal_ok()));

create index if not exists fm_oauth_codes_user_idx on public.fm_oauth_codes(user_id);
