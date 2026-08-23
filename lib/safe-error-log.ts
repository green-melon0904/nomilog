/**
 * 外部SDKの例外を、秘密値や利用者入力を含まない運用ログへ変換する。
 *
 * messageやdetailsにはHTTPヘッダーや送信本文が反映される場合があるため保持しない。
 * 障害の分類に使える短い機械可読コードだけを、許可した文字種に限定して残す。
 */

export function createSafeErrorLog(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return { code: "unknown" };
  const code = (error as { code?: unknown }).code;
  return {
    code: typeof code === "string" && isSupportedErrorCode(code) ? code : "unknown"
  };
}

function isSupportedErrorCode(code: string) {
  // PostgreSQLは5文字のSQLSTATE、PostgRESTはPGRSTに3桁を続けるため、それ以外は診断値として保持しない。
  return /^[A-Z0-9]{5}$/.test(code) || /^PGRST[0-9]{3}$/.test(code);
}
