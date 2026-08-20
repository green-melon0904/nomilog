begin;

-- Supabase Advisorはヘルパー関数内のauth.jwt()を行評価として検出するため、お気に入りの
-- 3ポリシーだけは同じWorkOS判定をselect式で直接固定する。認証条件と所有者条件は変えない。
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
