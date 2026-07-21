-- 公開前は運営が管理する20品目だけをレビュー対象にする。
-- 以前の自由入力運用で作られた未登録飲料や、対象外の商品に付いたレビューは商品詳細・集計と
-- 対応付けられないため削除し、以後はDBでも対象外の商品を受け付けない。
-- レビュー画像の削除はSupabaseのStorage APIまたは管理画面で行う。storage.objectsへのSQL直接削除は
-- 現行のSupabase保護で拒否されるため、ここではDB行だけを安全に扱う。

begin;

-- 商品自体は将来の運用のため残し、レビューに使えるかだけを明示する。
-- 運営用のPostgres権限以外にはproductsの更新ポリシーがないため、ユーザーはこの値を変更できない。
alter table public.products
  add column if not exists is_reviewable boolean not null default false;

-- アプリ内の仮カタログとDBの品目を同じIDでそろえる。公開時は仮レビュー・いいね・画像を
-- 先に削除し、実在商品は新しいIDで登録する。仮データの名称だけを実在商品へ差し替えると、
-- テスト投稿が実在商品の評価として残るため、このIDは公開前データ専用として扱う。
insert into public.products (id, name, maker, category_id, image_url, created_at) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0007', '静かな強炭酸水', 'Mizuno Works', '11111111-1111-4111-8111-111111111111', '/products/citrus.svg', '2026-06-16T08:20:00.000Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0008', '塩ライムソーダ', 'Sora Craft', '11111111-1111-4111-8111-111111111111', '/products/citrus.svg', '2026-06-14T11:40:00.000Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0009', '夜ふかしジンジャー', 'Tonic Lab', '11111111-1111-4111-8111-111111111111', '/products/cola.svg', '2026-06-13T19:10:00.000Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0010', '香ばし麦茶', '山の茶房', '22222222-2222-4222-8222-222222222222', '/products/green-tea.svg', '2026-06-17T07:50:00.000Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0011', '白桃ジャスミン茶', 'Mellow Tea', '22222222-2222-4222-8222-222222222222', '/products/green-tea.svg', '2026-06-12T14:30:00.000Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0012', 'ほうじ茶ラテ', 'Kissa Origin', '22222222-2222-4222-8222-222222222222', '/products/latte.svg', '2026-06-08T09:10:00.000Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0013', 'ブラックモカ', 'Daily Roast', '33333333-3333-4333-8333-333333333333', '/products/cola.svg', '2026-06-15T06:45:00.000Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0014', '深煎りカフェオレ', 'Daily Roast', '33333333-3333-4333-8333-333333333333', '/products/latte.svg', '2026-06-11T10:20:00.000Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0015', 'オーツミルクラテ', 'North Cup', '33333333-3333-4333-8333-333333333333', '/products/latte.svg', '2026-06-07T15:00:00.000Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0016', '微炭酸チューハイ レモン', '北浜酒造', '44444444-4444-4444-8444-444444444444', '/products/lemon-sour.svg', '2026-06-18T20:00:00.000Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0017', '桃香るサワー', 'Sakura Spirits', '44444444-4444-4444-8444-444444444444', '/products/lemon-sour.svg', '2026-06-10T21:15:00.000Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0018', 'クラフトハイボール', 'Amber House', '44444444-4444-4444-8444-444444444444', '/products/lemon-sour.svg', '2026-06-06T18:35:00.000Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0019', 'シトラスエナジー', 'Volt Lab', '55555555-5555-4555-8555-555555555555', '/products/energy.svg', '2026-06-19T13:40:00.000Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0020', 'ナイトベリーエナジー', 'Volt Lab', '55555555-5555-4555-8555-555555555555', '/products/energy.svg', '2026-06-05T22:10:00.000Z')
on conflict (id) do update
set
  name = excluded.name,
  maker = excluded.maker,
  category_id = excluded.category_id,
  image_url = excluded.image_url,
  created_at = excluded.created_at;

-- seedの最初の6品目と今回追加する14品目だけを投稿対象にする。過去に管理側が作った
-- 別の商品行があっても、一覧や直接API呼び出しからレビュー先として使われないよう明示する。
update public.products
set is_reviewable = id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0007',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0008',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0009',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0010',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0011',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0012',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0013',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0014',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0015',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0016',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0017',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0018',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0019',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0020'
);

-- review_likesはreviews.idへのON DELETE CASCADEで同時に削除される。
-- 商品にひも付かない行と、20品目以外の商品に付いた行を削除して公開前のカタログをそろえる。
delete from public.reviews as review
where review.product_id is null
   or not exists (
     select 1
     from public.products as product
     where product.id = review.product_id
       and product.is_reviewable
   );

alter table public.reviews
  alter column product_id set not null;

-- RLSを通らない直接リクエストや将来の実装変更でも、レビュー対象が運営カタログから外れないよう
-- INSERTと商品情報変更をトリガーで検証する。productsは匿名閲覧のみ許可されているため、
-- ユーザーが自分でis_reviewableをtrueへ変えて制約を回避することはできない。
create or replace function public.enforce_reviewable_product()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  managed_product_name text;
begin
  select name
  into managed_product_name
  from public.products
  where id = new.product_id
    and is_reviewable;

  if managed_product_name is null then
    -- 商品マスタに存在しないIDと、投稿対象外へ切り替えた商品を同じ失敗として扱う。
    -- どちらかをエラー文で区別すると管理中の品目情報を余計に露出するため、返却は統一する。
    raise exception 'Reviews are limited to the managed catalog.'
      using errcode = '23514';
  end if;

  -- product_nameは旧スキーマとの互換性のため保持しているが、利用者からの値は信頼しない。
  -- コメントだけを更新する直接Data API操作でも、商品名を常にマスタの値へ正規化する。
  new.product_name = managed_product_name;

  return new;
end;
$$;

revoke execute on function public.enforce_reviewable_product() from public, anon, authenticated;

drop trigger if exists reviews_require_reviewable_product on public.reviews;
create trigger reviews_require_reviewable_product
before insert or update of product_id, product_name on public.reviews
for each row execute function public.enforce_reviewable_product();

-- 商品追加リクエストは公開前の方針では受け付けない。既存データとRLSの書き込み導線を消し、
-- 将来の再開時にテーブル構造だけを使えるようテーブル自体は予約領域として残す。
delete from public.product_requests;

drop policy if exists "users can insert product requests" on public.product_requests;
drop policy if exists "users can read their product requests" on public.product_requests;
drop policy if exists "workos users can insert product requests" on public.product_requests;
drop policy if exists "workos users can read their product requests" on public.product_requests;

comment on table public.product_requests is
  '将来の運営判断までユーザー操作を停止している商品追加リクエストの予約テーブル。';

commit;
