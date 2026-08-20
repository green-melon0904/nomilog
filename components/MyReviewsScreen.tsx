"use client";

/**
 * ログインユーザーが投稿したレビューだけを一覧管理する画面。
 *
 * 所有者判定には変更可能な表示名ではなくWorkOS subjectを使う。編集・削除の最終認可は
 * Route HandlerとRLSで行い、この画面の絞り込みは本人の操作対象を分かりやすくするために使う。
 */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BrandHeader } from "@/components/BrandHeader";
import { OwnedReviewCard } from "@/components/OwnedReviewCard";
import { useNomilogProducts } from "@/components/useNomilogProducts";
import { useNomilogReviews } from "@/components/useNomilogReviews";
import { enrichProducts } from "@/lib/nomilog-data";
import { hasSupabaseEnv } from "@/lib/supabase";

export function MyReviewsScreen() {
  const reviews = useNomilogReviews();
  const catalog = useNomilogProducts();
  const remoteEnabled = hasSupabaseEnv();
  const [authStatus, setAuthStatus] = useState<"loading" | "signed-in" | "signed-out" | "unavailable">(remoteEnabled ? "loading" : "signed-in");
  const [userId, setUserId] = useState(remoteEnabled ? "" : "demo-user");
  const products = useMemo(() => enrichProducts(reviews, catalog), [catalog, reviews]);
  const myReviews = useMemo(
    () => reviews
      .filter((review) => review.userId === userId)
      .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt)),
    [reviews, userId]
  );

  useEffect(() => {
    if (!remoteEnabled) return;
    let active = true;
    void fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => response.json() as Promise<{ configured?: boolean; user?: { id?: string } | null }>)
      .then((data) => {
        if (!active) return;
        setUserId(data.user?.id ?? "");
        setAuthStatus(data.configured ? (data.user?.id ? "signed-in" : "signed-out") : "unavailable");
      })
      .catch(() => {
        if (active) setAuthStatus("unavailable");
      });
    return () => {
      active = false;
    };
  }, [remoteEnabled]);

  return (
    <div className="screen pb-8">
      <BrandHeader />
      <div className="mb-5 flex items-end justify-between border-b border-[var(--border)] pb-3">
        <div>
          <h1 className="text-[20px]">投稿したレビュー</h1>
          <p className="mt-1 text-[12px] font-normal text-[var(--muted)]">内容の編集と削除ができます。</p>
        </div>
        {authStatus === "signed-in" ? <span className="text-[11px] text-[var(--muted)]">{myReviews.length}件</span> : null}
      </div>

      {authStatus === "loading" ? (
        <div className="space-y-3" aria-label="レビューを読み込み中">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-[8px] bg-[var(--surface-soft)]" />)}
        </div>
      ) : authStatus === "signed-out" ? (
        <Message title="ログインすると自分のレビューを管理できます">
          <Link href="/sign-in?next=%2Fmypage%2Freviews" className="tap-target mt-4 inline-flex rounded-[8px] bg-[var(--accent)] px-5 text-[14px] !text-white">ログインする</Link>
        </Message>
      ) : authStatus === "unavailable" ? (
        <Message title="レビューを読み込めませんでした" />
      ) : myReviews.length === 0 ? (
        <Message title="投稿したレビューはまだありません">
          <Link href="/reviews/new" className="tap-target mt-4 inline-flex rounded-[8px] border border-[var(--accent)] px-5 text-[14px] text-[var(--accent)]">レビューを書く</Link>
        </Message>
      ) : (
        <div className="space-y-3">
          {myReviews.map((review) => {
            const product = products.find((item) => item.id === review.productId);
            return product ? <OwnedReviewCard key={review.id} review={review} product={product} /> : null;
          })}
        </div>
      )}
    </div>
  );
}

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return <section className="py-14 text-center"><p className="text-[15px] text-[var(--muted)]">{title}</p>{children}</section>;
}
