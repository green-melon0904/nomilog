-- プロフィール紹介文はマイページに表示する公開情報として、既存ユーザーにも既定値を入れる。
-- 空文字は「紹介文を表示しない」という本人の選択として許し、上限だけDBでも保証する。
alter table public.profiles
  add column if not exists bio text not null default '炭酸とお茶が好き';

alter table public.profiles
  drop constraint if exists profiles_bio_length_check;

alter table public.profiles
  add constraint profiles_bio_length_check
  check (char_length(bio) <= 80);

-- プロフィール画像はレビュー画像と分離する。公開プロフィールで表示するURLを使うためバケットは
-- 公開にするが、Storage APIを直接呼ばれても本人のWorkOS subjectフォルダ以外へ保存できない。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images',
  'profile-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "workos users can upload profile images under own folder" on storage.objects;
drop policy if exists "workos users can delete own profile images" on storage.objects;

create policy "workos users can upload profile images under own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-images'
    and (select auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

create policy "workos users can delete own profile images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-images'
    and (select auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
  );
