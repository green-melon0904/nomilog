begin;

-- アカウント削除は本人フォルダをStorage APIで一覧取得してから実体を削除する。
-- 公開バケットでもlist()はSELECTのRLSを通るため、書き込みポリシーだけでは空フォルダの確認時点で失敗する。
-- 読み取り全般を許可せずobject.listだけに限定し、公開配信や他ユーザーの一覧可否を変えない。
drop policy if exists "workos users can list own review images for account deletion" on storage.objects;
create policy "workos users can list own review images for account deletion" on storage.objects
  for select to authenticated
  using (
    public.is_workos_authenticated()
    and storage.allow_only_operation('object.list')
    and bucket_id = 'review-images'
    and (select auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
  );

drop policy if exists "workos users can list own profile avatar for account deletion" on storage.objects;
create policy "workos users can list own profile avatar for account deletion" on storage.objects
  for select to authenticated
  using (
    public.is_workos_authenticated()
    and storage.allow_only_operation('object.list')
    and bucket_id = 'profile-images'
    and name = (select auth.jwt() ->> 'sub') || '/avatar'
  );

commit;
