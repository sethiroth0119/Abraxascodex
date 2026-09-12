-- Reporter verification of a fix
-- ----------------------------------------------------------------------------
-- A report can sit at "fixed" with nobody having checked whether it actually
-- is. This lets the person who filed it answer that, and reopen it themselves
-- when the fix did not hold.
--
-- Why a function rather than a policy: updating bug_reports is staff-only, on
-- purpose — a member must not be able to rewrite a report after triage. Adding
-- "or created_by = auth.uid()" to the update policy would hand them the whole
-- row: status, severity, description, the lot. This function is the one
-- narrow exception, and it can only move a report from fixed to open.

create or replace function public.bug_report_verify(
  p_id     text,
  p_fixed  boolean,
  p_note   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r         public.bug_reports%rowtype;
  me        uuid := auth.uid();
  now_ms    bigint := (extract(epoch from now()) * 1000)::bigint;
  new_data  jsonb;
begin
  if me is null then
    raise exception 'You must be signed in to confirm a fix.';
  end if;

  select * into r from public.bug_reports where id = p_id;
  if not found then
    raise exception 'That report no longer exists.';
  end if;

  -- coalesce matters: created_by can be null (the migrated reports), and a
  -- bare `r.created_by = me` would be NULL there, so `if not NULL` would fall
  -- through and let anyone past this check.
  if not coalesce(r.created_by = me, false) then
    raise exception 'Only the person who filed this report can confirm it.';
  end if;

  if coalesce(r.data->>'status', 'open') <> 'fixed' then
    raise exception 'This report is not marked fixed.';
  end if;

  new_data := r.data
    || jsonb_build_object('reporterVerified',   p_fixed,
                          'reporterVerifiedAt', now_ms);

  if not p_fixed then
    -- back to open, and count it so a fix that keeps failing is visible
    new_data := new_data
      || jsonb_build_object('status',      'open',
                            'reopenedAt',  now_ms,
                            'reopenCount', coalesce((r.data->>'reopenCount')::int, 0) + 1);
  end if;

  -- an optional word from the reporter, shown in the same thread as staff replies
  if p_note is not null and length(btrim(p_note)) > 0 then
    new_data := jsonb_set(new_data, '{responses}',
      coalesce(new_data->'responses', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'id',    'rsp-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10),
        'by',    coalesce(nullif(btrim(r.data->>'reporter'), ''), 'Reporter'),
        'text',  btrim(p_note),
        'at',    now_ms,
        'staff', false
      )), true);
  end if;

  update public.bug_reports set data = new_data where id = p_id;
  return new_data;
end $$;

-- PostgreSQL grants EXECUTE to PUBLIC on every new function, and Supabase's
-- default privileges then grant it to anon as well; revoking from one leaves
-- the other standing. Read proacl to confirm, not has_function_privilege alone.
revoke all on function public.bug_report_verify(text, boolean, text) from public, anon;
grant execute on function public.bug_report_verify(text, boolean, text) to authenticated;
