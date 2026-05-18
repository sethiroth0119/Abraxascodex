-- Update user role permissions — run in Supabase SQL Editor
-- Users can view game content and participate in threads/bugs but cannot create or edit anything.

update public.role_permissions
set allowed_pages = array[
  'dashboard',
  'elements', 'factions', 'lore', 'timeline',
  'moves', 'passives', 'statuses', 'natures',
  'heroes', 'lineage',
  'resources', 'relics',
  'threads', 'bugs'
]
where role = 'user';
