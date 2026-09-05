-- Bug reports
-- ----------------------------------------------------------------------------
-- Reports used to live in studio_collections under the key 'bugs': one row
-- holding the whole array. Two things followed from that, and together they
-- meant a member's report was silently lost:
--
--   1. store.jsx only writes a collection when the role is staff/moderator/
--      admin, and the RLS on studio_collections agrees. A member's report
--      therefore never left their browser.
--   2. On the next load the cloud copy replaced the local one, so the report
--      disappeared for the reporter too.
--
-- Giving members write access to that row would have been worse: it is the
-- whole collection in one value, so any client could overwrite everyone
-- else's reports in a single upsert.
--
-- A report is its own row here, so a member can insert exactly one thing and
-- cannot touch anybody else's.

create table if not exists public.bug_reports (
  id          text primary key,          -- client-generated, matches bugs[].id
  data        jsonb not null,            -- the whole record, so the page's
                                         -- shape can evolve without migrations
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists bug_reports_created_at_idx on public.bug_reports (created_at desc);

alter table public.bug_reports enable row level security;

-- Anyone signed in can read the tracker.
drop policy if exists "bug reports read" on public.bug_reports;
create policy "bug reports read" on public.bug_reports
  for select to authenticated using (true);

-- Anyone signed in can file one, and only as themselves.
drop policy if exists "bug reports insert" on public.bug_reports;
create policy "bug reports insert" on public.bug_reports
  for insert to authenticated
  with check (created_by = auth.uid());

-- Triage is staff work: only staff/moderator/admin may edit or remove a
-- report. A member files it and cannot alter it afterwards, which also means
-- one member cannot rewrite another's.
drop policy if exists "bug reports update" on public.bug_reports;
create policy "bug reports update" on public.bug_reports
  for update to authenticated
  using (public.get_my_role() in ('staff','moderator','admin'));

drop policy if exists "bug reports delete" on public.bug_reports;
create policy "bug reports delete" on public.bug_reports
  for delete to authenticated
  using (public.get_my_role() in ('staff','moderator','admin'));

-- Keep updated_at honest.
create or replace function public.bug_reports_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists bug_reports_touch on public.bug_reports;
create trigger bug_reports_touch before update on public.bug_reports
  for each row execute function public.bug_reports_touch();
