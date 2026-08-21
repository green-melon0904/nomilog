"use client";

/**
 * レビューカードから通報理由を選び、運営キューへ送る操作部品。
 * 通報理由の詳細をカード内へ常設せずモーダルに分け、普段の閲覧密度を保ちながら全レビューへ同じ導線を置く。
 */
import { Flag, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReportReason } from "@/lib/safety-input";

const reasonOptions: Array<{ value: ReportReason; label: string }> = [
  { value: "spam", label: "スパム・宣伝" },
  { value: "harassment", label: "嫌がらせ・攻撃的な内容" },
  { value: "inappropriate", label: "不適切な内容" },
  { value: "rights", label: "権利侵害" },
  { value: "other", label: "その他" }
];

export function ReviewReportButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, submitting]);

  function showDialog() {
    setError(null);
    setSent(false);
    setOpen(true);
  }

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/review-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, reason, details })
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (response.status === 401) {
        window.location.assign(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (!response.ok) throw new Error(result?.error ?? "通報を送信できませんでした。");
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "通報を送信できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button type="button" onClick={showDialog} aria-label="このレビューを通報" title="レビューを通報" className="tap-target grid min-w-11 place-items-center text-[var(--muted)]">
        <Flag className="h-4 w-4" strokeWidth={1.7} />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(22,25,29,0.35)] px-4 pb-4 pt-10 sm:items-center">
          <div role="dialog" aria-modal="true" aria-labelledby={`report-title-${reviewId}`} className="app-card w-full max-w-[420px] p-5 shadow-[0_18px_45px_rgba(17,24,39,0.2)]">
            <div className="flex items-center justify-between gap-3">
              <h2 id={`report-title-${reviewId}`} className="text-[18px]">レビューを通報</h2>
              <button type="button" onClick={() => setOpen(false)} disabled={submitting} aria-label="通報画面を閉じる" className="tap-target grid w-11 place-items-center rounded-full text-[var(--muted)]">
                <X className="h-5 w-5" strokeWidth={1.8} />
              </button>
            </div>
            {sent ? (
              <div className="py-6 text-center">
                <p className="text-[16px]">通報を受け付けました</p>
                <p className="mt-2 text-[12px] font-normal leading-relaxed text-[var(--muted)]">運営が内容を確認します。</p>
                <button type="button" onClick={() => setOpen(false)} className="tap-target mt-5 w-full rounded-[10px] bg-[var(--accent)] px-4 text-[14px] !text-white">閉じる</button>
              </div>
            ) : (
              <form onSubmit={submitReport} className="mt-4">
                <label htmlFor={`report-reason-${reviewId}`} className="text-[13px]">理由</label>
                <select id={`report-reason-${reviewId}`} value={reason} onChange={(event) => setReason(event.target.value as ReportReason)} className="mt-2 min-h-11 w-full rounded-[8px] border border-[var(--border)] bg-white px-3 text-[16px] outline-none focus:border-[var(--accent)]">
                  {reasonOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <label htmlFor={`report-details-${reviewId}`} className="mt-4 block text-[13px]">補足（任意）</label>
                <textarea id={`report-details-${reviewId}`} value={details} onChange={(event) => setDetails(event.target.value)} maxLength={300} rows={4} placeholder="運営が確認しやすい情報があれば入力してください" className="mt-2 min-h-[110px] w-full resize-none rounded-[8px] border border-[var(--border)] bg-white px-3 py-3 text-[16px] font-normal leading-relaxed outline-none focus:border-[var(--accent)]" />
                <p className="mt-1 text-right text-[11px] font-normal text-[var(--muted)]">{details.length}/300</p>
                {error ? <p role="alert" className="mt-3 rounded-[8px] bg-[#fff1f2] px-3 py-2 text-[12px] text-[#c53d47]">{error}</p> : null}
                <button type="submit" disabled={submitting} className="tap-target mt-4 w-full rounded-[10px] bg-[var(--accent)] px-4 text-[14px] !text-white disabled:opacity-60">{submitting ? "送信中…" : "通報する"}</button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
