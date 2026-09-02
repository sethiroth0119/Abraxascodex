-- Grant the World OS pages to the roles that build the world
-- ----------------------------------------------------------------------------
-- auth.js gates every route on ALLOWED_PAGES. Admin gets ALL_PAGES from the
-- code, but staff, moderator and user read their list from this table — so a
-- newly added page is invisible to them until it is granted here.
--
-- Appends only what is missing, preserving the existing order, so it is safe
-- to re-run after adding more World OS pages. Verified as a no-op on a second
-- run.
--
-- 'user' (viewers) is deliberately left out: these are authoring tools. Anyone
-- can already read published entries at /wiki without an account.

update public.role_permissions rp
set allowed_pages = rp.allowed_pages || (
  select coalesce(array_agg(p order by ord), '{}')
  from unnest(array[
    'worldBible',     -- articles, templates, secrets, visibility
    'atlas',          -- maps and pins
    'assets',         -- image library
    'chronicle',      -- eras and history
    'relationships',  -- who stands where, and against whom
    'publicWiki',     -- reader preview with the audience switcher
    'quests'          -- hooks, objectives, outcomes
  ]) with ordinality as t(p, ord)
  where not (p = any(rp.allowed_pages))
)
where rp.role in ('staff', 'moderator', 'admin');

-- Check:
--   select role, array_length(allowed_pages,1) from public.role_permissions order by role;
