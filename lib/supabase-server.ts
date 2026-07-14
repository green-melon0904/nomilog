/**
 * WorkOSのアクセストークンをSupabaseへ渡すサーバーClient。
 *
 * service_roleを使うとRLSを迂回できるため、このアプリでは公開キーとThird-Party Authの
 * JWTを組み合わせる。保存処理もDBポリシーの本人確認を通るので、Route Handlerのバグだけで
 * 他ユーザーのデータを変更できない。
 */
import { createClient } from "@supabase/supabase-js";

/**
 * JWTを一時的なアクセストークンとして使う、永続セッションを持たないClientを作る。
 * Route Handlerの1リクエストだけでJWTを使い捨て、サーバーやブラウザへSupabaseのセッションを
 * 保存しない。RLSはこのJWTのsubjectを使って本人確認を行う。
 */
export function createWorkOSSupabaseClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publishableKey) throw new Error("Supabaseの接続情報が見つかりません。");

  return createClient(url, publishableKey, {
    accessToken: async () => accessToken,
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}
