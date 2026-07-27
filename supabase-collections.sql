-- ============================================================
-- Abraxas Codex — Shared Studio Collections
-- Makes EVERYTHING (heroes, lore, moves, passives, factions, elements,
-- timeline, campaigns, ideas, dialogue, threads, tasks, settings, …) a shared
-- pool so all staff/admins see and build on each other's work — the same way
-- cards already work. (Cards keep their own richer table; see supabase-cards.sql.)
--
-- Run ONCE in Supabase → SQL Editor. Idempotent. Needs public.get_my_role().
-- ============================================================

create table if not exists public.studio_collections (
  key        text primary key,          -- 'heroes', 'lore', 'moves', 'settings', …
  data       jsonb not null,            -- the whole collection (array or object)
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.studio_collections enable row level security;

-- Everyone signed in can read every collection.
drop policy if exists "collections read" on public.studio_collections;
create policy "collections read" on public.studio_collections
  for select to authenticated using (true);

-- Only staff / moderator / admin can write.
drop policy if exists "collections insert" on public.studio_collections;
create policy "collections insert" on public.studio_collections
  for insert to authenticated
  with check (public.get_my_role() in ('staff','moderator','admin'));

drop policy if exists "collections update" on public.studio_collections;
create policy "collections update" on public.studio_collections
  for update to authenticated
  using (public.get_my_role() in ('staff','moderator','admin'))
  with check (public.get_my_role() in ('staff','moderator','admin'));

drop policy if exists "collections delete" on public.studio_collections;
create policy "collections delete" on public.studio_collections
  for delete to authenticated
  using (public.get_my_role() in ('staff','moderator','admin'));

create or replace function public.studio_collections_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists studio_collections_touch on public.studio_collections;
create trigger studio_collections_touch before update on public.studio_collections
  for each row execute procedure public.studio_collections_touch();

-- OPTIONAL: live sync so one staffer's edits appear on another's screen.
do $$ begin
  alter publication supabase_realtime add table public.studio_collections;
exception when duplicate_object then null; when others then null; end $$;
