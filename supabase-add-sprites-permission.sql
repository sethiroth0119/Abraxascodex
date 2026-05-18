-- Add 'sprites' page to moderator, staff, and user allowed_pages
-- Run in Supabase → SQL Editor

update public.role_permissions
set allowed_pages = array_append(allowed_pages, 'sprites')
where role in ('moderator', 'staff', 'user')
  and not ('sprites' = any(allowed_pages));
