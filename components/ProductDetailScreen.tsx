"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { RatingStars } from "@/components/RatingStars";
import { ScoreMeter } from "@/components/ScoreMeter";
import {
  carbonationLabels,
  calculateStats,
  formatDate,
  getCategoryName,
  getSimilarProducts,
  products
} from "@/lib/nomilog-data";
import { useNomilogReviews } from "@/components/useNomilogReviews";

export function ProductDetailScreen({ productId }: { productId: string }) {
  const reviews = useNomilogReviews();
  const product = products.find((item) => item.id === productId);

  if (!product) {
    return (
      <div className="screen">
        <Header title="商品が見つかりません" backHref="/search" action="none" />
        <div className="soft-card p-4">
          <p className="text-[14px] leading-relaxed text-[var(--muted)]">検索画面から別の商品を探してください。</p>
        </div>
      </div>
    );
  }

  const productReviews = reviews
    .filter((review) => review.productId === product.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  // 表示用の平均値はレビュー一覧から都度計算する。Supabase利用時はDBにも集計値を持つが、
  // ここではローカルレビューとリモートレビューを混ぜた現在の画面状態を正として扱う。
  const stats = calculateStats(product.id, reviews);
  const locations = Array.from(new Set(productReviews.map((review) => review.purchaseLocation)));
  // 「似た味」はMVP仕様どおり、甘さと炭酸の平均値が近い商品を優先して表示する。
  // 味の近さを説明しやすくするため、まずは2軸だけに絞ったシンプルなレコメンドにしている。
  const similarProducts = getSimilarProducts(product.id, reviews, 4);

  return (
    <div className="screen">
      <Header title={product.name} backHref="/search" action="none" />

      <section className="app-card mb-4 overflow-hidden">
        <div className="relative h-[230px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain" />
        </div>
        <div className="p-4">
          <p className="text-[24px] font-black leading-tight tracking-[0]">{product.name}</p>
          <p className="mt-1 text-[13px] font-bold text-[var(--muted)]">
            {product.maker} / {getCategoryName(product.categoryId)}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <RatingStars value={stats.avgRating} size="md" />
              <p className="mt-1 text-[13px] font-black">{stats.avgRating.toFixed(1)}点</p>
            </div>
            <p className="rounded-[8px] bg-[var(--surface-soft)] px-3 py-2 text-[13px] font-black text-[var(--accent-strong)]">
              {stats.reviewCount}件のレビュー
            </p>
          </div>
        </div>
      </section>

      <section className="app-card mb-4 space-y-3 p-4">
        <h2 className="text-[17px] font-black">平均スコア</h2>
        <ScoreMeter label="甘さ" value={stats.avgSweetness} />
        <ScoreMeter label="炭酸" value={stats.avgCarbonation} max={4} />
        <ScoreMeter label="コスパ" value={stats.avgCostPerformance} />
      </section>

      <section className="app-card mb-4 p-4">
        <h2 className="text-[17px] font-black">買える場所</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {locations.length > 0 ? (
            locations.map((location) => (
              <span key={location} className="rounded-full border border-[var(--border)] bg-white px-3 py-2 text-[13px] font-black">
                {location}
              </span>
            ))
          ) : (
            <span className="text-[13px] font-bold text-[var(--muted)]">まだ購入場所レビューがありません</span>
          )}
        </div>
      </section>

      <Link
        href={`/reviews/new?productId=${product.id}`}
        className="tap-target mb-5 flex items-center justify-center rounded-[8px] bg-[var(--accent)] px-4 text-[16px] font-black text-white shadow-sm"
      >
        レビューを書く
      </Link>

      <section className="mb-5">
        <h2 className="mb-3 text-[19px] font-black tracking-[0]">レビュー一覧</h2>
        <div className="space-y-3">
          {productReviews.map((review) => (
            <article key={review.id} className="app-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-black">{review.userName}</p>
                  <p className="mt-1 text-[12px] font-bold text-[var(--muted)]">{formatDate(review.createdAt)}</p>
                </div>
                <RatingStars value={review.rating} />
              </div>
              <p className="mt-3 text-[14px] leading-relaxed">{review.comment}</p>
              {review.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={review.imageUrl} alt="レビュー写真" className="mt-3 h-36 w-full rounded-[8px] object-cover" />
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Tag>{review.purchaseLocation}</Tag>
                <Tag>{carbonationLabels[review.carbonation]}</Tag>
                {review.scene.map((scene) => (
                  <Tag key={scene}>{scene}</Tag>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-2">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-[19px] font-black tracking-[0]">似た味の商品</h2>
          <span className="text-[12px] font-bold text-[var(--muted)]">甘さ・炭酸で比較</span>
        </div>
        <div className="scrollbar-none -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {similarProducts.map((item) => (
            <div key={item.id} className="w-[170px] shrink-0">
              <ProductCard product={item} compact />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-[12px] font-black text-[var(--accent-strong)]">{children}</span>;
}
