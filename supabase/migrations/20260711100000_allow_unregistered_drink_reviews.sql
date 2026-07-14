-- 商品マスタにない飲み物もレビューとして受け付けられるよう、商品IDを任意にする。
-- 既存の商品レビューには商品名を埋め、今後の表示や管理で商品IDがなくても名称を失わないようにする。
alter table public.reviews
  add column if not exists product_name text;

update public.reviews as review
set product_name = product.name
from public.products as product
where review.product_id = product.id
  and review.product_name is null;

alter table public.reviews
  alter column product_id drop not null,
  alter column product_name set not null;

alter table public.reviews
  drop constraint if exists reviews_product_name_not_blank;

alter table public.reviews
  add constraint reviews_product_name_not_blank
  check (char_length(btrim(product_name)) between 1 and 80);

-- 商品IDがない未登録飲料は集計対象にしない。NULLのままトリガーへ渡すと
-- 既存のRPCが不要な更新を行うため、登録済み商品IDがある行だけ再集計する。
create or replace function public.handle_review_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.product_id is not null then
      perform public.refresh_product_stats(old.product_id);
    end if;
    return old;
  end if;

  if new.product_id is not null then
    perform public.refresh_product_stats(new.product_id);
  end if;

  if tg_op = 'UPDATE'
    and old.product_id is not null
    and old.product_id is distinct from new.product_id then
    perform public.refresh_product_stats(old.product_id);
  end if;

  return new;
end;
$$;
