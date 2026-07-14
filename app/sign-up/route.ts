/** AuthKitの新規登録入口。ログインと同じ安全なreturnTo制約を使う。 */
import { getSignUpUrl } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { getSafeReturnTo } from "@/lib/auth-return-to";
import { hasWorkOSAuthConfig } from "@/lib/workos";

/** 新規登録開始URLを生成してAuthKitへリダイレクトする。 */
export async function GET(request: NextRequest) {
  if (!hasWorkOSAuthConfig()) {
    return NextResponse.redirect(new URL("/mypage?auth=setup", request.url));
  }

  // 新規登録もログインと同じreturnTo検証を通し、入口だけを分けて安全性の実装を共有する。
  const returnTo = getSafeReturnTo(request.nextUrl.searchParams.get("next"));
  const signUpUrl = await getSignUpUrl({ returnTo });
  return NextResponse.redirect(signUpUrl);
}
