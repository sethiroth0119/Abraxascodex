-- Threads and their posts
-- ----------------------------------------------------------------------------
-- Threads rode in studio_collections under the key 'threads': one row holding
-- every discussion and every comment inside it. Writing a collection is
-- staff-only (both in store.jsx and in the RLS), so a member who typed a reply
-- and pressed Post saved it to their own browser and nowhere else, and the next
-- load replaced it with the cloud copy. The reply was gone, with nothing said.
-- This is the third time that shape has cost us data — see the comments in
-- supabase-bug-reports.sql and supabase-feature-requests.sql. Do not fold
-- discussions back into a collection.
--
-- Two tables rather than one, because a reply is a write to somebody else's
-- thread. Posts nested inside the thread's jsonb would mean "let a member
-- update this thread row", which hands them the title, the status and every
-- other reply in it. A post being its own row is the whole point: a member
-- inserts exactly one comment, authored as themselves, and can touch nothing
-- else.

create table if not exists public.threads (
  id          text primary key,          -- client-generated, matches threads[].id
  data        jsonb not null,            -- title, scope, linkedId, author, status, tags
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists threads_created_at_idx on public.threads (created_at desc);

alter table public.threads enable row level security;

-- Everyone signed in can read the discussions.
drop policy if exists "threads read" on public.threads;
create policy "threads read" on public.threads
  for select to authenticated using (true);

-- Starting, renaming, resolving or deleting a discussion is staff work.
-- Members join threads; they do not open or curate them.
drop policy if exists "threads insert" on public.threads;
create policy "threads insert" on public.threads
  for insert to authenticated
  with check (public.get_my_role() in ('staff','moderator','admin'));

drop policy if exists "threads update" on public.threads;
create policy "threads update" on public.threads
  for update to authenticated
  using (public.get_my_role() in ('staff','moderator','admin'))
  with check (public.get_my_role() in ('staff','moderator','admin'));

drop policy if exists "threads delete" on public.threads;
create policy "threads delete" on public.threads
  for delete to authenticated
  using (public.get_my_role() in ('staff','moderator','admin'));

create or replace function public.threads_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists threads_touch on public.threads;
create trigger threads_touch before update on public.threads
  for each row execute function public.threads_touch();

-- ── posts ───────────────────────────────────────────────────────────────────
create table if not exists public.thread_posts (
  id          text primary key,          -- client-generated
  thread_id   text not null references public.threads(id) on delete cascade,
  data        jsonb not null,            -- who, when, text
  -- Nullable with on delete set null on purpose: if an account goes away the
  -- discussion still has to read straight, so the comment stays and loses its
  -- author rather than vanishing mid-conversation.
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists thread_posts_thread_idx
  on public.thread_posts (thread_id, created_at);

alter table public.thread_posts enable row level security;

drop policy if exists "thread posts read" on public.thread_posts;
create policy "thread posts read" on public.thread_posts
  for select to authenticated using (true);

-- This is the one thing a member may add here, and only as themselves.
-- created_by is NOT NULL-checked by accident: an explicit null makes
-- `created_by = auth.uid()` evaluate to NULL, and an INSERT with-check that is
-- not true is rejected, so the anonymous-post case fails closed.
drop policy if exists "thread posts insert" on public.thread_posts;
create policy "thread posts insert" on public.thread_posts
  for insert to authenticated
  with check (created_by = auth.uid());

-- Own comment, or staff. coalesce matters: created_by can be null once an
-- account is deleted, and a bare `created_by = auth.uid()` is NULL there, so
-- `using (NULL or false)` would be NULL — not a pass, but worth being explicit
-- about rather than leaving to the reader.
drop policy if exists "thread posts update" on public.thread_posts;
create policy "thread posts update" on public.thread_posts
  for update to authenticated
  using (coalesce(created_by = auth.uid(), false)
         or public.get_my_role() in ('staff','moderator','admin'));

drop policy if exists "thread posts delete" on public.thread_posts;
create policy "thread posts delete" on public.thread_posts
  for delete to authenticated
  using (coalesce(created_by = auth.uid(), false)
         or public.get_my_role() in ('staff','moderator','admin'));

-- ── Grants ──────────────────────────────────────────────────────────────────
-- Supabase's default privileges grant ALL on a new public table to anon and
-- authenticated. Row-level security gates select/insert/update/delete but NOT
-- truncate, so "RLS is enabled" says nothing about whether a role can empty the
-- table. Every policy here is 'to authenticated', so anon needs nothing.
revoke all on public.threads, public.thread_posts from anon;
revoke truncate, trigger, references on public.threads, public.thread_posts from authenticated;
