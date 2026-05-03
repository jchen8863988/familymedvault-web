-- Run this in Supabase → SQL Editor after creating a project.
-- Then add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel + local .env.local

create table if not exists public.community_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 200),
  body text not null check (char_length(body) <= 8000),
  author_name text,
  author_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.idea_votes (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.community_ideas (id) on delete cascade,
  client_id text not null check (char_length(client_id) <= 120),
  created_at timestamptz not null default now(),
  unique (idea_id, client_id)
);

create table if not exists public.idea_comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.community_ideas (id) on delete cascade,
  body text not null check (char_length(body) <= 2000),
  author_name text,
  client_id text not null check (char_length(client_id) <= 120),
  created_at timestamptz not null default now()
);

create index if not exists idea_votes_idea_id_idx on public.idea_votes (idea_id);
create index if not exists idea_comments_idea_id_idx on public.idea_comments (idea_id);

alter table public.community_ideas enable row level security;
alter table public.idea_votes enable row level security;
alter table public.idea_comments enable row level security;

create policy "community_ideas_select" on public.community_ideas for select using (true);
create policy "community_ideas_insert" on public.community_ideas for insert with check (true);

create policy "idea_votes_select" on public.idea_votes for select using (true);
create policy "idea_votes_insert" on public.idea_votes for insert with check (true);

create policy "idea_comments_select" on public.idea_comments for select using (true);
create policy "idea_comments_insert" on public.idea_comments for insert with check (true);
