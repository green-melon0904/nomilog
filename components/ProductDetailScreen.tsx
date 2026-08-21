"use client";

/**
 * 商品の評価集計、購入場所、似た味、レビューを一つの詳細画面で扱う。
 * 商品を見つけた直後に評価の理由確認からレビュー投稿まで進めるよう、関連情報を別ページへ
 * 分散させず、現在のカタログ商品にひも付けて一つの画面で扱う。
 */

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Share2 } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { RatingStars } from "@/components/RatingStars";
import { ScoreMeter } from "@/components/ScoreMeter";
import { ReviewLikeButton } from "@/components/ReviewLikeButton";
import { ReviewReportButton } from "@/components/ReviewReportButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import {
  carbonationLabels,
  calculateStats,
  formatDate,
  getCategoryName,
  getSimilarProducts
} from "@/lib/nomilog-data";
import { useNomilogReviews } from "@/components/useNomilogReviews";
import { useNomilogProducts } from "@/components/useNomilogProducts";

/**
 * 指定商品の詳細を表示する。
 * レビューが追加された直後もローカル配列から平均値を再計算し、DB集計の反映待ちを画面へ出さない。
 */
export function ProductDetailScreen({ productId }: { productId: string }) {
  const reviews = useNomilogReviews();
  const catalog = useNomilogProducts();
  const product = catalog.find((item) => item.id === productId);

  if (!product) {
    return (
      <div className="screen pt-5">
        <div className="soft-card p-4">
          <p className="text-[14px] leading-relaxed text-[var(--muted)]">検索画面から別の商品を探してください。</p>
        </div>
      </div>
    );
  }

  const selectedProduct = product;
  const productReviews = reviews
    .filter((review) => review.productId === product.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  // ローカル投稿とSupabase投稿を同じ配列から集計する。投稿直後にDBの集計トリガーを待つと
  // 数値だけ古く見えるため、表示上の最新値はクライアントでも再計算する。
  const stats = calculateStats(product.id, reviews);
  const locations = Array.from(new Set(productReviews.map((review) => review.purchaseLocation)));
  // 推薦理由を説明できるよう、MVPでは甘さと炭酸の距離だけを使い、画面幅に合わせて4件を見せる。
  const similarProducts = getSimilarProducts(product.id, reviews, 4, catalog);

  async function shareProduct() {
    // Web Share APIが使えるiPhone Safariでは共有シートを開き、それ以外はURLをコピーする。
    // 共有機能がないブラウザでもボタンが無反応にならないよう、クリップボードを代替にする。
    const shareData = {
      title: selectedProduct.name,
      text: `${selectedProduct.name}をのみログで見る`,
      url: window.location.href
    };
    if (navigator.share) {
      await navigator.share(shareData).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(window.location.href);
  }

  return (
    <div className="screen pb-8">
      <header className="flex h-16 items-center justify-between">
        <Link href="/" aria-label="ホームへ戻る" className="tap-target grid w-11 place-items-center">
          <ArrowLeft className="h-6 w-6" strokeWidth={1.8} />
        </Link>
        <div className="flex items-center gap-1">
          <FavoriteButton productId={product.id} returnTo={`/products/${product.id}`} compact />
          <button type="button" onClick={shareProduct} aria-label="商品を共有" className="tap-target grid w-11 place-items-center">
            <Share2 className="h-6 w-6" strokeWidth={1.7} />
          </button>
        </div>
      </header>

      <div className="relative mx-auto h-[244px] w-full">
        <Image src={product.imageUrl} alt={product.name} fill priority sizes="420px" className="object-contain p-2" />
      </div>

      <section className="mt-2">
        <h1 className="text-[20px] leading-[1.4]">{product.name}</h1>
        <span className="mt-1.5 inline-flex rounded-[4px] bg-[var(--accent-soft)] px-2 py-1 text-[11px] text-[var(--accent-strong)]">
          {getCategoryName(product.categoryId)}飲料
        </span>
        <div className="mt-2 flex items-center gap-2">
          <RatingStars value={stats.avgRating} size="md" />
          <span className="text-[17px]">{stats.avgRating.toFixed(1)}</span>
          <span className="text-[11px] text-[var(--muted)]">（{stats.reviewCount}件のレビュー）</span>
        </div>
      </section>

      <section className="app-card mt-3 space-y-3 p-3.5">
        <ScoreMeter label="甘さ" value={stats.avgSweetness} startLabel="控えめ" endLabel="甘い" />
        <ScoreMeter label="炭酸" value={stats.avgCarbonation} max={4} startLabel="弱い" endLabel="強い" />
        <ScoreMeter label="コスパ" value={stats.avgCostPerformance} startLabel="悪い" endLabel="良い" />
      </section>

      <section className="mt-5">
        <h2 className="text-[16px]">購入場所</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {locations.length > 0 ? (
            locations.map((location) => (
              <span key={location} className="rounded-[6px] border border-[#a9d6f4] px-3 py-1.5 text-[12px] text-[var(--accent-strong)]">
                {location}
              </span>
            ))
          ) : (
            <span className="text-[12px] text-[var(--muted)]">まだ購入場所レビューがありません</span>
          )}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[17px]">似ているドリンク</h2>
          <Link href="/search" className="inline-flex items-center text-[12px] text-[var(--accent)]">
            すべて見る <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {similarProducts.map((item) => (
            <div key={item.id} className="w-[132px] shrink-0">
              <ProductCard product={item} compact />
            </div>
          ))}
        </div>
      </section>

      <Link
        href={`/reviews/new?productId=${product.id}`}
        className="tap-target mt-6 flex items-center justify-center rounded-[8px] bg-[var(--accent)] px-4 text-[15px] !text-white"
      >
        このドリンクをレビューする
      </Link>

      <section className="mt-7">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-[17px]">レビュー</h2>
          <span className="text-[11px] text-[var(--muted)]">新しい順</span>
        </div>
        <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {productReviews.map((review) => (
            <article key={review.id} className="py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px]">{review.userName}</p>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">{formatDate(review.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <RatingStars value={review.rating} />
                  <ReviewLikeButton reviewId={review.id} initialCount={review.likeCount} />
                  <ReviewReportButton reviewId={review.id} />
                </div>
              </div>
              <p className="mt-2 text-[13px] font-normal leading-[1.65]">{review.comment}</p>
              {review.imageUrl ? (
                // ユーザー投稿画像はData URLまたはStorage URLのため、動的なsrcをそのまま表示する。
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={review.imageUrl}
                  alt="レビュー写真"
                  loading="lazy"
                  decoding="async"
                  className="mt-3 h-36 w-full rounded-[8px] object-cover"
                />
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Tag>{review.purchaseLocation}</Tag>
                <Tag>{carbonationLabels[review.carbonation]}</Tag>
                {review.scene.map((scene) => <Tag key={scene}>{scene}</Tag>)}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-[4px] bg-[var(--surface-soft)] px-2 py-1 text-[10px] text-[var(--muted)]">{children}</span>;
}
