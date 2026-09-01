-- World OS image storage
-- ----------------------------------------------------------------------------
-- Images were being stored as base64 data URLs inside the record itself, which
-- meant they rode along in the studio_collections JSON column: the whole
-- collection re-upserted on every save, and a hard ~5MB browser storage cap.
--
-- This bucket holds them as real files instead. Records keep only the public
-- URL, so a collection row stays small no matter how much art the world has.
--
-- Read is public so <img src> works with no signed-URL round trip; writes match
-- the same staff/moderator/admin rule the collections table already uses via
-- public.get_my_role().

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'world-assets',
  'world-assets',
  true,
  10485760,                                   -- 10MB per object; the client
                                              -- downscales well below this
  array['image/webp','image/jpeg','image/png','image/gif','image/svg+xml']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may read — these are world images meant to be shown.
drop policy if exists "world assets read" on storage.objects;
create policy "world assets read" on storage.objects
  for select
  using (bucket_id = 'world-assets');

-- Only staff / moderator / admin may add or change them.
drop policy if exists "world assets insert" on storage.objects;
create policy "world assets insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'world-assets'
    and public.get_my_role() in ('staff','moderator','admin')
  );

drop policy if exists "world assets update" on storage.objects;
create policy "world assets update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'world-assets'
    and public.get_my_role() in ('staff','moderator','admin')
  );

drop policy if exists "world assets delete" on storage.objects;
create policy "world assets delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'world-assets'
    and public.get_my_role() in ('staff','moderator','admin')
  );
