/**
 * クライアントがログイン状態を描画するための最小セッション情報を返す。
 * アクセストークンやCookieの内容は返さず、認証の詳細はサーバー境界に留める。
 */
import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import { createWorkOSSupabaseClient } from "@/lib/supabase-server";
import { hasWorkOSAuthConfig } from "@/lib/workos";

/**
 * WorkOSの初期表示名をフォールバックにしつつ、保存済みプロフィール名を優先して返す。
 *
 * プロフィール名はユーザーが変更できる表示データなので、WorkOSのfirstName/lastNameを毎回
 * 採用すると編集内容がログイン後の再読み込みで戻ってしまう。Supabaseの取得失敗時だけ
 * 認証自体を壊さず、WorkOS名へ戻して公開画面を継続できるようにする。
 */
async function readProfileName(accessToken: string, userId: string, fallbackName: string) {
  // Route Handlerではブラウザー用Supabase Clientを読み込まず、サーバー側の環境変数だけで判定する。
  // 認証情報を扱う処理の依存を狭め、クライアント向けコードがサーバー境界へ混ざるのを防ぐ。
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return fallbackName;

  try {
    const supabase = createWorkOSSupabaseClient(accessToken);
    const { data, error } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data?.name?.trim() || fallbackName;
  } catch (error) {
    // プロフィール取得失敗はログイン失敗とは分け、最小限のWorkOS情報で画面を表示する。
    console.error("[auth/session] profile lookup failed", error);
    return fallbackName;
  }
}

/**
 * WorkOSのセッションを確認し、表示に必要なユーザー情報だけを返す。
 * クライアントはログイン状態と表示名だけが必要で、アクセストークンやCookieの値は不要なので、
 * 最小限のレスポンスに限定して認証情報の露出範囲を抑える。
 */
export async function GET() {
  if (!hasWorkOSAuthConfig()) {
    return NextResponse.json({ configured: false, user: null }, { status: 503 });
  }

  try {
    const { user, accessToken } = await withAuth();
    const fallbackName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email.split("@")[0] || "のみログユーザー" : "";
    return NextResponse.json({
      configured: true,
      // 登録日はプロフィール表示だけに使い、アクセストークンなどの認証情報は返さない。
      user: user ? {
        id: user.id,
        email: user.email,
        name: accessToken ? await readProfileName(accessToken, user.id, fallbackName) : fallbackName,
        createdAt: user.createdAt
      } : null
    });
  } catch (error) {
    // セッションが壊れている場合も詳細をクライアントへ返さず、未ログインとして扱う。
    console.error("[auth/session] WorkOS session lookup failed", error);
    return NextResponse.json({ configured: true, user: null });
  }
}
