"use client";

import { Eye, EyeOff, Inbox, MessageSquareWarning, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { MobilePageHeader } from "@/components/MobilePageHeader";

type Report = { id: string; reviewId: string; reason: string; details: string; status: string; createdAt: string; reporterName: string; reviewComment: string; productName: string; isHidden: boolean };
type Inquiry = { id: string; email: string; category: string; message: string; status: string; created_at: string };

const reasonLabels: Record<string, string> = { spam: "スパム・宣伝", harassment: "嫌がらせ", inappropriate: "不適切な内容", rights: "権利侵害", other: "その他" };
const inquiryCategoryLabels: Record<string, string> = { general: "サービス", account: "アカウント", content: "掲載内容", privacy: "プライバシー", other: "その他" };

/**
 * 管理者が通報レビューの非公開化と問い合わせ対応状況を管理する画面。
 * 一覧更新後はAPIから再取得し、楽観値だけを残さずRLS適用後のDB状態を表示する。
 */
export function AdminModerationScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await readModerationData();
    setReports(result.reports);
    setInquiries(result.inquiries);
  }, []);

  useEffect(() => {
    let active = true;
    // 通信結果のコールバック内だけで状態を更新し、Effect開始直後の余分な再描画を発生させない。
    void readModerationData()
      .then((result) => {
        if (!active) return;
        setReports(result.reports);
        setInquiries(result.inquiries);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "運営データを読み込めませんでした。");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function update(id: string, payload: Record<string, string>) {
    setUpdatingId(id);
    setError(null);
    try {
      const response = await fetch("/api/admin/moderation", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "運営操作を完了できませんでした。");
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "運営操作を完了できませんでした。");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="screen pb-8">
      <MobilePageHeader title="運営管理" />
      <div className="mt-5 flex items-center gap-2 text-[var(--accent)]"><ShieldCheck className="h-5 w-5" strokeWidth={1.8} /><p className="text-[13px]">管理者のみ表示されています</p></div>
      {error ? <p role="alert" className="mt-4 rounded-[8px] bg-[#fff1f2] px-3 py-2 text-[12px] font-normal text-[#c53d47]">{error}</p> : null}
      {loading ? <div className="mt-5 h-28 animate-pulse rounded-[8px] bg-[var(--surface-soft)]" /> : (
        <>
          <section className="pt-7">
            <h2 className="flex items-center gap-2 text-[17px]"><MessageSquareWarning className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.8} />レビュー通報</h2>
            <div className="mt-3 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {reports.length === 0 ? <p className="py-8 text-center text-[12px] font-normal text-[var(--muted)]">通報はありません</p> : reports.map((report) => (
                <article key={report.id} className="py-4">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-[13px]">{report.productName}</p><p className="mt-1 text-[11px] font-normal text-[var(--muted)]">{reasonLabels[report.reason] ?? report.reason} / {report.status}</p></div><span className={`rounded-full px-2 py-1 text-[10px] ${report.isHidden ? "bg-[#fff1f2] text-[#c53d47]" : "bg-[var(--accent-soft)] text-[var(--accent)]"}`}>{report.isHidden ? "非公開" : "公開中"}</span></div>
                  <p className="mt-3 text-[12px] font-normal leading-relaxed">{report.reviewComment}</p>
                  {report.details ? <p className="mt-2 rounded-[6px] bg-[var(--surface-soft)] px-3 py-2 text-[11px] font-normal leading-relaxed text-[var(--muted)]">補足: {report.details}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={updatingId === report.id} onClick={() => void update(report.id, { action: report.isHidden ? "restore_review" : "hide_review", reviewId: report.reviewId })} className={`tap-target inline-flex items-center gap-1.5 rounded-[8px] px-3 text-[12px] ${report.isHidden ? "border border-[var(--accent)] text-[var(--accent)]" : "bg-[#d74755] !text-white"}`}>{report.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}{report.isHidden ? "公開へ戻す" : "非公開にする"}</button>
                    {report.status === "pending" ? <button type="button" disabled={updatingId === report.id} onClick={() => void update(report.id, { action: "dismiss_report", reportId: report.id })} className="tap-target rounded-[8px] border border-[var(--border)] px-3 text-[12px]">問題なし</button> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="pt-8">
            <h2 className="flex items-center gap-2 text-[17px]"><Inbox className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.8} />お問い合わせ</h2>
            <div className="mt-3 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {inquiries.length === 0 ? <p className="py-8 text-center text-[12px] font-normal text-[var(--muted)]">お問い合わせはありません</p> : inquiries.map((inquiry) => (
                <article key={inquiry.id} className="py-4">
                  <div className="flex items-center justify-between gap-3"><p className="text-[12px]">{inquiryCategoryLabels[inquiry.category] ?? inquiry.category}</p><span className="text-[10px] font-normal text-[var(--muted)]">{inquiry.status}</span></div>
                  <p className="mt-2 break-all text-[11px] font-normal text-[var(--muted)]">{inquiry.email}</p><p className="mt-2 whitespace-pre-wrap text-[12px] font-normal leading-relaxed">{inquiry.message}</p>
                  {inquiry.status !== "resolved" ? <button type="button" disabled={updatingId === inquiry.id} onClick={() => void update(inquiry.id, { action: "update_inquiry", inquiryId: inquiry.id, status: "resolved" })} className="tap-target mt-3 rounded-[8px] bg-[var(--accent)] px-3 text-[12px] !text-white">対応済みにする</button> : null}
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

async function readModerationData() {
  const response = await fetch("/api/admin/moderation", { cache: "no-store" });
  const result = await response.json().catch(() => null) as { reports?: Report[]; inquiries?: Inquiry[]; error?: string } | null;
  if (!response.ok) throw new Error(result?.error ?? "運営データを読み込めませんでした。");
  return { reports: result?.reports ?? [], inquiries: result?.inquiries ?? [] };
}
