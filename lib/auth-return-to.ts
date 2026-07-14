/** 認証後に戻してよい固定ルート。外部URLや管理外ルートはここへ追加しない。 */
const allowedReturnPaths = new Set(["/mypage", "/reviews", "/reviews/new"]);

// AuthKitのreturnToはPKCEで保護されるが、入口のクエリもアプリ内パスだけに絞る。
// 外部URLやスキーム相対URLを受け入れると、認証後に別サイトへ誘導されるおそれがある。
/**
 * 認証入口から受け取ったreturnToをアプリ内パスへ正規化する。
 * 相対URLでもURLオブジェクトへ変換してoriginを確認し、オープンリダイレクトを防ぐ。
 */
export function getSafeReturnTo(value: string | null | undefined) {
  if (!value) return "/mypage";

  try {
    const baseUrl = new URL("https://nomilog.invalid");
    const parsed = new URL(value, baseUrl);
    if (parsed.origin !== baseUrl.origin) return "/mypage";
    // 商品詳細へ戻す場合も、パス形式を英数字とハイフンに限定してアプリ内URLだけを許可する。
    // 任意の外部URLやjavascriptスキームは、originチェックとこのパターンで受け付けない。
    const isProductPath = /^\/products\/[a-zA-Z0-9-]+$/.test(parsed.pathname);
    if (!allowedReturnPaths.has(parsed.pathname) && !isProductPath) return "/mypage";
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/mypage";
  }
}
