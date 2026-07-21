-- 公開前の確認環境で、ホームのランキングと最新レビューを表示するためのダミーデータ。
-- 通常マイグレーションには含めない。公開DBへ仮レビューを混ぜないため、確認環境だけで
-- 運営が明示実行する。公開切替時はsupabase/release/public-launch.sql.templateで削除する。

insert into public.profiles (user_id, name) values
  ('demo-reviewer-01', 'しゅわ好き'),
  ('demo-reviewer-02', '駅前レビュー'),
  ('demo-reviewer-03', 'ゆず時間'),
  ('demo-reviewer-04', 'お茶の休憩'),
  ('demo-reviewer-05', '朝活ラテ'),
  ('demo-reviewer-06', '夜更かしメモ')
on conflict (user_id) do update
set name = excluded.name;

-- product_nameは投稿時と同じくDBトリガーが商品マスタの値へ正規化する。
-- そのため、ここでは表示名の重複管理をせず、product_idだけを評価の正しい参照元にする。
insert into public.reviews (
  id,
  user_id,
  product_id,
  product_name,
  rating,
  sweetness,
  carbonation,
  scene,
  cost_performance,
  purchase_location,
  comment,
  created_at,
  updated_at
) values
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc0001',
    'demo-reviewer-01',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'temporary',
    5,
    3,
    4,
    array['リフレッシュ']::text[],
    4,
    'セブン-イレブン',
    'キレのある炭酸で、気分を切り替えたい時にぴったり。',
    '2026-07-21T12:54:08.599972Z'::timestamptz,
    '2026-07-21T12:54:08.599972Z'::timestamptz
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc0002',
    'demo-reviewer-02',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'temporary',
    4,
    2,
    4,
    array['仕事・勉強中']::text[],
    5,
    '自販機',
    '強めの炭酸なのに後味は軽め。午後の一杯にちょうどいい。',
    '2026-07-21T12:24:08.599972Z'::timestamptz,
    '2026-07-21T12:24:08.599972Z'::timestamptz
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc0003',
    'demo-reviewer-03',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'temporary',
    4,
    4,
    3,
    array['リラックス']::text[],
    3,
    'ローソン',
    '柚子の香りがふわっと残る。甘すぎないところが好き。',
    '2026-07-21T10:59:08.599972Z'::timestamptz,
    '2026-07-21T10:59:08.599972Z'::timestamptz
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc0004',
    'demo-reviewer-04',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'temporary',
    5,
    1,
    0,
    array['食事と一緒に']::text[],
    5,
    'ファミマ',
    '食事の味を邪魔しない、毎日飲みたくなるお茶。',
    '2026-07-21T08:59:08.599972Z'::timestamptz,
    '2026-07-21T08:59:08.599972Z'::timestamptz
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc0005',
    'demo-reviewer-05',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    'temporary',
    4,
    3,
    0,
    array['仕事・勉強中']::text[],
    4,
    'スーパー',
    'ミルク感がまろやかで、慌ただしい朝にも飲みやすい。',
    '2026-07-21T06:59:08.599972Z'::timestamptz,
    '2026-07-21T06:59:08.599972Z'::timestamptz
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc0006',
    'demo-reviewer-06',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
    'temporary',
    3,
    5,
    3,
    array['スポーツの後']::text[],
    3,
    'セブン-イレブン',
    '甘さはしっかりめ。冷やして飲むと気分が上がる。',
    '2026-07-21T04:59:08.599972Z'::timestamptz,
    '2026-07-21T04:59:08.599972Z'::timestamptz
  )
on conflict (id) do update
set
  user_id = excluded.user_id,
  product_id = excluded.product_id,
  product_name = excluded.product_name,
  rating = excluded.rating,
  sweetness = excluded.sweetness,
  carbonation = excluded.carbonation,
  scene = excluded.scene,
  cost_performance = excluded.cost_performance,
  purchase_location = excluded.purchase_location,
  comment = excluded.comment;
