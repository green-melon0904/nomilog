-- Supabase AuthのJWTもauthenticated roleを持つため、subject比較だけではWorkOS専用のRLSにならない。
-- Third-Party Auth設定が署名と正確なissuerを検証した後に届くことを前提に、WorkOS issuer形式も
-- 確認してネイティブSupabase JWTによるData API・Storageの書き込みを拒否する。
create or replace function public.is_workos_authenticated()
returns boolean
language sql
stable
as $$
  select coalesce(
    (select auth.jwt() ->> 'role') = 'authenticated'
    and (select auth.jwt() ->> 'iss') like 'https://api.workos.com/user_management/client_%',
    false
  );
$$;

comment on function public.is_workos_authenticated() is
  'RLSでWorkOS Third-Party AuthのJWTだけを許可する。WorkOSのカスタムAuthドメインを使う場合はissuer条件を更新すること。';

drop policy if exists "workos users can insert their profile" on public.profiles;
drop policy if exists "workos users can update their profile" on public.profiles;
drop policy if exists "workos users can read their profile" on public.profiles;
drop policy if exists "workos users can insert their reviews" on public.reviews;
drop policy if exists "workos users can update their reviews" on public.reviews;
drop policy if exists "workos users can delete their reviews" on public.reviews;
drop policy if exists "workos users can insert product requests" on public.product_requests;
drop policy if exists "workos users can read their product requests" on public.product_requests;
drop policy if exists "users can read their own review likes" on public.review_likes;
drop policy if exists "users can insert their own review likes" on public.review_likes;
drop policy if exists "users can delete their own review likes" on public.review_likes;

create policy "workos users can insert their profile" on public.profiles
  for insert to authenticated
  with check (public.is_workos_authenticated() and (select auth.jwt() ->> 'sub') = user_id);

create policy "workos users can update their profile" on public.profiles
  for update to authenticated
  using (public.is_workos_authenticated() and (select auth.jwt() ->> 'sub') = user_id)
  with check (public.is_workos_authenticated() and (select auth.jwt() ->> 'sub') = user_id);

create policy "workos users can read their profile" on public.profiles
  for select to authenticated
  using (public.is_workos_authenticated() and (select auth.jwt() ->> 'sub') = user_id);

create policy "workos users can insert their reviews" on public.reviews
  for insert to authenticated
  with check (public.is_workos_authenticated() and (select auth.jwt() ->> 'sub') = user_id);

create policy "workos users can update their reviews" on public.reviews
  for update to authenticated
  using (public.is_workos_authenticated() and (select auth.jwt() ->> 'sub') = user_id)
  with check (public.is_workos_authenticated() and (select auth.jwt() ->> 'sub') = user_id);

create policy "workos users can delete their reviews" on public.reviews
  for delete to authenticated
  using (public.is_workos_authenticated() and (select auth.jwt() ->> 'sub') = user_id);

create policy "workos users can insert product requests" on public.product_requests
  for insert to authenticated
  with check (public.is_workos_authenticated() and (select auth.jwt() ->> 'sub') = user_id);

create policy "workos users can read their product requests" on public.product_requests
  for select to authenticated
  using (public.is_workos_authenticated() and (select auth.jwt() ->> 'sub') = user_id);

create policy "workos users can read their own review likes" on public.review_likes
  for select to authenticated
  using (public.is_workos_authenticated() and (select auth.jwt() ->> 'sub') = user_id);

create policy "workos users can insert their own review likes" on public.review_likes
  for insert to authenticated
  with check (public.is_workos_authenticated() and (select auth.jwt() ->> 'sub') = user_id);

create policy "workos users can delete their own review likes" on public.review_likes
  for delete to authenticated
  using (public.is_workos_authenticated() and (select auth.jwt() ->> 'sub') = user_id);

drop policy if exists "workos users can upload review images under own folder" on storage.objects;
drop policy if exists "workos users can update own review images" on storage.objects;
drop policy if exists "workos users can delete own review images" on storage.objects;
drop policy if exists "workos users can upload profile images under own folder" on storage.objects;
drop policy if exists "workos users can delete own profile images" on storage.objects;
drop policy if exists "workos users can upload their profile avatar" on storage.objects;
drop policy if exists "workos users can update their profile avatar" on storage.objects;
drop policy if exists "workos users can delete their profile avatar" on storage.objects;

create policy "workos users can upload review images under own folder" on storage.objects
  for insert to authenticated
  with check (
    public.is_workos_authenticated()
    and bucket_id = 'review-images'
    and (select auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

create policy "workos users can update own review images" on storage.objects
  for update to authenticated
  using (
    public.is_workos_authenticated()
    and bucket_id = 'review-images'
    and (select auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
  )
  with check (
    public.is_workos_authenticated()
    and bucket_id = 'review-images'
    and (select auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

create policy "workos users can delete own review images" on storage.objects
  for delete to authenticated
  using (
    public.is_workos_authenticated()
    and bucket_id = 'review-images'
    and (select auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
  );

-- アバターはユーザーごとに固定パスを一つだけ許可する。Storageを任意ファイル置き場にしない。
create policy "workos users can upload their profile avatar" on storage.objects
  for insert to authenticated
  with check (
    public.is_workos_authenticated()
    and bucket_id = 'profile-images'
    and name = (select auth.jwt() ->> 'sub') || '/avatar'
  );

create policy "workos users can update their profile avatar" on storage.objects
  for update to authenticated
  using (
    public.is_workos_authenticated()
    and bucket_id = 'profile-images'
    and name = (select auth.jwt() ->> 'sub') || '/avatar'
  )
  with check (
    public.is_workos_authenticated()
    and bucket_id = 'profile-images'
    and name = (select auth.jwt() ->> 'sub') || '/avatar'
  );

create policy "workos users can delete their profile avatar" on storage.objects
  for delete to authenticated
  using (
    public.is_workos_authenticated()
    and bucket_id = 'profile-images'
    and name = (select auth.jwt() ->> 'sub') || '/avatar'
  );
