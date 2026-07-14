/**
 * AuthKitのセッション終了後、マイページへ戻すログアウト入口。
 * ログアウト直後に公開画面へ放置せず、認証前後の状態を確認できるマイページへ戻すことで
 * Cookie削除後の表示切り替えをユーザーが把握しやすくする。
 */
import { signOut } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { hasWorkOSAuthConfig } from "@/lib/workos";

/**
 * ローカルCookieとWorkOS側のセッションをまとめて終了する。
 * 片方だけを消すと次回アクセス時にAuthKit側のログインが復活する可能性があるため、SDKの
 * signOutへ終了処理を集約する。
 */
export async function GET(request: NextRequest) {
  const returnTo = new URL("/mypage", request.url).toString();
  if (!hasWorkOSAuthConfig()) return NextResponse.redirect(returnTo);

  // アプリ側Cookieだけ削除するとWorkOS側のセッションが残るため、両方をSDKで同時に終了する。
  await signOut({ returnTo });
  return NextResponse.redirect(returnTo);
}
