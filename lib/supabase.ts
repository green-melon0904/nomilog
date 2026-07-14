/**
 * 匿名公開データ専用のブラウザClient。
 *
 * WorkOSのCookieやアクセストークンをブラウザ側へ移さず、商品・レビューの公開読み取りだけを
 * このClientへ限定する。認証が必要な操作はサーバーRoute Handlerへ集約する。
 */
import { createBrowserClient } from "@supabase/ssr";

/**
 * 公開Supabase設定が完全な場合だけリモートデータを有効にする。
 * URLだけ、またはキーだけが入力された中途半端な環境では接続を始めず、ローカルseedへ戻して
 * 設定途中の画面を壊さない。
 */
export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * 設定不足ならnullを返し、ローカルseed表示へ安全にフォールバックする。
 * 認証付き保存を行うClientはこの関数から作らず、公開読み取りだけをブラウザへ許可することで、
 * WorkOSのCookieやアクセストークンをクライアントへ移さない。
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createBrowserClient(url, anonKey);
}
