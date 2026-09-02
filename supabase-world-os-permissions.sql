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
    'quests',         -- hooks, objectives, outcomes
    'powerCodex',     -- scaling, forms, weapons
    'comics'          -- comic page composer
  ]) with ordinality as t(p, ord)
  where not (p = any(rp.allowed_pages))
)
where rp.role in ('staff', 'moderator', 'admin');

-- Check:
--   select role, array_length(allowed_pages,1) from public.role_permissions order by role;

-- ── Member lockdown ─────────────────────────────────────────────────────────
-- Members ('user') get exactly three features: the Bug Tracker, the Campaign
-- Creator, and the Monster Manual. The Monster Manual is read-only for them,
-- enforced inside the bestiary itself (bestiary/app.jsx gates editing on
-- admin/staff), not merely hidden in the UI.
update public.role_permissions
set allowed_pages = array['bugs','campaignCreator','monsters']
where role = 'user';

-- Staff get everything the code knows about, World OS and Comic Studio
-- included. Admin already receives ALL_PAGES from auth.js regardless of this
-- table.
update public.role_permissions
set allowed_pages = array[
  'dashboard','systems','elements','factions','lore','timeline',
  'cards','moves','passives','statuses','natures',
  'heroes','lineage','monsters',
  'threads','tasks','ideas','concepts','dialogue','bugs',
  'campaigns','campaignCreator','worldEvents','resources','economy','relics',
  'playtest','activity','settings','users','sprites','live','players',
  'worldBible','atlas','assets','chronicle','relationships','publicWiki','quests',
  'powerCodex','comics'
]
where role = 'staff';
