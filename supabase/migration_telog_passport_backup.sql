-- TeLog 车辆档案云端备份 — 手动录入 + 自动采集快照
-- Run in Supabase SQL Editor

create table if not exists public.telog_passport_backups (
  device_id text not null,
  vin_suffix text not null,
  entries jsonb not null default '[]'::jsonb,
  auto_snapshot jsonb,
  storage_region text not null default 'cn' check (storage_region = 'cn'),
  updated_at timestamptz not null default now(),
  primary key (device_id, vin_suffix)
);

create index if not exists telog_passport_backups_updated_idx
  on public.telog_passport_backups (updated_at desc);

alter table public.telog_passport_backups enable row level security;

drop policy if exists "telog_passport_backups_service" on public.telog_passport_backups;
create policy "telog_passport_backups_service" on public.telog_passport_backups
  for all using (false) with check (false);
