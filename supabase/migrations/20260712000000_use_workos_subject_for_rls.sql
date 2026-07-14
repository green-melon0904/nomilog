-- WorkOSのsubjectは `user_...` 形式でSupabase AuthのUUIDではない。
-- Third-Party AuthのJWT subをそのまま保持するため所有者IDをtextへ移行する。
-- 既存ポリシーが旧型のuser_idに依存するため、型変更より前に削除する。
drop policy if exists "users can insert their profile" on public.profiles;
drop policy if exists "users can update their profile" on public.profiles;
drop policy if exists "users can insert their reviews" on public.reviews;
drop policy if exists "users can update their reviews" on public.reviews;
drop policy if exists "users can delete their reviews" on public.reviews;
drop policy if exists "users can insert product requests" on public.product_requests;
drop policy if exists "users can read their product requests" on public.product_requests;

alter table public.reviews drop constraint if exists reviews_user_id_fkey;
alter table public.product_requests drop constraint if exists product_requests_user_id_fkey;
alter table public.profiles drop constraint if exists profiles_user_id_fkey;

alter table public.profiles alter column user_id type text using user_id::text;
alter table public.reviews alter column user_id type text using user_id::text;
alter table public.product_requests alter column user_id type text using user_id::text;

alter table public.reviews
  add constraint reviews_user_id_fkey
  foreign key (user_id) references public.profiles(user_id) on delete cascade;

alter table public.product_requests
  add constraint product_requests_user_id_fkey
  foreign key (user_id) references public.profiles(user_id) on delete cascade;

-- Supabase Authへの新規ユーザートリガーはWorkOS利用時には発火しないため削除する。
-- プロフィールは認証済みのWorkOS JWTを付けた投稿APIが本人IDでupsertする。
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- auth.uid()はUUIDへcastするため、WorkOSの文字列subjectでは使えない。
-- 検証済みJWTのsubだけを参照し、クライアントが渡すuser_idでは権限を決めない。
create policy "workos users can insert their profile" on public.profiles
  for insert to authenticated
  with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "workos users can update their profile" on public.profiles
  for update to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);

-- upsert時に既存プロフィールを参照できるようにしつつ、他人の表示名は読み出せないようにする。
create policy "workos users can read their profile" on public.profiles
  for select to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

create policy "workos users can insert their reviews" on public.reviews
  for insert to authenticated
  with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "workos users can update their reviews" on public.reviews
  for update to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "workos users can delete their reviews" on public.reviews
  for delete to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

create policy "workos users can insert product requests" on public.product_requests
  for insert to authenticated
  with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "workos users can read their product requests" on public.product_requests
  for select to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

-- Storageポリシーも同じsubjectに合わせ、他人のレビュー画像を作成・上書き・削除できないようにする。
drop policy if exists "users can upload review images under own folder" on storage.objects;
drop policy if exists "users can update own review images" on storage.objects;
drop policy if exists "users can delete own review images" on storage.objects;

create policy "workos users can upload review images under own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'review-images'
    and (select auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

create policy "workos users can update own review images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'review-images'
    and (select auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'review-images'
    and (select auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

create policy "workos users can delete own review images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'review-images'
    and (select auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
  );

-- SECURITY DEFINER関数はトリガーからのみ使う。PUBLICに実行権限を残さない。
revoke execute on function public.refresh_product_stats(uuid) from public;
revoke execute on function public.handle_review_stats() from public;
