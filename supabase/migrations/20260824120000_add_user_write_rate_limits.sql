begin;

-- Vercelの複数インスタンスで同じ回数を共有するため、認証ユーザーの操作回数をDBの固定窓で管理する。
-- WorkOS User IDは直接保存せずSHA-256指紋へ変換し、漏えい時に外部IDとの照合材料を増やさない。
create table private.nomilog_user_write_limits (
  user_fingerprint text not null check (user_fingerprint ~ '^[0-9a-f]{64}$'),
  action_name text not null check (action_name in ('review_create', 'review_like', 'review_report')),
  window_started timestamptz not null,
  attempt_count integer not null check (attempt_count > 0),
  primary key (user_fingerprint, action_name)
);

create index nomilog_user_write_limits_window_idx
  on private.nomilog_user_write_limits(window_started);

revoke all on table private.nomilog_user_write_limits from public, anon, authenticated;

create or replace function public.consume_nomilog_user_write_limit(
  p_user_id text,
  p_action text
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_time timestamptz := statement_timestamp();
  hashed_user_id text;
  limit_count integer;
  window_seconds integer;
  stored_window_started timestamptz;
  stored_attempt_count integer;
begin
  -- この関数はSecret keyを持つNext.jsサーバーだけが呼ぶ。入力を本文由来に変える実装が将来混入しても、
  -- WorkOS User ID以外をカウンターへ保存できないようDB境界でも形式を限定する。
  if p_user_id !~ '^user_[0-9A-HJKMNP-TV-Z]{26}$' then
    raise exception 'invalid_nomilog_rate_limit_user' using errcode = '22023';
  end if;

  case p_action
    when 'review_create' then
      limit_count := 5;
      window_seconds := 600;
    when 'review_like' then
      limit_count := 30;
      window_seconds := 60;
    when 'review_report' then
      limit_count := 5;
      window_seconds := 600;
    else
      raise exception 'invalid_nomilog_rate_limit_action' using errcode = '22023';
  end case;

  hashed_user_id := encode(extensions.digest(p_user_id, 'sha256'), 'hex');

  -- 直近1日より古い窓は制限判定に不要。アクセス時の小さな掃除に留め、無料枠で定期ジョブを
  -- 増やさずともテーブルが利用者数に比例して残り続けないようにする。
  delete from private.nomilog_user_write_limits
  where window_started < request_time - interval '1 day';

  insert into private.nomilog_user_write_limits (
    user_fingerprint,
    action_name,
    window_started,
    attempt_count
  ) values (
    hashed_user_id,
    p_action,
    request_time,
    1
  )
  on conflict (user_fingerprint, action_name) do update
  set
    window_started = case
      when nomilog_user_write_limits.window_started
        < request_time - make_interval(secs => window_seconds) then request_time
      else nomilog_user_write_limits.window_started
    end,
    attempt_count = case
      when nomilog_user_write_limits.window_started
        < request_time - make_interval(secs => window_seconds) then 1
      else nomilog_user_write_limits.attempt_count + 1
    end
  returning window_started, attempt_count
  into stored_window_started, stored_attempt_count;

  allowed := stored_attempt_count <= limit_count;
  retry_after_seconds := case
    when allowed then 0
    else greatest(
      1,
      ceil(extract(epoch from (
        stored_window_started + make_interval(secs => window_seconds) - request_time
      )))::integer
    )
  end;
  return next;
end;
$$;

-- Secret keyはAPI Gatewayでservice_roleへ対応付けられる。認証ユーザーへ直接公開すると任意のIDで
-- 他人の窓を消費できるため、Route Handlerからのサーバー間RPCだけに実行権限を絞る。
revoke execute on function public.consume_nomilog_user_write_limit(text, text)
  from public, anon, authenticated;
grant execute on function public.consume_nomilog_user_write_limit(text, text)
  to service_role;

comment on function public.consume_nomilog_user_write_limit(text, text) is
  'Next.jsサーバー専用。レビュー投稿・いいね・通報のユーザー別固定窓レート制限を原子的に消費する。';

commit;
