-- Community Wall schema for Supabase.
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).

-- ----------------------------------------------------------------------------
-- Table
-- ----------------------------------------------------------------------------

create table if not exists public.wall_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 40),
  message     text not null check (char_length(message) between 1 and 280),
  color       text not null default 'pink',
  x           int  not null default 500,
  y           int  not null default 500,
  rotation    int  not null default 0,
  created_at  timestamptz not null default now(),
  ip_hash     text,         -- set by server, used for abuse limiting; never exposed
  hidden      boolean not null default false
);

create index if not exists wall_messages_created_at_idx
  on public.wall_messages (created_at desc);

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------

alter table public.wall_messages enable row level security;

-- Anon users can read non-hidden messages and see only the public columns.
drop policy if exists "wall_messages_public_read" on public.wall_messages;
create policy "wall_messages_public_read"
  on public.wall_messages
  for select
  to anon, authenticated
  using (hidden = false);

-- Writes go through the server-side API (service role bypasses RLS), so we
-- do NOT grant insert to the anon role. This forces all inserts through our
-- rate-limited / moderated endpoint.
