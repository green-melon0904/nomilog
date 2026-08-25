/**
 * 公開切替中に、参照系APIを残したまま書き込みAPIだけを停止する判定。
 *
 * 画面側のボタン無効化だけでは直接HTTPリクエストを防げないため、全APIの入口となるProxyで
 * HTTPメソッドを検査する。値は明示的な`1`だけを有効とし、未設定や入力ミスで公開中の書き込みを
 * 意図せず停止しない。
 */
const readOnlyMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function shouldBlockApiWrite(pathname: string, method: string, maintenanceValue: string | undefined) {
  return maintenanceValue === "1" && pathname.startsWith("/api/") && !readOnlyMethods.has(method.toUpperCase());
}
