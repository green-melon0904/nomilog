/**
 * WorkOS AuthKitを起動できる設定がそろっているか確認する。
 * 秘密値をNEXT_PUBLIC_へ出さず、設定途中は公開閲覧だけを継続できるようbooleanで判定する。
 */
export function hasWorkOSAuthConfig() {
  const cookiePassword = process.env.WORKOS_COOKIE_PASSWORD;

  // Cookie暗号化キーが短いと設定済みに見えてもセッション保護が弱くなるため、最低32文字を必須にする。
  return Boolean(
    process.env.WORKOS_CLIENT_ID &&
      process.env.WORKOS_API_KEY &&
      cookiePassword &&
      cookiePassword.length >= 32 &&
      process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI
  );
}
