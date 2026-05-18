-- Restrict Sprite Forge to admin, moderator, and staff only
-- Run in Supabase → SQL Editor

update public.role_permissions
set allowed_pages = array_remove(allowed_pages, 'sprites')
where role = 'user';
