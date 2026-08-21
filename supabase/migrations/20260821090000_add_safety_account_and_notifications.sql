begin;

-- 管理者IDはアプリコードやブラウザへ埋め込まず、WorkOS subjectを運用時にSQLで登録する。
-- プロフィール作成前でも管理者を登録できるようprofilesへの外部キーは持たせない。
create table public.app_admins (
  user_id text primary key,
  display_name text,
  created_at timestamptz not null default now()
);

comment on table public.app_admins is
  'レビュー通報と問い合わせを処理できる運営ユーザーのWorkOS subject一覧。';

alter table public.app_admins enable row level security;
revoke all on table public.app_admins from anon, authenticated;
grant select on table public.app_admins to authenticated;

create policy "workos admins can read their registration" on public.app_admins
  for select to authenticated
  using (
    public.is_workos_authenticated()
    and (select auth.jwt() ->> 'sub') = user_id
  );

-- 管理者判定はRLSから何度も使うためprivate schemaへ閉じ込める。
-- SECURITY DEFINERはapp_adminsのRLSを迂回する目的だけに限定し、JWTのissuerとsubjectを必ず検証する。
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_nomilog_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.is_workos_authenticated()
    and exists (
      select 1
      from public.app_admins as admin
      where admin.user_id = (select auth.jwt() ->> 'sub')
    ),
    false
  );
$$;

revoke execute on function private.is_nomilog_admin() from public, anon;
grant execute on function private.is_nomilog_admin() to authenticated;

-- 非公開レビューは匿名一覧から除外する。本人は削除・確認を続けられ、管理者は復元判断もできる。
alter table public.reviews
  add column is_hidden boolean not null default false,
  add column moderated_at timestamptz,
  add column moderated_by text references public.app_admins(user_id) on delete set null;

create index reviews_public_created_at_idx
  on public.reviews(created_at desc)
  where is_hidden = false;

-- 商品の平均値とレビュー件数にも非公開レビューを含めない。reviewsの既存UPDATEトリガーが
-- is_hidden変更時にもこの関数を呼ぶため、運営操作と同時に商品詳細・ランキングの集計も戻る。
create or replace function public.refresh_product_stats(target_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
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
      review.product_id,
      round(avg(review.rating)::numeric, 2) as avg_rating,
      round(avg(review.sweetness)::numeric, 2) as avg_sweetness,
      round(avg(review.carbonation)::numeric, 2) as avg_carbonation,
      round(avg(review.cost_performance)::numeric, 2) as avg_cost_performance,
      count(*)::integer as review_count
    from public.reviews as review
    where review.product_id = target_product_id
      and review.is_hidden = false
    group by review.product_id
  ) as stats
  where products.id = target_product_id;

  update public.products
  set avg_rating = 0,
      avg_sweetness = 0,
      avg_carbonation = 0,
      avg_cost_performance = 0,
      review_count = 0
  where id = target_product_id
    and not exists (
      select 1
      from public.reviews as review
      where review.product_id = target_product_id
        and review.is_hidden = false
    );
end;
$$;

drop policy if exists "reviews are readable" on public.reviews;

create policy "published reviews are anonymously readable" on public.reviews
  for select to anon
  using (is_hidden = false);

create policy "workos users can read available reviews" on public.reviews
  for select to authenticated
  using (
    is_hidden = false
    or (
      public.is_workos_authenticated()
      and (select auth.jwt() ->> 'sub') = user_id
    )
    or private.is_nomilog_admin()
  );

-- Data APIへ直接INSERTされても、投稿者が最初から非公開状態や管理者情報を指定できないようにする。
-- Route Handlerだけで列を省略する設計では別クライアントから回避できるため、既存の本人投稿ポリシーも置き換える。
drop policy if exists "workos users can insert their reviews" on public.reviews;

create policy "workos users can insert their reviews" on public.reviews
  for insert to authenticated
  with check (
    public.is_workos_authenticated()
    and (select auth.jwt() ->> 'sub') = user_id
    and is_hidden = false
    and moderated_at is null
    and moderated_by is null
  );

create policy "workos admins can moderate reviews" on public.reviews
  for update to authenticated
  using (private.is_nomilog_admin())
  with check (private.is_nomilog_admin());

