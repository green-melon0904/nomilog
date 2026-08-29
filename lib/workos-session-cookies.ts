import { NextRequest, NextResponse } from "next/server.js";

/**
 * WorkOSユーザー削除後の端末セッションを、外部リダイレクトなしで破棄する。
 * Cookieは作成時と同じpath・domainを指定し、Safariを含むブラウザーで確実に期限切れにする。
 */
export function createAccountDeletedResponse(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const sessionCookieName = process.env.WORKOS_COOKIE_NAME?.trim() || "wos-session";
  const cookieDomain = process.env.WORKOS_COOKIE_DOMAIN?.trim();
  const configuredSameSite = process.env.WORKOS_COOKIE_SAMESITE?.toLowerCase();
  const sameSite = configuredSameSite === "strict" || configuredSameSite === "none" ? configuredSameSite : "lax";
  const secure = sameSite === "none" || request.nextUrl.protocol === "https:";
  const cookieNames = new Set([
    sessionCookieName,
    "workos-access-token",
    ...request.cookies.getAll()
      .map(({ name }) => name)
      .filter((name) => name.startsWith("wos-auth-verifier"))
  ]);

  for (const name of cookieNames) {
    response.cookies.set({
      name,
      value: "",
      expires: new Date(0),
      maxAge: 0,
      path: "/",
      httpOnly: name !== "workos-access-token",
      sameSite,
      secure,
      ...(cookieDomain ? { domain: cookieDomain } : {})
    });
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}
