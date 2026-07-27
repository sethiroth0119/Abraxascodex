-- ============================================================
-- Abraxas Codex — Shared Card Catalog
-- Moves cards out of each person's browser into ONE shared pool so
-- staff/admins can see & edit each other's work and the community can
-- browse + vote on everything.
--
-- Run this ONCE in Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run (idempotent).
-- Depends on public.get_my_role() from supabase-setup.sql.
-- ============================================================

create table if not exists public.cards (
  id         text primary key,                 -- keep the client 'c...' id
  data       jsonb not null,                    -- the full card object
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cards_updated_idx on public.cards(updated_at desc);

alter table public.cards enable row level security;

-- Everyone signed in can READ every card (community browsing + voting).
drop policy if exists "cards read" on public.cards;
create policy "cards read" on public.cards
  for select to authenticated using (true);

-- Only staff / moderator / admin can create, edit, or delete cards.
-- They can edit ANY card (shared workspace), not just their own.
drop policy if exists "cards insert" on public.cards;
create policy "cards insert" on public.cards
  for insert to authenticated
  with check (public.get_my_role() in ('staff','moderator','admin'));

drop policy if exists "cards update" on public.cards;
create policy "cards update" on public.cards
  for update to authenticated
  using (public.get_my_role() in ('staff','moderator','admin'))
  with check (public.get_my_role() in ('staff','moderator','admin'));

drop policy if exists "cards delete" on public.cards;
create policy "cards delete" on public.cards
  for delete to authenticated
  using (public.get_my_role() in ('staff','moderator','admin'));

-- keep updated_at fresh on every write
create or replace function public.cards_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cards_touch on public.cards;
create trigger cards_touch before update on public.cards
  for each row execute procedure public.cards_touch_updated_at();

-- OPTIONAL — live collaboration. Enable realtime so a card another staff
-- member edits updates on your screen without a refresh. Ignore any
-- "already member" notice on re-run.
do $$ begin
  alter publication supabase_realtime add table public.cards;
exception when duplicate_object then null; when others then null; end $$;
