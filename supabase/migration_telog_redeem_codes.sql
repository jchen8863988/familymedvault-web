-- TeLog Cloud 会员兑换码 — 服务端校验（App 不再内置口令表）
-- Run in Supabase SQL Editor

create table if not exists public.telog_redeem_codes (
  code_hash text primary key,
  months integer not null check (months > 0 and months <= 36),
  max_redemptions integer,
  redemption_count integer not null default 0,
  expires_at timestamptz,
  disabled boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.telog_redeem_redemptions (
  id bigserial primary key,
  code_hash text not null references public.telog_redeem_codes (code_hash) on delete cascade,
  subject text not null,
  redeemed_at timestamptz not null default now(),
  constraint telog_redeem_redemptions_unique unique (code_hash, subject)
);

create index if not exists telog_redeem_redemptions_subject_idx
  on public.telog_redeem_redemptions (subject, redeemed_at desc);

alter table public.telog_redeem_codes enable row level security;
alter table public.telog_redeem_redemptions enable row level security;

drop policy if exists "telog_redeem_codes_service" on public.telog_redeem_codes;
create policy "telog_redeem_codes_service" on public.telog_redeem_codes
  for all using (false) with check (false);

drop policy if exists "telog_redeem_redemptions_service" on public.telog_redeem_redemptions;
create policy "telog_redeem_redemptions_service" on public.telog_redeem_redemptions
  for all using (false) with check (false);

-- Seed catalog (SHA-256 of normalized uppercase code — plaintext never stored)
insert into public.telog_redeem_codes (code_hash, months, max_redemptions, note) values
  ('a0aae915cdf91bf89cb4569d8b4f2c6b100493501c76f1eb80972ae61211cc79', 6, null, 'App Store review'),
  ('c74f4c51b7c7156bd6ed1b6ba95814f9a98acda176a4954e9e57abc41f7e2f51', 6, null, 'Half-year promo'),
  ('2c9f42c81d241ac088807f77c2f121cb23c9778438e75586a7ffbc94d17022a8', 6, null, 'Half-year promo alt')
on conflict (code_hash) do nothing;
