-- Blog comments schema for Supabase.
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- Per-post comment threads. Flat list, anonymous by default (optional name).
-- Inserts go through the server API which does Turnstile + moderation + rate
-- limit; the anon role can only SELECT non-hidden rows.

-- ----------------------------------------------------------------------------
-- Table
-- ----------------------------------------------------------------------------

create table if not exists public.blog_comments (
  id          uuid primary key default gen_random_uuid(),
  post_slug   text not null check (char_length(post_slug) between 1 and 200),
  author_name text check (author_name is null or char_length(author_name) between 1 and 40),
  body        text not null check (char_length(body) between 1 and 1000),
  ip_hash     text not null,  -- server-set sha256 of (ip + UA + salt); never exposed
  created_at  timestamptz not null default now(),
  hidden      boolean not null default false
);

create index if not exists blog_comments_post_slug_idx
  on public.blog_comments (post_slug, created_at desc);
create index if not exists blog_comments_created_at_idx
  on public.blog_comments (created_at desc);
create index if not exists blog_comments_ip_hash_idx
  on public.blog_comments (ip_hash, created_at desc);

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------

alter table public.blog_comments enable row level security;

drop policy if exists "blog_comments_public_read" on public.blog_comments;
create policy "blog_comments_public_read"
  on public.blog_comments
  for select
  to anon, authenticated
  using (hidden = false);

-- Writes go through the server-side API (service role bypasses RLS).

-- ----------------------------------------------------------------------------
-- Aggregation helpers
-- ----------------------------------------------------------------------------

-- Per-post comment counts. Used by the home/stats page and the
-- "N comments" label above each thread.
create or replace view public.blog_comments_per_post as
  select
    post_slug,
    count(*)::int as comment_count
  from public.blog_comments
  where hidden = false
  group by post_slug;

grant select on public.blog_comments_per_post to anon, authenticated;

-- Top-commented posts ranked by total comments. Mirror of reactions_top_posts.
create or replace view public.blog_comments_top_posts as
  select
    post_slug,
    count(*)::int as total_comments
  from public.blog_comments
  where hidden = false
  group by post_slug
  order by count(*) desc;

grant select on public.blog_comments_top_posts to anon, authenticated;
