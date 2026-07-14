-- 投稿フォームに追加したシーンと購入場所を、既存レビューを壊さず保存できるように拡張する。
-- 旧「セブン」表記は表示文言に合わせて更新してから、新しいCHECK制約を付け直す。
alter table public.reviews drop constraint if exists reviews_scene_check;
alter table public.reviews drop constraint if exists reviews_purchase_location_check;

update public.reviews
set purchase_location = 'セブン-イレブン'
where purchase_location = 'セブン';

alter table public.reviews
  add constraint reviews_scene_check check (
    cardinality(scene) > 0
    and scene <@ array[
      '朝', '運動後', '昼食', '夜', '暑い日',
      'リフレッシュ', '風呂あがり', '仕事・勉強中',
      '食事と一緒に', 'リラックス', 'スポーツの後'
    ]::text[]
  ),
  add constraint reviews_purchase_location_check check (
    purchase_location in (
      'セブン-イレブン', 'ローソン', 'ファミマ', 'スーパー',
      'ドラッグストア', '自販機', 'Amazon', 'その他'
    )
  );
