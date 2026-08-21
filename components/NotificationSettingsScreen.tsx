"use client";

import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { MobilePageHeader } from "@/components/MobilePageHeader";

/**
 * レビューへのいいね通知を、その場で保存できる設定画面。
 * OSのPush通知権限とは分け、現時点ではのみログ内の通知一覧へ表示するかだけを管理する。
 */
export function NotificationSettingsScreen() {
  const [enabled, setEnabled] = useState(true);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/notification-preferences", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => null) as { reviewLikesEnabled?: boolean; error?: string } | null;
        if (!response.ok) throw new Error(result?.error ?? "通知設定を読み込めませんでした。");
        if (active) {
          setEnabled(result?.reviewLikesEnabled ?? true);
          setStatus("ready");
        }
      })
      .catch((error) => {
        if (active) {
          setMessage(error instanceof Error ? error.message : "通知設定を読み込めませんでした。");
          setStatus("error");
        }
      });
    return () => { active = false; };
  }, []);

  async function changeSetting(nextEnabled: boolean) {
    const previous = enabled;
    setEnabled(nextEnabled);
    setStatus("saving");
    setMessage(null);
    try {
      const response = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewLikesEnabled: nextEnabled })
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "通知設定を保存できませんでした。");
      setStatus("ready");
      setMessage("保存しました。");
    } catch (error) {
      setEnabled(previous);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "通知設定を保存できませんでした。");
    }
  }

  return (
    <div className="screen pb-8">
      <MobilePageHeader title="通知設定" />
      <section className="pt-5">
        <div className="flex min-h-[84px] items-center gap-3 border-b border-[var(--border)] py-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]"><BellRing className="h-5 w-5" strokeWidth={1.8} /></span>
          <label htmlFor="review-like-notifications" className="min-w-0 flex-1">
            <span className="block text-[15px]">レビューへのいいね</span>
            <span className="mt-1 block text-[11px] font-normal leading-relaxed text-[var(--muted)]">あなたのレビューにいいねが付いたとき、のみログ内でお知らせします。</span>
          </label>
          <button id="review-like-notifications" type="button" role="switch" aria-checked={enabled} aria-label="レビューへのいいね通知" disabled={status !== "ready"} onClick={() => void changeSetting(!enabled)} className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${enabled ? "bg-[var(--accent)]" : "bg-[#cfd5dc]"}`}>
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-0 left-6" : "left-1"}`} />
          </button>
        </div>
        {status === "loading" ? <p className="mt-4 text-[12px] font-normal text-[var(--muted)]">設定を読み込み中…</p> : null}
        {message ? <p role={status === "error" ? "alert" : "status"} className={`mt-4 text-[12px] font-normal ${status === "error" ? "text-[#c53d47]" : "text-[var(--muted)]"}`}>{message}</p> : null}
      </section>
    </div>
  );
}
