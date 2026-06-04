-- Demographics columns for the three engagement tables.
-- Run this once in the Supabase SQL editor — additive only, no destructive changes.
--
-- All columns are nullable so existing rows stay valid. New rows get populated
-- from CF-IPCountry / Vercel-IP-Country headers and a coarse User-Agent parse.

-- ----------------------------------------------------------------------------
-- blog_comments
-- ----------------------------------------------------------------------------

alter table public.blog_comments
  add column if not exists country         text check (country is null or char_length(country) = 2),
  add column if not exists device_type     text check (device_type is null or device_type in ('mobile','tablet','desktop','bot','unknown')),
  add column if not exists browser_family  text check (browser_family is null or browser_family in ('chrome','safari','firefox','edge','opera','samsung','other','bot','unknown'));

create index if not exists blog_comments_country_idx on public.blog_comments (country);

-- ----------------------------------------------------------------------------
-- reactions
-- ----------------------------------------------------------------------------

alter table public.reactions
  add column if not exists country         text check (country is null or char_length(country) = 2),
  add column if not exists device_type     text check (device_type is null or device_type in ('mobile','tablet','desktop','bot','unknown')),
  add column if not exists browser_family  text check (browser_family is null or browser_family in ('chrome','safari','firefox','edge','opera','samsung','other','bot','unknown'));

create index if not exists reactions_country_idx on public.reactions (country);

-- ----------------------------------------------------------------------------
-- wall_messages
-- ----------------------------------------------------------------------------

alter table public.wall_messages
  add column if not exists country         text check (country is null or char_length(country) = 2),
  add column if not exists device_type     text check (device_type is null or device_type in ('mobile','tablet','desktop','bot','unknown')),
  add column if not exists browser_family  text check (browser_family is null or browser_family in ('chrome','safari','firefox','edge','opera','samsung','other','bot','unknown'));

create index if not exists wall_messages_country_idx on public.wall_messages (country);

-- ----------------------------------------------------------------------------
-- Aggregation views — one row per (table, country) for cheap card queries.
-- ----------------------------------------------------------------------------

create or replace view public.blog_comments_countries as
  select country, count(*)::int as comment_count
  from public.blog_comments
  where hidden = false and country is not null
  group by country
  order by count(*) desc;

grant select on public.blog_comments_countries to anon, authenticated;

create or replace view public.reactions_countries as
  select country, count(*)::int as reaction_count
  from public.reactions
  where country is not null
  group by country
  order by count(*) desc;

grant select on public.reactions_countries to anon, authenticated;

create or replace view public.wall_messages_countries as
  select country, count(*)::int as message_count
  from public.wall_messages
  where hidden = false and country is not null
  group by country
  order by count(*) desc;

grant select on public.wall_messages_countries to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Moderation log — used by the daily digest cron. Rate-limit blocks and
-- content-moderation rejects are persisted here so the email can summarize
-- "you blocked N things yesterday" without re-running the heuristics.
-- ----------------------------------------------------------------------------

create table if not exists public.moderation_blocks (
  id          uuid primary key default gen_random_uuid(),
  source      text not null check (source in ('comment','wall','reaction','cv')),
  reason      text not null,
  ip_hash     text,
  country     text,
  preview     text,        -- truncated content that triggered the block
  created_at  timestamptz not null default now()
);

create index if not exists moderation_blocks_created_at_idx
  on public.moderation_blocks (created_at desc);

alter table public.moderation_blocks enable row level security;
-- No public read policy — admin-only via service role.
