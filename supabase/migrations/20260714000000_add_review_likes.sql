-- レビューごとのいいねを、同じユーザーが重複して登録できない形で保存する。
-- user_idはWorkOSのJWT subjectを保持する既存のprofiles.user_idと同じtext型にする。
create table public.review_likes (
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id text not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create index review_likes_user_id_idx on public.review_likes(user_id);

-- 一覧画面はレビュー行だけを読むため、件数はレビュー側に集計して保持する。
-- 更新はDBトリガーだけに任せ、クライアントから件数を直接書き換えられないようにする。
alter table public.reviews
  add column like_count integer not null default 0;

alter table public.reviews
  add constraint reviews_like_count_nonnegative check (like_count >= 0);

-- 既存データがある環境でも、先に保存済みのいいね件数を正しく反映する。
update public.reviews as review
set like_count = (
  select count(*)::integer
  from public.review_likes as like_row
  where like_row.review_id = review.id
);

-- いいねの追加・削除と表示件数を同じDB操作の中で同期する。
-- 更新式は like_count = like_count +/- 1 の原子的なUPDATEにし、同時操作でも計算を失わないようにする。
create or replace function public.handle_review_like_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.reviews
    set like_count = greatest(like_count - 1, 0)
    where id = old.review_id;
    return old;
  end if;

  update public.reviews
  set like_count = like_count + 1
  where id = new.review_id;
  return new;
end;
$$;

drop trigger if exists review_likes_refresh_count on public.review_likes;
create trigger review_likes_refresh_count
after insert or delete on public.review_likes
for each row execute function public.handle_review_like_stats();

-- 公開スキーマのテーブルでも、いいねの行そのものは匿名ユーザーへ公開しない。
-- 件数だけはreviews.like_countとして公開し、誰が押したかは本人の認証済みAPIだけが読めるようにする。
alter table public.review_likes enable row level security;

drop policy if exists "users can read their own review likes" on public.review_likes;
create policy "users can read their own review likes" on public.review_likes
  for select to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

drop policy if exists "users can insert their own review likes" on public.review_likes;
create policy "users can insert their own review likes" on public.review_likes
  for insert to authenticated
  with check ((select auth.jwt() ->> 'sub') = user_id);

drop policy if exists "users can delete their own review likes" on public.review_likes;
create policy "users can delete their own review likes" on public.review_likes
  for delete to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

-- Data APIから匿名で行を読み書きできないようにし、認証済みロールへ必要な操作だけを付与する。
revoke all on table public.review_likes from anon;
grant select, insert, delete on table public.review_likes to authenticated;

-- 集計関数はトリガーからだけ実行し、REST RPCとして直接呼び出せないようにする。
revoke execute on function public.handle_review_like_stats() from public, anon, authenticated;
