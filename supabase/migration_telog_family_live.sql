-- TeLog family share — live snapshot relay + invite labels (cross-device viewer)
-- Run after migration_telog_family_share.sql

alter table public.telog_family_invites
  add column if not exists vehicle_label text,
  add column if not exists owner_label text,
  add column if not exists grantee_location_consent_at timestamptz;

create table if not exists public.telog_family_live_snapshots (
  share_link_id text primary key,
  invite_token text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists telog_family_live_snapshots_token_idx
  on public.telog_family_live_snapshots (invite_token);

alter table public.telog_family_live_snapshots enable row level security;

drop policy if exists "telog_family_live_snapshots_service" on public.telog_family_live_snapshots;
create policy "telog_family_live_snapshots_service" on public.telog_family_live_snapshots
  for all using (false) with check (false);
