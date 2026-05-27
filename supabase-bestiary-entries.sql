-- Shared Monster Manual entries — admin/staff edit, everyone reads.
-- Run this ONCE in your Supabase SQL Editor.

create table if not exists bestiary_entries (
  id         text primary key,
  data       jsonb not null,
  ord        int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists bestiary_entries_ord_idx on bestiary_entries(ord);

alter table bestiary_entries enable row level security;

-- Any authenticated user can read all entries.
drop policy if exists "bestiary read" on bestiary_entries;
create policy "bestiary read" on bestiary_entries
  for select to authenticated using (true);

-- Only admin + staff roles can write/update/delete.
drop policy if exists "bestiary admin write" on bestiary_entries;
create policy "bestiary admin write" on bestiary_entries
  for insert to authenticated
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','staff'))
  );

drop policy if exists "bestiary admin update" on bestiary_entries;
create policy "bestiary admin update" on bestiary_entries
  for update to authenticated
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','staff'))
  );

drop policy if exists "bestiary admin delete" on bestiary_entries;
create policy "bestiary admin delete" on bestiary_entries
  for delete to authenticated
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','staff'))
  );

-- Touch updated_at on row update.
create or replace function bestiary_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists bestiary_entries_touch on bestiary_entries;
create trigger bestiary_entries_touch
  before update on bestiary_entries
  for each row execute function bestiary_touch_updated_at();
