-- Review images are publicly readable, so the bucket itself must reject files that
-- are not expected user-uploaded images. This complements the client-side checks;
-- attackers can bypass the UI and call the Storage API directly with the anon key.
update storage.buckets
set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'review-images';

-- If the bucket does not exist yet, create it with the same restrictions. This keeps
-- the migration safe to run in environments where the initial schema was partially applied.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-images',
  'review-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users can upload review images under own folder" on storage.objects;
drop policy if exists "users can update own review images" on storage.objects;

-- Users may upload only into their own folder, and object names must end with one of
-- the image extensions the app knows how to preview and render safely.
create policy "users can upload review images under own folder" on storage.objects
  for insert with check (
    bucket_id = 'review-images'
    and auth.uid()::text = (storage.foldername(name))[1]
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

-- Updates need the same path and extension checks as inserts. The USING clause limits
-- which existing objects a user may touch; WITH CHECK limits what the row may become.
create policy "users can update own review images" on storage.objects
  for update using (
    bucket_id = 'review-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'review-images'
    and auth.uid()::text = (storage.foldername(name))[1]
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );
