create extension if not exists "pgcrypto";

-- Authユーザーに紐づく公開プロフィール。レビュー表示ではメールアドレスを出さず、
-- このテーブルのname/avatar_urlだけを参照して投稿者情報を扱う。
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 商品カテゴリは検索フィルターと商品詳細の表示に使う。
-- slugはURLクエリに載せるため、日本語名とは別に安定した英字キーを持たせる。
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- 商品マスタ。MVPではアプリ側seedと同じIDを投入し、レビュー集計値は
-- reviewsテーブルの変更トリガーで更新して一覧・ランキング表示を軽くする。
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  maker text not null,
  category_id uuid not null references public.categories(id),
  image_url text not null,
  avg_rating numeric(3, 2) not null default 0,
  avg_sweetness numeric(3, 2) not null default 0,
  avg_carbonation numeric(3, 2) not null default 0,
  avg_cost_performance numeric(3, 2) not null default 0,
  review_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- レビュー本体。画面側でも同じ範囲を検証するが、DB制約でも必須項目と評価値を守る。
-- carbonationだけは仕様通り0〜4で保存し、表示時に「なし/弱め/普通/強め/強炭酸」へ変換する。
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  sweetness integer not null check (sweetness between 1 and 5),
  carbonation integer not null check (carbonation between 0 and 4),
  scene text[] not null default '{}' check (
    cardinality(scene) > 0
    and scene <@ array['朝', '運動後', '昼食', '夜', '暑い日']::text[]
  ),
  cost_performance integer not null check (cost_performance between 1 and 5),
  purchase_location text not null check (purchase_location in ('セブン', 'ローソン', 'ファミマ', '自販機', 'スーパー', 'その他')),
  comment text not null check (char_length(comment) between 1 and 300),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 検索で見つからなかった商品の追加要望。MVPではユーザーが商品マスタを直接増やさず、
-- リクエストとして蓄積し、後から運用側で確認できる形にしている。
create table public.product_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  name text not null,
  maker text,
  image_url text,
  note text,
  status text not null default 'new' check (status in ('new', 'reviewing', 'added', 'rejected')),
  created_at timestamptz not null default now()
);

-- Supabase Authでユーザーが作られた直後にprofilesも用意する。
-- reviews.user_idはprofilesを参照するため、投稿前にプロフィール行が存在する状態へ揃える。
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), 'のみログユーザー'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 1商品のレビュー集計を再計算するRPC。insert/update/deleteのたびに呼び、
-- products側の平均値とレビュー数を常にレビュー実体から導出した値に戻す。
create or replace function public.refresh_product_stats(target_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set
    avg_rating = coalesce(stats.avg_rating, 0),
    avg_sweetness = coalesce(stats.avg_sweetness, 0),
    avg_carbonation = coalesce(stats.avg_carbonation, 0),
    avg_cost_performance = coalesce(stats.avg_cost_performance, 0),
    review_count = coalesce(stats.review_count, 0)
  from (
    select
      product_id,
      round(avg(rating)::numeric, 2) as avg_rating,
      round(avg(sweetness)::numeric, 2) as avg_sweetness,
      round(avg(carbonation)::numeric, 2) as avg_carbonation,
      round(avg(cost_performance)::numeric, 2) as avg_cost_performance,
      count(*)::integer as review_count
    from public.reviews
    where product_id = target_product_id
    group by product_id
  ) stats
  where products.id = target_product_id;

  update public.products
  set avg_rating = 0,
      avg_sweetness = 0,
      avg_carbonation = 0,
      avg_cost_performance = 0,
      review_count = 0
  where id = target_product_id
    and not exists (select 1 from public.reviews where product_id = target_product_id);
end;
$$;

-- reviewsの変更を受けて集計対象の商品を更新するトリガー関数。
-- product_idが更新された場合は、新旧両方の商品集計を直して整合性を保つ。
create or replace function public.handle_review_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_product_stats(old.product_id);
    return old;
  end if;

  perform public.refresh_product_stats(new.product_id);

  if tg_op = 'UPDATE' and old.product_id <> new.product_id then
    perform public.refresh_product_stats(old.product_id);
  end if;

  return new;
end;
$$;

create trigger reviews_refresh_product_stats
after insert or update or delete on public.reviews
for each row execute function public.handle_review_stats();

-- Row Level Securityを有効化し、匿名閲覧は許可しつつ、投稿・更新・削除は本人に限定する。
-- フロントエンドのガードだけに依存せず、DB側でも同じ権限境界を守る。
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.reviews enable row level security;
alter table public.product_requests enable row level security;

create policy "profiles are readable" on public.profiles for select using (true);
create policy "users can insert their profile" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "users can update their profile" on public.profiles for update using (auth.uid() = user_id);

create policy "categories are readable" on public.categories for select using (true);
create policy "products are readable" on public.products for select using (true);
create policy "reviews are readable" on public.reviews for select using (true);

create policy "users can insert their reviews" on public.reviews
  for insert with check (auth.uid() = user_id);

create policy "users can update their reviews" on public.reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users can delete their reviews" on public.reviews
  for delete using (auth.uid() = user_id);

create policy "users can insert product requests" on public.product_requests
  for insert with check (auth.uid() = user_id);

create policy "users can read their product requests" on public.product_requests
  for select using (auth.uid() = user_id);

-- MVPの初期カテゴリと商品。アプリ内seedと同じUUIDにしておくことで、
-- ローカルデモからSupabase接続へ切り替えてもproductIdの参照がずれない。
insert into public.categories (id, name, slug) values
  ('11111111-1111-4111-8111-111111111111', '炭酸', 'soda'),
  ('22222222-2222-4222-8222-222222222222', 'お茶', 'tea'),
  ('33333333-3333-4333-8333-333333333333', 'コーヒー', 'coffee'),
  ('44444444-4444-4444-8444-444444444444', '酒類', 'alcohol'),
  ('55555555-5555-4555-8555-555555555555', 'エナジー', 'energy'),
  ('66666666-6666-4666-8666-666666666666', 'その他', 'other')
on conflict (id) do nothing;

insert into public.products (id, name, maker, category_id, image_url, created_at) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'クラフトゼロコーラ', 'Nomi Beverage', '11111111-1111-4111-8111-111111111111', '/products/cola.svg', '2026-06-18T09:00:00.000Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '柚子スパーク', 'Kita Citrus', '11111111-1111-4111-8111-111111111111', '/products/citrus.svg', '2026-06-20T10:30:00.000Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '深み緑茶 すっきり', '山の茶房', '22222222-2222-4222-8222-222222222222', '/products/green-tea.svg', '2026-06-10T12:00:00.000Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', '朝の微糖ラテ', 'Daily Roast', '33333333-3333-4333-8333-333333333333', '/products/latte.svg', '2026-06-11T07:00:00.000Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', '雷光エナジー', 'Volt Lab', '55555555-5555-4555-8555-555555555555', '/products/energy.svg', '2026-06-22T08:00:00.000Z'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', 'まる搾りレモンサワー', '北浜酒造', '44444444-4444-4444-8444-444444444444', '/products/lemon-sour.svg', '2026-06-09T19:00:00.000Z')
on conflict (id) do nothing;

-- レビュー画像用の公開バケット。閲覧は匿名可にしつつ、アップロードや差し替えは
-- user.id配下のパスだけを許可して、他人の画像を上書きできないようにする。
-- 公開バケットなので、UIを迂回したStorage API呼び出しにも備えてサイズとMIME typeを制限する。
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

create policy "review images are public readable" on storage.objects
  for select using (bucket_id = 'review-images');

create policy "users can upload review images under own folder" on storage.objects
  for insert with check (
    bucket_id = 'review-images'
    and auth.uid()::text = (storage.foldername(name))[1]
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

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

create policy "users can delete own review images" on storage.objects
  for delete using (
    bucket_id = 'review-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
