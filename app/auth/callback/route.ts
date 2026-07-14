/**
 * AuthKitの認証結果を検証し、暗号化Cookieを設定するコールバック。
 * codeやアクセストークンをクライアント側のページへ渡さず、SDKが検証したセッションだけを
 * HttpOnly Cookieへ保存することで、認証後のブラウザJavaScriptから秘密値を読めないようにする。
 */
import { handleAuth } from "@workos-inc/authkit-nextjs";

// AuthKitがPKCEのcode/stateを検証し、ブラウザへアクセストークンを渡さずHttpOnly Cookieを保存する。
// SDKがsealed stateからreturnToを復元するため、投稿画面から始めた認証も元の導線へ戻せる。
export const GET = handleAuth({ returnPathname: "/mypage" });
