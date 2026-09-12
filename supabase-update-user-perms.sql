-- Member (role 'user') page permissions — run in Supabase SQL Editor.
-- ----------------------------------------------------------------------------
-- A member may read the whole codex and may write exactly three things:
-- bug reports, thread comments and feature requests. Everything that builds
-- the world — cards, elements, factions, lore, moves, passives, statuses,
-- heroes, lineages, the timeline — is staff's to create and edit.
--
-- Reading is deliberately wide. Members are players: the canon is what they
-- came to look at, and hiding it served nobody. What they must not do is
-- change it, and that is enforced in three independent places, because any one
-- of them alone has failed before:
--
--   1. Here — the page never appears in their sidebar and the route is refused.
--   2. The RLS on studio_collections and cards — staff-only for insert,
--      update and delete, so a crafted request is refused at the database.
--   3. The setter guard in store.jsx — without it a refused write still landed
--      in localStorage, so the page showed the change as saved and it vanished
--      on the next load. That silence is how lost bug reports and lost thread
--      replies went unnoticed for weeks.
--
-- 'campaignCreator' and 'monsters' are on the list and are not an exception to
-- any of the above: both are self-contained iframe mini-apps that keep their
-- own data and touch no studio canon. 'players' is the member's own Mythic
-- Spellbook profile.

update public.role_permissions
set allowed_pages = array[
  -- browse the whole codex
  'dashboard', 'cards',
  'elements', 'factions', 'lore', 'timeline',
  'moves', 'passives', 'statuses', 'natures',
  'heroes', 'lineage', 'monsters',
  'relics', 'resources',
  -- personal tools: own iframe / own profile, no canon touched
  'campaignCreator', 'players',
  -- the three things a member may write
  'threads', 'bugs', 'features'
]
where role = 'user';

select role, array_length(allowed_pages, 1) as pages
from public.role_permissions where role = 'user';
