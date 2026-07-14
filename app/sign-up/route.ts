/**
 * AuthKitの新規登録入口。ログインと同じ安全なreturnTo制約を使う。
 * ログインと登録で入口を分けても、認証後の戻り先検証を別実装にしないことで、片方だけ
 * 外部リダイレクト対策から漏れる状態を防ぐ。
 */
import { getSignUpUrl } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { getSafeReturnTo } from "@/lib/auth-return-to";
import { hasWorkOSAuthConfig } from "@/lib/workos";

/**
 * 新規登録開始URLを生成してAuthKitへリダイレクトする。
 * WorkOSのクライアント情報やstateを画面側へ露出させず、認証プロバイダとの通信をサーバー
 * 側のRoute Handlerに閉じ込める。
 */
export async function GET(request: NextRequest) {
  if (!hasWorkOSAuthConfig()) {
    return NextResponse.redirect(new URL("/mypage?auth=setup", request.url));
  }

  // 新規登録もログインと同じreturnTo検証を通し、入口だけを分けて安全性の実装を共有する。
  const returnTo = getSafeReturnTo(request.nextUrl.searchParams.get("next"));
  const signUpUrl = await getSignUpUrl({ returnTo });
  return NextResponse.redirect(signUpUrl);
}
