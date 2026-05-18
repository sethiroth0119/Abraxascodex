-- ============================================================
-- Abraxas Codex — Role System Setup
-- Run this entire file in Supabase → SQL Editor → New query
-- ============================================================

-- 1. Role enum
create type user_role as enum ('user', 'staff', 'moderator', 'admin');

-- 2. Profiles table (extends auth.users with role + display info)
create table public.profiles (
  id        uuid references auth.users on delete cascade primary key,
  email     text unique not null,
  full_name text default '',
  role      user_role default 'user' not null,
  created_at timestamptz default now()
);

-- 3. Security-definer helper — reads the caller's role without triggering
--    the RLS policies on profiles (avoids infinite recursion).
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role::text from public.profiles where id = auth.uid();
$$;

-- 4. Row-Level Security
alter table public.profiles enable row level security;

create policy "Own profile readable"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins read all profiles"
  on public.profiles for select
  using (public.get_my_role() = 'admin');

create policy "Admins update any profile"
  on public.profiles for update
  using (public.get_my_role() = 'admin');

-- 5. Role-permissions table — controls which pages each role can access
create table public.role_permissions (
  role         user_role primary key,
  allowed_pages text[] default array[]::text[]
);

alter table public.role_permissions enable row level security;

create policy "Anyone can read permissions"
  on public.role_permissions for select
  using (true);

create policy "Admins manage permissions"
  on public.role_permissions for all
  using (public.get_my_role() = 'admin');

-- 6. Default permission sets
insert into public.role_permissions (role, allowed_pages) values
(
  'admin',
  array['dashboard','systems','elements','factions','lore','timeline',
        'cards','moves','passives','statuses','natures',
        'heroes','lineage',
        'threads','tasks','ideas','concepts','dialogue','bugs',
        'campaigns','worldEvents','resources','economy','relics',
        'playtest','activity','settings','users']
),
(
  'moderator',
  array['dashboard','elements','factions','lore','timeline',
        'heroes','lineage',
        'threads','tasks','ideas','concepts','dialogue','bugs',
        'worldEvents','resources','activity']
),
(
  'staff',
  array['dashboard','systems','elements','factions','lore','timeline',
        'cards','moves','passives','statuses','natures',
        'heroes','lineage',
        'threads','tasks','ideas','concepts','dialogue','bugs',
        'campaigns','worldEvents','resources','economy','relics','activity']
),
(
  'user',
  array['dashboard','elements','factions','lore','heroes','lineage']
);

-- 7. Auto-create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. Backfill profile for richaegisop@gmail.com and grant admin
--    (safe to run even if the user doesn't exist yet)
insert into public.profiles (id, email, full_name, role)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'full_name', 'Admin'),
  'admin'::user_role
from auth.users
where email = 'richaegisop@gmail.com'
on conflict (id) do update set role = 'admin';
