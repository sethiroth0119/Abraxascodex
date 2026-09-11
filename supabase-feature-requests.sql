-- Feature requests
-- ----------------------------------------------------------------------------
-- Players ask for things they want added to Mythic Spellbook; staff triage
-- and answer. Shaped like public.bug_reports on purpose, and for the same
-- reason: one row per request, so a member can insert exactly their own and
-- cannot touch anyone else's. (Bug reports once lived in a single
-- studio_collections row that members could not write, and every member's
-- report was silently lost. Do not fold this back into a collection.)
--
-- Votes are the one real difference. A request's worth is how many players
-- want it, so every signed-in player can vote. That cannot live inside the
-- request's jsonb the way bug votes do: updating a request is staff-only, so
-- a member would have no way to record a vote. Votes get their own table,
-- one row per (request, player), which also makes double-voting impossible
-- rather than merely discouraged.

create table if not exists public.feature_requests (
  id          text primary key,              -- client-generated
  data        jsonb not null,                -- the whole record
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists feature_requests_created_at_idx
  on public.feature_requests (created_at desc);

alter table public.feature_requests enable row level security;

drop policy if exists "feature requests read" on public.feature_requests;
create policy "feature requests read" on public.feature_requests
  for select to authenticated using (true);

-- A member files as themselves, and only as a fresh submission: without the
-- status check a crafted insert could arrive already marked "shipped".
-- Staff may insert in any state.
drop policy if exists "feature requests insert" on public.feature_requests;
create policy "feature requests insert" on public.feature_requests
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      coalesce(data->>'status', 'submitted') = 'submitted'
      or public.get_my_role() in ('staff','moderator','admin')
    )
  );

drop policy if exists "feature requests update" on public.feature_requests;
create policy "feature requests update" on public.feature_requests
  for update to authenticated
  using (public.get_my_role() in ('staff','moderator','admin'));

drop policy if exists "feature requests delete" on public.feature_requests;
create policy "feature requests delete" on public.feature_requests
  for delete to authenticated
  using (public.get_my_role() in ('staff','moderator','admin'));

create or replace function public.feature_requests_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists feature_requests_touch on public.feature_requests;
create trigger feature_requests_touch before update on public.feature_requests
  for each row execute function public.feature_requests_touch();

-- ── votes ───────────────────────────────────────────────────────────────────
create table if not exists public.feature_votes (
  request_id  text not null references public.feature_requests(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (request_id, user_id)          -- one vote per player, enforced
);

alter table public.feature_votes enable row level security;

-- A player sees their own votes (to know what they have already backed);
-- staff can see all. Nobody else can list who voted for what.
drop policy if exists "feature votes read" on public.feature_votes;
create policy "feature votes read" on public.feature_votes
  for select to authenticated
  using (user_id = auth.uid() or public.get_my_role() in ('staff','moderator','admin'));

drop policy if exists "feature votes insert" on public.feature_votes;
create policy "feature votes insert" on public.feature_votes
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "feature votes delete" on public.feature_votes;
create policy "feature votes delete" on public.feature_votes
  for delete to authenticated
  using (user_id = auth.uid());

-- Totals for everyone, without exposing who voted. Runs as its owner so the
-- count covers every vote, not just the viewer's own.
drop view if exists public.feature_vote_counts;
create view public.feature_vote_counts as
  select request_id, count(*)::int as votes
  from public.feature_votes
  group by request_id;

revoke all on public.feature_vote_counts from anon;
grant select on public.feature_vote_counts to authenticated;

-- ── Grants ──────────────────────────────────────────────────────────────────
-- Supabase's default privileges grant ALL on a new public table to anon and
-- authenticated. Row-level security gates select/insert/update/delete but NOT
-- truncate, so "RLS is enabled" says nothing about whether a role can empty the
-- table. Every policy here is 'to authenticated', so anon needs nothing, and
-- authenticated needs only the four verbs RLS actually governs.
revoke all on public.feature_requests, public.feature_votes from anon;
revoke truncate, trigger, references on public.feature_requests, public.feature_votes from authenticated;
-- The counts view inherited the same blanket grant; it is read-only by nature.
revoke all on public.feature_vote_counts from anon, authenticated;
grant select on public.feature_vote_counts to authenticated;
