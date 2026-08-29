"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { signOutAction } from "@/app/actions/auth";
import { MobilePageHeader } from "@/components/MobilePageHeader";
import { accountDeletionConfirmation } from "@/lib/safety-input";

/**
 * 本人データと認証アカウントを完全削除する設定画面。
 * 取り消せない操作なので、影響説明・固定文言・送信直前の確認を重ね、通常設定から視覚的にも分離する。
 */
export function AccountSettingsScreen() {
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = confirmation === accountDeletionConfirmation;

  async function deleteAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || !window.confirm("アカウントと投稿データを完全に削除します。本当に続けますか？")) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation })
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "アカウントを削除できませんでした。");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "アカウントを削除できませんでした。");
      setDeleting(false);
      return;
    }

    // WorkOSのログアウトはNext.jsのredirectを送出する。API失敗用のcatchで捕まえると成功した削除を
    // エラー表示に変えてしまうため、削除完了後の遷移はtry/catchの外で実行する。
    await signOutAction();
  }

  return (
    <div className="screen pb-8">
      <MobilePageHeader title="アカウント管理" />
      <section className="pt-6">
        <div className="flex items-start gap-3 rounded-[8px] bg-[#fff7f7] p-4 text-[#a5303b]">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.8} />
          <div><h2 className="text-[15px]">アカウントを削除</h2><p className="mt-1 text-[12px] font-normal leading-relaxed">プロフィール、レビュー、画像、いいね、お気に入り、通知が削除されます。この操作は元に戻せません。</p></div>
        </div>
        <form onSubmit={deleteAccount} className="mt-6">
          <label htmlFor="delete-confirmation" className="text-[13px]">確認のため「{accountDeletionConfirmation}」と入力</label>
          <input id="delete-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" disabled={deleting} className="mt-2 min-h-11 w-full rounded-[8px] border border-[var(--border)] bg-white px-3 text-[16px] outline-none focus:border-[#d74755]" />
          {error ? <p role="alert" className="mt-3 rounded-[8px] bg-[#fff1f2] px-3 py-2 text-[12px] font-normal text-[#c53d47]">{error}</p> : null}
          <button type="submit" disabled={!ready || deleting} className="tap-target mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#d74755] px-4 text-[14px] !text-white disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" strokeWidth={1.8} />{deleting ? "削除中…" : "アカウントを完全に削除"}</button>
        </form>
      </section>
    </div>
  );
}
