-- Invite code system — run in Supabase → SQL Editor

-- Invite codes table
create table if not exists public.invite_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  role       user_role not null,
  label      text default '',
  created_by uuid references public.profiles(id) on delete set null,
  max_uses   int not null default 1,
  use_count  int not null default 0,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- Track who used which invite
create table if not exists public.invite_uses (
  id        uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.invite_codes(id) on delete cascade,
  used_by   uuid not null references public.profiles(id) on delete cascade,
  used_at   timestamptz default now(),
  unique(invite_id, used_by)
);

-- RLS
alter table public.invite_codes enable row level security;
alter table public.invite_uses  enable row level security;

-- Admins manage all invite codes
drop policy if exists "admins manage invite codes" on public.invite_codes;
create policy "admins manage invite codes" on public.invite_codes
  for all using (get_my_role() = 'admin');

-- Any authenticated user can read a code (needed to validate it in the modal)
drop policy if exists "authenticated read invites" on public.invite_codes;
create policy "authenticated read invites" on public.invite_codes
  for select using (auth.role() = 'authenticated');

-- Users see their own uses; admins see all
drop policy if exists "users see own uses" on public.invite_uses;
create policy "users see own uses" on public.invite_uses
  for select using (used_by = auth.uid() or get_my_role() = 'admin');

drop policy if exists "system insert uses" on public.invite_uses;
create policy "system insert uses" on public.invite_uses
  for insert with check (false); -- only via RPC

-- RPC to safely claim an invite (validates + upgrades role atomically)
create or replace function public.claim_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite       record;
  v_user_id      uuid := auth.uid();
  v_current_role user_role;
  v_cur_rank     int;
  v_inv_rank     int;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  select * into v_invite from public.invite_codes where code = p_code;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Invalid invite code');
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    return jsonb_build_object('success', false, 'error', 'This invite has expired');
  end if;

  if v_invite.use_count >= v_invite.max_uses then
    return jsonb_build_object('success', false, 'error', 'This invite has already been fully used');
  end if;

  if exists (select 1 from public.invite_uses where invite_id = v_invite.id and used_by = v_user_id) then
    return jsonb_build_object('success', false, 'error', 'You have already used this invite');
  end if;

  select role into v_current_role from public.profiles where id = v_user_id;

  v_cur_rank := case v_current_role when 'admin' then 4 when 'moderator' then 3 when 'staff' then 2 else 1 end;
  v_inv_rank := case v_invite.role  when 'admin' then 4 when 'moderator' then 3 when 'staff' then 2 else 1 end;

  if v_cur_rank >= v_inv_rank then
    return jsonb_build_object('success', false, 'error',
      'You already have an equal or higher role (' || v_current_role || ')');
  end if;

  update public.profiles   set role      = v_invite.role where id = v_user_id;
  insert into public.invite_uses (invite_id, used_by) values (v_invite.id, v_user_id);
  update public.invite_codes set use_count = use_count + 1 where id = v_invite.id;

  return jsonb_build_object('success', true, 'role', v_invite.role::text, 'label', coalesce(v_invite.label, ''));
end;
$$;
