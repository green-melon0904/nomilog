/**
 * WorkOS AuthKitのセッション更新を、設定済み環境でだけNext.jsの入口へ組み込む。
 * 開発中に環境変数が未入力でも公開画面を確認できるよう、AuthKitを常に実行する構成にはせず、
 * 認証設定の有無をこの入口で一度だけ判断する。
 */
import { authkitProxy } from "@workos-inc/authkit-nextjs";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { hasWorkOSAuthConfig } from "@/lib/workos";

const workosProxy = authkitProxy();

/**
 * 公開閲覧を止めず、WorkOS設定後だけAuthKitの認証処理を実行する。
 * AuthKitの設定不備はログイン操作へだけ影響させ、匿名で見られる商品・レビュー閲覧まで
 * Middlewareのエラーで止めない。
 */
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  // 未設定時にAuthKitを呼ぶと公開画面まで認証エラーになるため、設定完了を起動条件にする。
  if (!hasWorkOSAuthConfig()) return NextResponse.next();
  return workosProxy(request, event);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
