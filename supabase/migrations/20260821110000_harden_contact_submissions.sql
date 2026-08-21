begin;

-- 公開キーからcontact_inquiriesへ直接INSERTできる権限を外し、Next.jsの検証・ボット対策を迂回できなくする。
drop policy if exists "anonymous users can submit inquiries" on public.contact_inquiries;
drop policy if exists "workos users can submit inquiries" on public.contact_inquiries;
revoke insert on table public.contact_inquiries from anon, authenticated;

-- 生のIPアドレスは保存せず、サーバーがHMAC化した接続元ごとに10分間の送信回数だけを共有する。
-- private schemaはData APIへ公開せず、複数インスタンスや再起動でも同じ制限を引き継ぐ。
create table private.contact_submission_limits (
  fingerprint text primary key check (fingerprint ~ '^[0-9a-f]{64}$'),
  window_started timestamptz not null,
  attempt_count integer not null check (attempt_count between 1 and 4)
);

create index contact_submission_limits_window_idx
  on private.contact_submission_limits(window_started);

revoke all on table private.contact_submission_limits from public, anon, authenticated;

create or replace function public.submit_contact_inquiry(
  p_user_id text,
  p_email text,
  p_category text,
  p_message text,
  p_fingerprint text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(p_email));
  normalized_message text := btrim(p_message);
  current_attempt_count integer;
  inquiry_id uuid;
begin
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or char_length(normalized_email) > 254
    or p_category not in ('general', 'account', 'content', 'privacy', 'other')
    or char_length(normalized_message) not between 20 and 1000
    or p_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_contact_submission' using errcode = '22023';
  end if;

  -- 古い窓を掃除して、送信元の種類が増えても制限テーブルが際限なく残らないようにする。
  delete from private.contact_submission_limits
  where window_started < now() - interval '1 day';

  insert into private.contact_submission_limits (fingerprint, window_started, attempt_count)
  values (p_fingerprint, now(), 1)
  on conflict (fingerprint) do update
  set
    window_started = case
      when contact_submission_limits.window_started < now() - interval '10 minutes' then now()
      else contact_submission_limits.window_started
    end,
    attempt_count = case
      when contact_submission_limits.window_started < now() - interval '10 minutes' then 1
      else contact_submission_limits.attempt_count + 1
    end
  returning attempt_count into current_attempt_count;

  if current_attempt_count > 3 then
    raise exception 'contact_rate_limited' using errcode = 'P0001';
  end if;

  insert into public.contact_inquiries (user_id, email, category, message)
  values (p_user_id, normalized_email, p_category, normalized_message)
  returning id into inquiry_id;

  return inquiry_id;
end;
$$;

-- service_roleはNext.jsサーバーだけが保持する。公開キーやWorkOSユーザーは関数を直接実行できない。
revoke execute on function public.submit_contact_inquiry(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_contact_inquiry(text, text, text, text, text)
  to service_role;

commit;