-- 自分のレビューへの新規いいねはランキングを自己操作できるため、以後のINSERTをRLSで止める。
-- 既存データの自動削除は不可逆なのでmigrationでは行わず、必要な場合だけ運営が監査後に対処する。
drop policy if exists "workos users can insert their own review likes" on public.review_likes;

create policy "workos users can like published reviews" on public.review_likes
  for insert to authenticated
  with check (
    public.is_workos_authenticated()
    and (select auth.jwt() ->> 'sub') = user_id
    and exists (
      select 1
      from public.reviews as review
      where review.id = review_id
        and review.is_hidden = false
        and review.user_id <> user_id
    )
  );

-- reviewsには本人編集ポリシーもあるため、RLSだけでは新しい行の非公開列を書き換えられてしまう。
-- BEFORE UPDATEで旧値と比較し、管理者以外による運営列の変更をDB境界で拒否する。
create or replace function private.protect_review_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_hidden is distinct from new.is_hidden
    or old.moderated_at is distinct from new.moderated_at
    or old.moderated_by is distinct from new.moderated_by then
    if not private.is_nomilog_admin() then
      raise exception 'review moderation fields require an administrator'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function private.protect_review_moderation_fields() from public, anon, authenticated;

create trigger reviews_protect_moderation_fields
before update on public.reviews
for each row execute function private.protect_review_moderation_fields();

-- 同じユーザーから同じレビューへの重複通報を一意制約で防ぎ、対応状況を運営だけが更新する。
create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  reporter_user_id text not null references public.profiles(user_id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'inappropriate', 'rights', 'other')),
  details text not null default '' check (char_length(details) <= 300),
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  reviewed_by text references public.app_admins(user_id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (review_id, reporter_user_id)
);

create index review_reports_status_created_at_idx
  on public.review_reports(status, created_at desc);

alter table public.review_reports enable row level security;
revoke all on table public.review_reports from anon, authenticated;
grant select, insert, update on table public.review_reports to authenticated;

create policy "workos users can read their reports" on public.review_reports
  for select to authenticated
  using (
    public.is_workos_authenticated()
    and (select auth.jwt() ->> 'sub') = reporter_user_id
  );

