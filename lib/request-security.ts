/**
 * Cookieを使う状態変更リクエストが、実際にアクセスされた同一オリジンから来たか確認する。
 *
 * NextRequest.nextUrl.originは開発サーバーやリバースプロキシの構成によって固定のホスト名を
 * 示すことがある。その値だけを正解にすると、ブラウザが127.0.0.1で開いているのにlocalhostを
 * 比較対象にしてしまい、正当な保存操作まで403になる。そこで転送ヘッダーまたはHostヘッダーから
 * サーバーが受信した公開先を組み立て、Originと比較する。Originがないリクエストも拒否する。
 */
import { NextRequest } from "next/server";

export function isSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost ?? request.headers.get("host");
  if (!host) return false;

  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const protocol = forwardedProto ?? request.nextUrl.protocol.replace(":", "");
  if (protocol !== "http" && protocol !== "https") return false;

  try {
    const receivedOrigin = new URL(origin);
    const receivedHost = new URL(`${protocol}://${host}`);

    // URL.originで標準化して比較し、https://example.com:443のような既定ポート差を正しく扱う。
    return receivedOrigin.origin === receivedHost.origin;
  } catch {
    // OriginやHostが壊れた値なら、認証処理へ進めず安全側へ倒す。
    return false;
  }
}

function firstHeaderValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}
