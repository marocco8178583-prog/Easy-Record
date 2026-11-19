-- Easy Record <- Find Medic: connected-app access (OAuth 2.0 authorization code + PKCE) and shift mapping.
-- Additive only: new tables, no change to public.records or any existing data. Safe to run again.
-- All three tables are server-only (Edge Function "findmedic" with the service role); the app never reads them directly.

-- One-time authorization codes (5 minutes, single use). Only the SHA-256 of the code is stored.
create table if not exists public.fm_oauth_codes (
  code_hash      text primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  client_id      text not null,
  redirect_uri   text not null,
  code_challenge text not null,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null,
  used_at        timestamptz
);

-- Connected apps. Only the SHA-256 of the access token is stored; revoked links stop working immediately.
create table if not exists public.fm_links (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  client_id    text not null,
  token_hash   text not null unique,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);
create index if not exists fm_links_user_idx on public.fm_links (user_id) where revoked_at is null;

-- Which Easy Record work day belongs to which Find Medic assignment (makes "create" idempotent).
create table if not exists public.fm_shifts (
  user_id                uuid not null references auth.users(id) on delete cascade,
  external_assignment_id uuid not null,
  entry_id               bigint not null,
  client_id              bigint not null,
  created_at             timestamptz not null default now(),
  primary key (user_id, external_assignment_id)
);

alter table public.fm_oauth_codes enable row level security;
alter table public.fm_links       enable row level security;
alter table public.fm_shifts      enable row level security;
revoke all on public.fm_oauth_codes, public.fm_links, public.fm_shifts from anon, authenticated;
