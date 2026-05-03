-- Run once in Supabase SQL Editor after schema.sql / community tables.
-- Public /apps reads from store_apps; writes only via server + SUPABASE_SERVICE_ROLE_KEY (/apps/admin).

create table if not exists public.store_apps (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(slug) >= 1 and char_length(slug) <= 80),
  name_en text not null check (char_length(name_en) <= 200),
  name_zh text not null check (char_length(name_zh) <= 200),
  tagline_en text check (char_length(tagline_en) <= 500),
  tagline_zh text check (char_length(tagline_zh) <= 500),
  platform_ios boolean not null default false,
  platform_android boolean not null default false,
  platform_web boolean not null default false,
  app_store_url text,
  google_play_url text,
  web_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_apps_sort_idx
  on public.store_apps (sort_order asc, created_at desc);

alter table public.store_apps enable row level security;

drop policy if exists "store_apps_public_select" on public.store_apps;
create policy "store_apps_public_select" on public.store_apps for select using (true);
