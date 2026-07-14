-- レビュー画像は公開URLで表示するため、バケット側でも想定外のファイルを拒否する。
-- クライアントの形式検証だけでは匿名キーからStorage APIを直接呼ばれると迂回できるため、
-- 公開データとして残るファイルの種類と容量をDB設定でも制限する。
update storage.buckets
set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'review-images';

-- 初期スキーマの適用が途中でも同じ制限を持つバケットを作れるよう、存在しなければ作成する。
-- 既存環境では同じ値へ更新し、移行順序による設定差を残さない。
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

-- ユーザーは自分のsubjectフォルダだけへアップロードでき、ファイル名も画面が表示できる
-- 画像拡張子に限定する。公開バケットのため、UIを使わない直接リクエストもこの条件で守る。
create policy "users can upload review images under own folder" on storage.objects
  for insert with check (
    bucket_id = 'review-images'
    and auth.uid()::text = (storage.foldername(name))[1]
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

-- 差し替えにも新規作成と同じパス・拡張子制約を適用する。USINGは触れる既存行を、
-- WITH CHECKは更新後の行を制限し、別ユーザーの画像上書きと拡張子変更を防ぐ。
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
