/**
 * AuthKitのホスト画面へ遷移するログイン入口。
 * returnToを先に許可済みパスへ正規化し、認証後の外部サイト誘導を防ぐ。
 */
import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { getSafeReturnTo } from "@/lib/auth-return-to";
import { hasWorkOSAuthConfig } from "@/lib/workos";

/**
 * ログイン開始URLを生成してAuthKitへリダイレクトする。
 * 画面側からWorkOSのURLを直接組み立てず入口をRoute Handlerへ集約することで、認証設定や
 * returnToの検証をログイン導線全体で同じように適用する。
 */
export async function GET(request: NextRequest) {
  if (!hasWorkOSAuthConfig()) {
    return NextResponse.redirect(new URL("/mypage?auth=setup", request.url));
  }

  // returnToを先に正規化してPKCE stateへ封入する。認証プロバイダから戻った後も、
  // ユーザー入力のURLをそのままLocationへ渡さないため、オープンリダイレクトを防げる。
  const returnTo = getSafeReturnTo(request.nextUrl.searchParams.get("next"));
  const signInUrl = await getSignInUrl({ returnTo });
  return NextResponse.redirect(signInUrl);
}
