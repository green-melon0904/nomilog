begin;

-- 相関サブクエリ内のuser_idを修飾しないとreviews.user_idとして解決され、常に自分自身との比較になる。
-- 外側のreview_likesを明示して、他人の公開レビューだけをいいねできる本来の条件へ戻す。
drop policy if exists "workos users can like published reviews" on public.review_likes;
create policy "workos users can like published reviews" on public.review_likes
  for insert to authenticated
  with check (
    (select public.is_workos_authenticated())
    and (select auth.jwt() ->> 'sub') = review_likes.user_id
    and exists (
      select 1
      from public.reviews as review
      where review.id = review_likes.review_id
        and review.is_hidden = false
        and review.user_id <> review_likes.user_id
    )
  );

-- 削除連鎖と運営一覧で参照する新規外部キーへ索引を付ける。MVPの件数では必須ではないが、
-- 通知・問い合わせが増えた後の親行削除やJOINを全件走査にしないため、テーブル追加時点で用意する。
create index if not exists notifications_actor_user_id_idx on public.notifications(actor_user_id);
create index if not exists notifications_review_id_idx on public.notifications(review_id);
create index if not exists review_reports_reporter_user_id_idx on public.review_reports(reporter_user_id);
create index if not exists review_reports_reviewed_by_idx on public.review_reports(reviewed_by);
create index if not exists contact_inquiries_user_id_idx on public.contact_inquiries(user_id);
create index if not exists contact_inquiries_handled_by_idx on public.contact_inquiries(handled_by);
create index if not exists reviews_moderated_by_idx on public.reviews(moderated_by);

commit;