create policy "workos users can report published reviews" on public.review_reports
  for insert to authenticated
  with check (
    public.is_workos_authenticated()
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

create policy "workos admins can read all reports" on public.review_reports
  for select to authenticated
  using (private.is_nomilog_admin());

create policy "workos admins can resolve reports" on public.review_reports
  for update to authenticated
  using (private.is_nomilog_admin())
  with check (private.is_nomilog_admin());

-- 通知設定は未作成を「いいね通知ON」と解釈し、既存ユーザーにも自然な初期動作を提供する。
create table public.notification_preferences (
  user_id text primary key references public.profiles(user_id) on delete cascade,
  review_likes_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
revoke all on table public.notification_preferences from anon, authenticated;
grant select, insert, update on table public.notification_preferences to authenticated;

create policy "workos users can read their notification preferences" on public.notification_preferences
  for select to authenticated
  using (
    public.is_workos_authenticated()
    and (select auth.jwt() ->> 'sub') = user_id
  );

create policy "workos users can create their notification preferences" on public.notification_preferences
  for insert to authenticated
  with check (
    public.is_workos_authenticated()
    and (select auth.jwt() ->> 'sub') = user_id
  );

create policy "workos users can update their notification preferences" on public.notification_preferences
  for update to authenticated
  using (
    public.is_workos_authenticated()
    and (select auth.jwt() ->> 'sub') = user_id
  )
  with check (
    public.is_workos_authenticated()
    and (select auth.jwt() ->> 'sub') = user_id
  );

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id text not null references public.profiles(user_id) on delete cascade,
  actor_user_id text not null references public.profiles(user_id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  kind text not null check (kind = 'review_like'),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (kind, review_id, actor_user_id)
);

create index notifications_recipient_created_at_idx
  on public.notifications(recipient_user_id, created_at desc);

alter table public.notifications enable row level security;
revoke all on table public.notifications from anon, authenticated;
grant select, delete on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;

create policy "workos users can read their notifications" on public.notifications
  for select to authenticated
  using (
    public.is_workos_authenticated()
    and (select auth.jwt() ->> 'sub') = recipient_user_id
  );

create policy "workos users can mark their notifications" on public.notifications
  for update to authenticated
  using (
    public.is_workos_authenticated()
    and (select auth.jwt() ->> 'sub') = recipient_user_id
  )
  with check (
    public.is_workos_authenticated()
    and (select auth.jwt() ->> 'sub') = recipient_user_id
  );

create policy "workos users can delete their notifications" on public.notifications
  for delete to authenticated
  using (
    public.is_workos_authenticated()
    and (select auth.jwt() ->> 'sub') = recipient_user_id
  );

-- いいね追加と通知作成を同じトランザクションへ含める。設定OFF、自分のレビュー、重複通知は保存しない。
create or replace function private.sync_review_like_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  review_owner text;
  notification_enabled boolean;
begin
  if tg_op = 'DELETE' then
    delete from public.notifications
    where kind = 'review_like'
      and review_id = old.review_id
      and actor_user_id = old.user_id;
    return old;
  end if;

  select review.user_id
  into review_owner
  from public.reviews as review
  where review.id = new.review_id
    and review.is_hidden = false;

  if review_owner is null or review_owner = new.user_id then
    return new;
  end if;

  select coalesce(preference.review_likes_enabled, true)
  into notification_enabled
  from (select 1) as fallback
  left join public.notification_preferences as preference
    on preference.user_id = review_owner;

  if notification_enabled then
    insert into public.notifications (
      recipient_user_id,
      actor_user_id,
      review_id,
      kind
    ) values (
      review_owner,
      new.user_id,
      new.review_id,
      'review_like'
    )
    on conflict (kind, review_id, actor_user_id) do nothing;
  end if;

  return new;
end;
$$;

revoke execute on function private.sync_review_like_notification() from public, anon, authenticated;

create trigger review_likes_sync_notification
after insert or delete on public.review_likes
for each row execute function private.sync_review_like_notification();

-- 問い合わせは匿名でも送信可能にするが、一覧の閲覧・対応状況の更新は管理者だけにする。
create table public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.profiles(user_id) on delete cascade,
  email text not null check (char_length(email) between 3 and 254),
  category text not null check (category in ('general', 'account', 'content', 'privacy', 'other')),
  message text not null check (char_length(message) between 20 and 1000),
  status text not null default 'new' check (status in ('new', 'read', 'resolved')),
  handled_by text references public.app_admins(user_id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create index contact_inquiries_status_created_at_idx
  on public.contact_inquiries(status, created_at desc);

alter table public.contact_inquiries enable row level security;
revoke all on table public.contact_inquiries from anon, authenticated;
grant insert on table public.contact_inquiries to anon;
grant insert, select, update on table public.contact_inquiries to authenticated;

create policy "anonymous users can submit inquiries" on public.contact_inquiries
  for insert to anon
  with check (
    user_id is null
    and status = 'new'
    and handled_by is null
    and handled_at is null
  );

create policy "workos users can submit inquiries" on public.contact_inquiries
  for insert to authenticated
  with check (
    status = 'new'
    and handled_by is null
    and handled_at is null
    and (
      user_id is null
      or (
        public.is_workos_authenticated()
        and (select auth.jwt() ->> 'sub') = user_id
      )
    )
  );

create policy "workos admins can read inquiries" on public.contact_inquiries
  for select to authenticated
  using (private.is_nomilog_admin());

create policy "workos admins can resolve inquiries" on public.contact_inquiries
  for update to authenticated
  using (private.is_nomilog_admin())
  with check (private.is_nomilog_admin());

-- プロフィールを削除すると外部キーで本人データが連鎖削除される。本人以外の削除はRLSで拒否する。
grant delete on table public.profiles to authenticated;

create policy "workos users can delete their account data" on public.profiles
  for delete to authenticated
  using (
    public.is_workos_authenticated()
    and (select auth.jwt() ->> 'sub') = user_id
  );

commit;

-- 初回管理者はmigration適用後、WorkOSのUser IDを確認して次のように登録する。
-- insert into public.app_admins (user_id, display_name) values ('user_...', '運営') on conflict (user_id) do nothing;
