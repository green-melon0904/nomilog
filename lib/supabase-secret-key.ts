/**
 * SupabaseのRLSを迂回するSecret keyを、サーバーから利用できる形式へ限定する。
 *
 * 改行や空白をtrimして受け入れると、コピー時の破損に気づかないまま別の値として扱う可能性がある。
 * そのため自動補正は行わず、`sb_secret_`形式との完全一致だけを有効とする。
 */

const supabaseSecretKeyPattern = /^sb_secret_[A-Za-z0-9_-]+$/;

export function parseSupabaseSecretKey(value: unknown) {
  if (typeof value !== "string" || !supabaseSecretKeyPattern.test(value)) return null;
  return value;
}

export function readSupabaseSecretKey() {
  return parseSupabaseSecretKey(process.env.SUPABASE_SECRET_KEY);
}
