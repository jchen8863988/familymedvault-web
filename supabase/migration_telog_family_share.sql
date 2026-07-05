-- TeLog 家人共享邀请 — Supabase 持久化（替代 Vercel 内存 Map）
-- Run in Supabase SQL Editor

create table if not exists public.telog_family_invites (
  invite_token text primary key,
  permission text not null check (permission in ('location', 'basic')),
  relation text not null default '家庭成员',
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  share_link_id text,
  owner_account_id text,
  grantee_user_id text,
  grantee_phone_masked text,
  accepted_at timestamptz
);

create index if not exists telog_family_invites_owner_idx
  on public.telog_family_invites (owner_account_id)
  where owner_account_id is not null;

create index if not exists telog_family_invites_revoked_idx
  on public.telog_family_invites (revoked, created_at desc);

alter table public.telog_family_invites enable row level security;

drop policy if exists "telog_family_invites_service" on public.telog_family_invites;
create policy "telog_family_invites_service" on public.telog_family_invites
  for all using (false) with check (false);
