begin;

-- お気に入りはユーザーと商品の組み合わせを一意にし、連打や複数タブから同じ商品を
-- 保存しても行が増殖しないようにする。商品削除時は参照だけを自動削除し、プロフィール
-- 削除時にも個人データを残さない。
create table public.product_favorites (
  user_id text not null references public.profiles(user_id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

comment on table public.product_favorites is
  'ログインユーザーが後で見返すために保存したカタログ商品。';

-- 主キーはuser_id先頭なので、商品削除時の外部キー確認と商品別集計に使う逆向きの索引を持つ。
create index product_favorites_product_id_idx
  on public.product_favorites(product_id);

alter table public.product_favorites enable row level security;

-- 2026年以降のSupabase Data APIは新規テーブルの自動公開に依存できないため、必要な操作だけを
-- 明示する。お気に入りは公開情報ではなく、匿名・他ユーザーから読み取れない個人データとして扱う。
revoke all on table public.product_favorites from anon;
revoke all on table public.product_favorites from authenticated;
grant select, insert, delete on table public.product_favorites to authenticated;

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
