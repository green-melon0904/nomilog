/**
 * クライアントがログイン状態を描画するための最小セッション情報を返す。
 * アクセストークンやCookieの内容は返さず、認証の詳細はサーバー境界に留める。
 */
import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import { hasWorkOSAuthConfig } from "@/lib/workos";

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
    const { user } = await withAuth();
    return NextResponse.json({
      configured: true,
      // 登録日はプロフィール表示だけに使い、アクセストークンなどの認証情報は返さない。
      user: user ? { id: user.id, email: user.email, name: [user.firstName, user.lastName].filter(Boolean).join(" "), createdAt: user.createdAt } : null
    });
  } catch (error) {
    // セッションが壊れている場合も詳細をクライアントへ返さず、未ログインとして扱う。
    console.error("[auth/session] WorkOS session lookup failed", error);
    return NextResponse.json({ configured: true, user: null });
  }
}
