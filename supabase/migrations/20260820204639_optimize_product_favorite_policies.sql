begin;

-- 初回適用後の環境でも認証関数を行ごとに再評価しないよう、同じ所有者条件を
-- initPlanへ移せる形で作り直す。権限範囲は変えず、件数増加時のRLS評価コストだけを抑える。
drop policy if exists "workos users can read their favorites" on public.product_favorites;
drop policy if exists "workos users can insert their favorites" on public.product_favorites;
drop policy if exists "workos users can delete their favorites" on public.product_favorites;

create policy "workos users can read their favorites" on public.product_favorites
  for select to authenticated
  using (
    (select auth.jwt() ->> 'role') = 'authenticated'
    and (select auth.jwt() ->> 'iss') like 'https://api.workos.com/user_management/client_%'
    and (select auth.jwt() ->> 'sub') = user_id
  );

create policy "workos users can insert their favorites" on public.product_favorites
  for insert to authenticated
  with check (
    (select auth.jwt() ->> 'role') = 'authenticated'
    and (select auth.jwt() ->> 'iss') like 'https://api.workos.com/user_management/client_%'
    and (select auth.jwt() ->> 'sub') = user_id
  );

create policy "workos users can delete their favorites" on public.product_favorites
  for delete to authenticated
  using (
    (select auth.jwt() ->> 'role') = 'authenticated'
    and (select auth.jwt() ->> 'iss') like 'https://api.workos.com/user_management/client_%'
    and (select auth.jwt() ->> 'sub') = user_id
  );

commit;
