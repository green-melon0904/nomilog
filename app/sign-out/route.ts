/**
 * 旧バージョンの画面に残ったGETログアウトリンクを、安全にマイページへ戻す互換ルート。
 *
 * GETはNext.jsの先読みやクローラーでも実行されるため、ここでは認証状態を変更しない。
 * 実際のログアウトは、利用者が明示的に送信するsignOutActionのPOSTだけに限定する。
 */
import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const returnTo = new URL("/mypage", request.url).toString();
  const response = NextResponse.redirect(returnTo, 303);

  // 古いGET応答がCDNやブラウザーに残り、後から意図しない遷移を再現しないよう保存を禁止する。
  response.headers.set("Cache-Control", "no-store");
  return response;
}
