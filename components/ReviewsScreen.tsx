"use client";

/** 最新レビューを一覧表示する画面。商品マスタにない飲み物も名前だけで残す。 */

import { BrandHeader } from "@/components/BrandHeader";
import { ReviewListCard } from "@/components/ReviewListCard";
import { useNomilogReviews } from "@/components/useNomilogReviews";
import { useNomilogProducts } from "@/components/useNomilogProducts";

/** 投稿日時の新しい順でレビューを並べ、登録済み商品だけ詳細リンクを付ける。 */
export function ReviewsScreen() {
  const reviews = useNomilogReviews();
  const catalog = useNomilogProducts();
  // 未登録レビューを除外すると投稿者の記録が消えるため、商品リンクの有無だけを商品マスタの
  // 照合結果で分け、レビュー自体はすべて一覧へ残す。
  const latestReviews = [...reviews]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((review) => ({ review, product: catalog.find((item) => item.id === review.productId) }));

  return (
    <div className="screen">
      <BrandHeader />
      <div className="mb-4 flex items-end justify-between border-b border-[var(--border)] pb-3">
        <h1 className="text-[19px]">最新のレビュー</h1>
        <span className="text-[11px] text-[var(--muted)]">{latestReviews.length}件</span>
      </div>

      <div className="space-y-2 pb-4">
        {latestReviews.map(({ review, product }) => <ReviewListCard key={review.id} review={review} product={product} />)}
      </div>
    </div>
  );
}
