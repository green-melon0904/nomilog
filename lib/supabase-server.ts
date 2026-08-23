/**
 * WorkOSのアクセストークンをSupabaseへ渡すサーバーClient。
 *
 * ユーザー所有データでは、公開キーとThird-Party AuthのJWTを組み合わせて必ずRLSを通す。
 * RLSを迂回するSecret keyは問い合わせ専用の隔離されたClientだけに限定し、ここでは使わない。これにより、
 * Route Handlerのバグだけで他ユーザーのデータを変更できる経路を作らない。
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
