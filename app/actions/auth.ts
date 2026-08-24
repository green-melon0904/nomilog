"use server";

/**
 * ログアウトを、利用者がボタンを押したときだけ実行するServer Action。
 *
 * GETリンクでログアウトすると、Next.jsの先読みや検索クローラーがリンクを取得しただけで
 * セッションを終了できてしまう。フォームのPOSTとして実行することで、画面表示のための
 * 自動通信と、利用者が意図した状態変更を分離する。
 */
import { signOut } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { hasWorkOSAuthConfig } from "@/lib/workos";

export async function signOutAction() {
  if (!hasWorkOSAuthConfig()) {
    // 認証未設定のローカル確認では外部ログアウト先を作れないため、公開マイページへ戻す。
    redirect("/mypage");
  }

  const returnTo = new URL("/mypage", process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI).toString();

  // AuthKitへ処理を集約し、暗号化Cookieの削除とWorkOS側セッションの終了を片方だけ残さない。
  await signOut({ returnTo });
}
