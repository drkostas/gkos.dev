-- CV downloads schema for Supabase.
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- Stores a row per CV download event. One row per (ip_hash, day_bucket) so
-- the same IP refreshing the page a few times in a row doesn't inflate the
-- count. The /api/cv route inserts and ignores the unique-violation on
-- replays within the same UTC day.

-- ----------------------------------------------------------------------------
-- Table
-- ----------------------------------------------------------------------------

create table if not exists public.cv_downloads (
  id              uuid primary key default gen_random_uuid(),
  ip_hash         text not null,    -- server-set sha256 of (ip + UA + salt); never exposed
  day_bucket      date not null default (now() at time zone 'utc')::date,
  created_at      timestamptz not null default now(),
  country         text,
  device_type     text,
  browser_family  text,
  referrer        text
);

-- One download per (ip_hash, day_bucket). Same person refreshing on the same
-- day counts as one download.
create unique index if not exists cv_downloads_unique_per_ip_day
  on public.cv_downloads (ip_hash, day_bucket);

-- Hot path indexes.
create index if not exists cv_downloads_created_at_idx on public.cv_downloads (created_at desc);
create index if not exists cv_downloads_day_bucket_idx on public.cv_downloads (day_bucket desc);
create index if not exists cv_downloads_country_idx on public.cv_downloads (country);

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------

alter table public.cv_downloads enable row level security;

-- ip_hash and referrer are never exposed to anon; the read view below
-- aggregates everything we DO want to expose.
drop policy if exists "cv_downloads_no_anon_read" on public.cv_downloads;
create policy "cv_downloads_no_anon_read"
  on public.cv_downloads
  for select
  to authenticated
  using (true);

-- Writes go through the server-side API (service role bypasses RLS).

-- ----------------------------------------------------------------------------
-- Aggregation views (safe to expose to anon)
-- ----------------------------------------------------------------------------

-- Total + per-window counts. Used by GET /api/stats/cv-downloads.
create or replace view public.cv_downloads_totals as
  select
    count(*)::int as total,
    count(*) filter (where created_at >= now() - interval '30 days')::int as last_30_days,
    count(*) filter (where created_at >= now() - interval '7 days')::int  as last_7_days,
    count(*) filter (where created_at >= now() - interval '24 hours')::int as last_24_hours
  from public.cv_downloads;

grant select on public.cv_downloads_totals to anon, authenticated;

-- CV downloads grouped by country. Used by the engagement-geography widget.
create or replace view public.cv_downloads_countries as
  select
    country,
    count(*)::int as download_count
  from public.cv_downloads
  where country is not null and country <> ''
  group by country
  order by count(*) desc;

grant select on public.cv_downloads_countries to anon, authenticated;
