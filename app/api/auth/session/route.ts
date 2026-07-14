/**
 * クライアントがログイン状態を描画するための最小セッション情報を返す。
 * アクセストークンやCookieの内容は返さず、認証の詳細はサーバー境界に留める。
 */
import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import { defaultProfileBio, type ProfileView } from "@/lib/profile";
import { createWorkOSSupabaseClient } from "@/lib/supabase-server";
import { hasWorkOSAuthConfig } from "@/lib/workos";

/**
 * WorkOSの初期表示名をフォールバックにしつつ、保存済みプロフィール情報を優先して返す。
 *
 * 表示名・紹介文・画像はユーザーが変更できる表示データなので、WorkOSのfirstName/lastNameを
 * 毎回採用すると編集内容が再読み込みで戻ってしまう。Supabaseの取得失敗時だけ認証自体を
 * 壊さず、WorkOS名と既定紹介文へ戻して公開画面を継続できるようにする。
 */
async function readProfile(accessToken: string, userId: string, fallbackName: string): Promise<ProfileView> {
  // Route Handlerではブラウザー用Supabase Clientを読み込まず、サーバー側の環境変数だけで判定する。
  // 認証情報を扱う処理の依存を狭め、クライアント向けコードがサーバー境界へ混ざるのを防ぐ。
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { name: fallbackName, bio: defaultProfileBio };
  }

  try {
    const supabase = createWorkOSSupabaseClient(accessToken);
    const { data, error } = await supabase
      .from("profiles")
      .select("name,bio,avatar_url")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return {
      name: data?.name?.trim() || fallbackName,
      bio: data?.bio ?? defaultProfileBio,
      avatarUrl: data?.avatar_url ?? undefined
    };
  } catch (error) {
    // プロフィール取得失敗はログイン失敗とは分け、最小限のWorkOS情報で画面を表示する。
    console.error("[auth/session] profile lookup failed", error);
    return { name: fallbackName, bio: defaultProfileBio };
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
    const profile = user
      ? accessToken
        ? await readProfile(accessToken, user.id, fallbackName)
        : { name: fallbackName, bio: defaultProfileBio }
      : null;

    return NextResponse.json({
      configured: true,
      // 登録日はプロフィール表示だけに使い、アクセストークンなどの認証情報は返さない。
      user: user ? {
        id: user.id,
        email: user.email,
        name: profile?.name ?? fallbackName,
        bio: profile?.bio ?? defaultProfileBio,
        avatarUrl: profile?.avatarUrl,
        createdAt: user.createdAt
      } : null
    });
  } catch (error) {
    // セッションが壊れている場合も詳細をクライアントへ返さず、未ログインとして扱う。
    console.error("[auth/session] WorkOS session lookup failed", error);
    return NextResponse.json({ configured: true, user: null });
  }
}
