/**
 * 匿名公開データ専用のブラウザClient。
 *
 * WorkOSのCookieやアクセストークンをブラウザ側へ移さず、商品・レビューの公開読み取りだけを
 * このClientへ限定する。認証が必要な操作はサーバーRoute Handlerへ集約する。
 */
import { createBrowserClient } from "@supabase/ssr";

/** 公開Supabase設定が完全な場合だけリモートデータを有効にする。 */
export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** 設定不足ならnullを返し、ローカルseed表示へ安全にフォールバックする。 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createBrowserClient(url, anonKey);
}
