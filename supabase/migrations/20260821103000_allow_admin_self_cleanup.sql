begin;

-- 管理者がアカウント削除した後に権限登録だけが残らないよう、本人subjectの行だけ削除を許可する。
-- 他管理者の追加・削除は引き続きSQL運用に限定し、アプリAPIから管理者を増やす権限は与えない。
grant delete on table public.app_admins to authenticated;

create policy "workos admins can remove their registration" on public.app_admins
  for delete to authenticated
  using (
    (select public.is_workos_authenticated())
    and (select auth.jwt() ->> 'sub') = user_id
  );

commit;
