/** AuthKitのセッション終了後、マイページへ戻すログアウト入口。 */
import { signOut } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { hasWorkOSAuthConfig } from "@/lib/workos";

/** ローカルCookieとWorkOS側のセッションをまとめて終了する。 */
export async function GET(request: NextRequest) {
  const returnTo = new URL("/mypage", request.url).toString();
  if (!hasWorkOSAuthConfig()) return NextResponse.redirect(returnTo);

  // アプリ側Cookieだけ削除するとWorkOS側のセッションが残るため、両方をSDKで同時に終了する。
  await signOut({ returnTo });
  return NextResponse.redirect(returnTo);
}
