-- Bug report attachments
-- ----------------------------------------------------------------------------
-- The Bug Tracker used <image-slot>, which persists through a sidecar written
-- via window.omelette. That runtime does not exist in this app, so the
-- component is read-only here and every screenshot a reporter dropped was
-- discarded on reload — one image, and it never survived.
--
-- This bucket takes many images and videos per report, and members can write
-- to it. That is the difference from world-assets, whose insert policy is
-- staff-only: a reporter is usually a member, so a staff-only bucket would
-- have failed for exactly the people who need it.
--
-- The bucket is PRIVATE. Screenshots of a bug routinely show the reporter's
-- own account, so the files are served through short-lived signed URLs rather
-- than left permanently readable by anyone holding a link.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bug-attachments',
  'bug-attachments',
  false,                                    -- signed URLs only
  26214400,                                 -- 25MB: images are compressed
                                            -- client-side, video is not
  array[
    'image/webp','image/jpeg','image/png','image/gif',
    'video/mp4','video/webm','video/quicktime'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone signed in may attach a file to a report. Files are written under a
-- per-user prefix so one member cannot overwrite another's upload.
drop policy if exists "bug attachments insert" on storage.objects;
create policy "bug attachments insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'bug-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone signed in may view attachments, because triage means staff opening
-- someone else's report. Reading still requires a signed URL.
drop policy if exists "bug attachments read" on storage.objects;
create policy "bug attachments read" on storage.objects
  for select to authenticated
  using (bucket_id = 'bug-attachments');

-- A reporter may remove their own file; staff may remove any.
drop policy if exists "bug attachments delete" on storage.objects;
create policy "bug attachments delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'bug-attachments'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.get_my_role() in ('staff','moderator','admin')
    )
  );
