-- Restrict Studio Settings to admin only
-- Run in Supabase → SQL Editor

update public.role_permissions
set allowed_pages = array_remove(allowed_pages, 'settings')
where role in ('moderator', 'staff', 'user');
