"use client";

import { Bell, CheckCheck, ChevronRight, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { MobilePageHeader } from "@/components/MobilePageHeader";

type NotificationItem = {
  id: string;
  readAt?: string | null;
  createdAt: string;
  reviewId: string;
  productId?: string;
  productName: string;
  actorName: string;
};

/**
 * レビューに付いたいいねを新しい順に表示し、個別または一括で既読にする。
 * 既読更新後の遷移先はレビュー単独URLを増やさず、該当商品の詳細へ戻して文脈を確認できるようにする。
 */
export function NotificationsScreen() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/notifications", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => null) as { notifications?: NotificationItem[]; error?: string } | null;
        if (!response.ok) throw new Error(result?.error ?? "通知を読み込めませんでした。");
        if (active) setItems(result?.notifications ?? []);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "通知を読み込めませんでした。");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function markRead(notificationId?: string) {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notificationId ? { notificationId } : { markAll: true })
    });
    const result = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) throw new Error(result?.error ?? "既読状態を更新できませんでした。");
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => !notificationId || item.id === notificationId ? { ...item, readAt } : item));
  }

  async function openNotification(item: NotificationItem) {
    try {
      if (!item.readAt) await markRead(item.id);
      window.location.assign(item.productId ? `/products/${item.productId}` : "/reviews");
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "通知を開けませんでした。");
    }
  }

  const hasUnread = items.some((item) => !item.readAt);

  return (
    <div className="screen pb-8">
      <MobilePageHeader title="通知" />
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-[var(--border)]">
        <p className="text-[12px] font-normal text-[var(--muted)]">新しい順</p>
        {hasUnread ? (
          <button type="button" onClick={() => void markRead().catch((markError) => setError(markError instanceof Error ? markError.message : "既読状態を更新できませんでした。"))} className="tap-target inline-flex items-center gap-1.5 text-[12px] text-[var(--accent)]">
            <CheckCheck className="h-4 w-4" strokeWidth={1.8} />すべて既読
          </button>
        ) : null}
      </div>
      {loading ? <div className="space-y-3 pt-4"><div className="h-20 animate-pulse rounded-[8px] bg-[var(--surface-soft)]" /><div className="h-20 animate-pulse rounded-[8px] bg-[var(--surface-soft)]" /></div> : null}
      {error ? <p role="alert" className="mt-4 rounded-[8px] bg-[#fff1f2] px-3 py-2 text-[12px] font-normal text-[#c53d47]">{error}</p> : null}
      {!loading && items.length === 0 ? (
        <div className="py-16 text-center text-[var(--muted)]">
          <Bell className="mx-auto h-9 w-9" strokeWidth={1.5} />
          <p className="mt-3 text-[14px]">まだ通知はありません</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => void openNotification(item)} className={`flex min-h-[86px] w-full items-center gap-3 py-3 text-left ${item.readAt ? "bg-white" : "bg-[var(--accent-soft)]/45"}`}>
              <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#ef4c5d] shadow-[0_1px_5px_rgba(17,24,39,0.08)]"><Heart className="h-5 w-5 fill-current" strokeWidth={1.7} />{!item.readAt ? <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-[var(--accent)] ring-2 ring-white" /> : null}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] leading-relaxed"><strong>{item.actorName}</strong>さんが「{item.productName}」のレビューにいいねしました。</span>
                <span className="mt-1 block text-[10px] font-normal text-[var(--muted)]">{formatNotificationDate(item.createdAt)}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-[var(--muted)]" strokeWidth={1.7} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatNotificationDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
