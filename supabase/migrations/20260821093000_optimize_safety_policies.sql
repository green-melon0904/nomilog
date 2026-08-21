begin;

-- auth.jwt()や認証ヘルパーをSELECTで包み、一覧の各行ではなくクエリごとに一度だけ評価する。
-- 所有者と管理者の同種ポリシーもOR条件へまとめ、Postgresが複数の許可式を評価する負荷を減らす。
drop policy if exists "workos admins can read their registration" on public.app_admins;
create policy "workos admins can read their registration" on public.app_admins
  for select to authenticated
  using (
    (select public.is_workos_authenticated())
    and (select auth.jwt() ->> 'sub') = user_id
  );

drop policy if exists "workos users can read available reviews" on public.reviews;
create policy "workos users can read available reviews" on public.reviews
  for select to authenticated
  using (
    is_hidden = false
    or (
      (select public.is_workos_authenticated())
      and (select auth.jwt() ->> 'sub') = user_id
    )
    or (select private.is_nomilog_admin())
  );

drop policy if exists "workos users can insert their reviews" on public.reviews;
create policy "workos users can insert their reviews" on public.reviews
  for insert to authenticated
  with check (
    (select public.is_workos_authenticated())
    and (select auth.jwt() ->> 'sub') = user_id
    and is_hidden = false
    and moderated_at is null
    and moderated_by is null
  );

drop policy if exists "workos users can update their reviews" on public.reviews;
drop policy if exists "workos admins can moderate reviews" on public.reviews;
create policy "workos owners or admins can update reviews" on public.reviews
  for update to authenticated
  using (
    (
      (select public.is_workos_authenticated())
      and (select auth.jwt() ->> 'sub') = user_id
    )
    or (select private.is_nomilog_admin())
  )
  with check (
    (
      (select public.is_workos_authenticated())
      and (select auth.jwt() ->> 'sub') = user_id
    )
    or (select private.is_nomilog_admin())
  );

drop policy if exists "workos users can like published reviews" on public.review_likes;
create policy "workos users can like published reviews" on public.review_likes
  for insert to authenticated
  with check (
    (select public.is_workos_authenticated())
    and (select auth.jwt() ->> 'sub') = user_id
    and exists (
      select 1
      from public.reviews as review
      where review.id = review_id
        and review.is_hidden = false
        and review.user_id <> user_id
    )
  );

drop policy if exists "workos users can read their reports" on public.review_reports;
drop policy if exists "workos admins can read all reports" on public.review_reports;
create policy "workos owners or admins can read reports" on public.review_reports
  for select to authenticated
  using (
    (
      (select public.is_workos_authenticated())
      and (select auth.jwt() ->> 'sub') = reporter_user_id
    )
    or (select private.is_nomilog_admin())
  );

drop policy if exists "workos users can report published reviews" on public.review_reports;
create policy "workos users can report published reviews" on public.review_reports
  for insert to authenticated
  with check (
    (select public.is_workos_authenticated())
    and (select auth.jwt() ->> 'sub') = reporter_user_id
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and exists (
      select 1
      from public.reviews as review
      where review.id = review_id
        and review.is_hidden = false
        and review.user_id <> reporter_user_id
    )
  );

drop policy if exists "workos admins can resolve reports" on public.review_reports;
create policy "workos admins can resolve reports" on public.review_reports
  for update to authenticated
  using ((select private.is_nomilog_admin()))
  with check ((select private.is_nomilog_admin()));

drop policy if exists "workos users can read their notification preferences" on public.notification_preferences;
create policy "workos users can read their notification preferences" on public.notification_preferences
  for select to authenticated
  using ((select public.is_workos_authenticated()) and (select auth.jwt() ->> 'sub') = user_id);

drop policy if exists "workos users can create their notification preferences" on public.notification_preferences;
create policy "workos users can create their notification preferences" on public.notification_preferences
  for insert to authenticated
  with check ((select public.is_workos_authenticated()) and (select auth.jwt() ->> 'sub') = user_id);

drop policy if exists "workos users can update their notification preferences" on public.notification_preferences;
create policy "workos users can update their notification preferences" on public.notification_preferences
  for update to authenticated
  using ((select public.is_workos_authenticated()) and (select auth.jwt() ->> 'sub') = user_id)
  with check ((select public.is_workos_authenticated()) and (select auth.jwt() ->> 'sub') = user_id);

drop policy if exists "workos users can read their notifications" on public.notifications;
create policy "workos users can read their notifications" on public.notifications
  for select to authenticated
  using ((select public.is_workos_authenticated()) and (select auth.jwt() ->> 'sub') = recipient_user_id);

drop policy if exists "workos users can mark their notifications" on public.notifications;
create policy "workos users can mark their notifications" on public.notifications
  for update to authenticated
  using ((select public.is_workos_authenticated()) and (select auth.jwt() ->> 'sub') = recipient_user_id)
  with check ((select public.is_workos_authenticated()) and (select auth.jwt() ->> 'sub') = recipient_user_id);

drop policy if exists "workos users can delete their notifications" on public.notifications;
create policy "workos users can delete their notifications" on public.notifications
  for delete to authenticated
  using ((select public.is_workos_authenticated()) and (select auth.jwt() ->> 'sub') = recipient_user_id);

drop policy if exists "workos users can submit inquiries" on public.contact_inquiries;
create policy "workos users can submit inquiries" on public.contact_inquiries
  for insert to authenticated
  with check (
    status = 'new'
    and handled_by is null
    and handled_at is null
    and (
      user_id is null
      or (
        (select public.is_workos_authenticated())
        and (select auth.jwt() ->> 'sub') = user_id
      )
    )
  );

drop policy if exists "workos admins can read inquiries" on public.contact_inquiries;
create policy "workos admins can read inquiries" on public.contact_inquiries
  for select to authenticated
  using ((select private.is_nomilog_admin()));

drop policy if exists "workos admins can resolve inquiries" on public.contact_inquiries;
create policy "workos admins can resolve inquiries" on public.contact_inquiries
  for update to authenticated
  using ((select private.is_nomilog_admin()))
  with check ((select private.is_nomilog_admin()));

drop policy if exists "workos users can delete their account data" on public.profiles;
create policy "workos users can delete their account data" on public.profiles
  for delete to authenticated
  using ((select public.is_workos_authenticated()) and (select auth.jwt() ->> 'sub') = user_id);

-- profilesはすでに匿名公開プロフィールのSELECTポリシーがあるため、同じSELECTを重ねる本人専用ポリシーは不要。
drop policy if exists "workos users can read their profile" on public.profiles;

commit;
