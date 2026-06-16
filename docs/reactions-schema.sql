-- Reactions schema for Supabase.
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- Stores emoji reactions on blog posts. One row per (post, emoji, ip_hash)
-- so an IP can react with at most one of each emoji per post.

-- ----------------------------------------------------------------------------
-- Table
-- ----------------------------------------------------------------------------

create table if not exists public.reactions (
  id              uuid primary key default gen_random_uuid(),
  post_slug       text not null check (char_length(post_slug) between 1 and 200),
  emoji_type      text not null check (emoji_type in ('like', 'heart', 'celebrate', 'insightful')),
  ip_hash         text not null,    -- server-set sha256 of (ip + UA + salt); never exposed
  created_at      timestamptz not null default now(),
  country         text,             -- ISO 3166-1 alpha-2 from Vercel geo header
  device_type     text,             -- 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown'
  browser_family  text              -- 'Chrome' | 'Safari' | 'Firefox' | ...
);

-- Backfill for older deployments where the table predates these columns.
alter table public.reactions add column if not exists country        text;
alter table public.reactions add column if not exists device_type    text;
alter table public.reactions add column if not exists browser_family text;

-- One reaction per (post, emoji, ip_hash). Lets the same IP like AND heart
-- the same post (one of each) but not double-like.
create unique index if not exists reactions_unique_per_ip
  on public.reactions (post_slug, emoji_type, ip_hash);

-- Hot path indexes for aggregation queries.
create index if not exists reactions_post_slug_idx on public.reactions (post_slug);
create index if not exists reactions_emoji_type_idx on public.reactions (emoji_type);
create index if not exists reactions_created_at_idx on public.reactions (created_at desc);

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------

alter table public.reactions enable row level security;

-- Anyone can read the counts (we never expose ip_hash via the API anyway).
drop policy if exists "reactions_public_read" on public.reactions;
create policy "reactions_public_read"
  on public.reactions
  for select
  to anon, authenticated
  using (true);

-- Writes go through the server-side API (service role bypasses RLS), so we
-- do NOT grant insert to the anon role. The API hashes the IP before insert.

-- ----------------------------------------------------------------------------
-- Aggregation helpers (optional but handy)
-- ----------------------------------------------------------------------------

-- Per-post per-emoji counts. Used by GET /api/reactions?post=<slug>
create or replace view public.reactions_per_post as
  select
    post_slug,
    emoji_type,
    count(*)::int as count
  from public.reactions
  group by post_slug, emoji_type;

grant select on public.reactions_per_post to anon, authenticated;

-- Top-reacted posts ranked by total reactions. Used by GET /api/reactions/top
create or replace view public.reactions_top_posts as
  select
    post_slug,
    count(*)::int as total_reactions
  from public.reactions
  group by post_slug
  order by count(*) desc;

grant select on public.reactions_top_posts to anon, authenticated;

-- Reactions grouped by country. Used by the admin analytics widget.
-- NULL / empty country values are excluded (those are usually local-dev hits).
create or replace view public.reactions_countries as
  select
    country,
    count(*)::int as reaction_count
  from public.reactions
  where country is not null and country <> ''
  group by country
  order by count(*) desc;

grant select on public.reactions_countries to anon, authenticated;
