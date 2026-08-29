"use client";

/**
 * 運営カタログに紐づく最新レビューを一覧表示する画面。
 * 仮運用では商品登録より先の投稿を許可しないため、一覧・商品詳細・ランキングが同じ商品集合を
 * 参照する。古い未登録行が残っていても、DB移行完了まで画面へ露出させない。
 */

import { BrandHeader } from "@/components/BrandHeader";
import { ReviewListCard } from "@/components/ReviewListCard";
import { useNomilogReviews } from "@/components/useNomilogReviews";
import { useNomilogProducts } from "@/components/useNomilogProducts";

/**
 * 投稿日時の新しい順でレビューを並べ、商品マスタが確認できる行だけを表示する。
 * Route HandlerとDB制約が今後の投稿を守る一方、移行の途中で古い行を表示しないため画面でも
 * 最終確認を残す。
 */
export function ReviewsScreen() {
  const reviews = useNomilogReviews();
  const catalog = useNomilogProducts();
  const latestReviews = reviews
    .flatMap((review) => {
      const product = catalog.find((item) => item.id === review.productId);
      return product ? [{ review, product }] : [];
    })
    .sort((a, b) => Date.parse(b.review.createdAt) - Date.parse(a.review.createdAt));

  return (
    <div className="screen">
      <BrandHeader />
      <div className="mb-4 flex items-end justify-between border-b border-[var(--border)] pb-3">
        <h1 className="text-[19px]">最新のレビュー</h1>
        <span className="text-[11px] text-[var(--muted)]">{latestReviews.length}件</span>
      </div>

      {latestReviews.length === 0 ? (
        <p className="py-12 text-center text-[13px] text-[var(--muted)]">まだレビューはありません</p>
      ) : (
        <div className="space-y-2 pb-4">
          {latestReviews.map(({ review, product }) => <ReviewListCard key={review.id} review={review} product={product} />)}
        </div>
      )}
    </div>
  );
}
