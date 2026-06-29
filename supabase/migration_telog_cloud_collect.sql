-- TeLog 云端代采 — CN 多租户持久化 (Supabase / Postgres)
-- Run in Supabase SQL Editor after schema.sql

create table if not exists public.telog_cloud_tenants (
  tenant_id uuid primary key,
  storage_region text not null default 'cn' check (storage_region = 'cn'),
  transport text not null default 'fleet_api' check (transport in ('fleet_api', 'fleet_telemetry')),
  retention_days integer not null default 365,
  consent_accepted_at timestamptz not null,
  disclosure_version integer not null,
  disclosure_accepted_at timestamptz not null,
  vehicles jsonb not null default '[]'::jsonb,
  refresh_token_hash text not null default '',
  refresh_token_vault jsonb,
  collector_status text not null default 'active' check (collector_status in ('active', 'paused', 'revoked')),
  registered_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.telog_cloud_events (
  id bigserial primary key,
  tenant_id uuid not null references public.telog_cloud_tenants (tenant_id) on delete cascade,
  sync_key text,
  event jsonb not null,
  created_at timestamptz not null default now()
);

create unique index if not exists telog_cloud_events_tenant_sync_key_uidx
  on public.telog_cloud_events (tenant_id, sync_key)
  where sync_key is not null;

create index if not exists telog_cloud_events_tenant_id_idx
  on public.telog_cloud_events (tenant_id, id);

alter table public.telog_cloud_tenants enable row level security;
alter table public.telog_cloud_events enable row level security;

-- Service role only (API route uses SUPABASE_SERVICE_ROLE_KEY)
create policy "telog_cloud_tenants_service" on public.telog_cloud_tenants
  for all using (false) with check (false);

create policy "telog_cloud_events_service" on public.telog_cloud_events
  for all using (false) with check (false);
