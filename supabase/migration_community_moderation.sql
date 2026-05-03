-- Run once in Supabase SQL Editor if your project was created from an older schema.sql
-- without pinned / submitter_ip_hash.

alter table public.community_ideas
  add column if not exists pinned boolean not null default false;

alter table public.community_ideas
  add column if not exists submitter_ip_hash text;

create index if not exists community_ideas_pinned_created_idx
  on public.community_ideas (pinned desc, created_at desc);

create index if not exists community_ideas_ip_hash_created_idx
  on public.community_ideas (submitter_ip_hash, created_at desc);
