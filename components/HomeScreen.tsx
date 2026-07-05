"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { RatingStars } from "@/components/RatingStars";
import { SearchIcon } from "@/components/icons";
import { categories, enrichProducts, formatDate, getRanking, products } from "@/lib/nomilog-data";
import { useNomilogReviews } from "@/components/useNomilogReviews";

export function HomeScreen() {
  const reviews = useNomilogReviews();
  const ranking = getRanking(reviews, 3);
  const enriched = enrichProducts(reviews);
  const latestReviews = [...reviews].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 4);

  return (
    <div className="screen">
      <Header />

      <Link
        href="/search"
        className="tap-target mb-4 flex items-center gap-3 rounded-[8px] border border-[var(--border)] bg-white px-4 text-[16px] font-bold text-[var(--text)] shadow-sm"
      >
        <SearchIcon className="h-5 w-5 text-[var(--accent)]" />
        キーワード検索
      </Link>

      <div className="scrollbar-none -mx-1 mb-5 flex gap-2 overflow-x-auto px-1">
        {categories.map((category) => (
          <Link
            href={`/search?category=${category.slug}`}
            key={category.id}
            className="tap-target inline-flex shrink-0 items-center rounded-full border border-[var(--border)] bg-white px-4 text-[14px] font-black text-[var(--accent-strong)] shadow-sm"
          >
            {category.name}
          </Link>
        ))}
      </div>

      <section className="mb-6">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-[19px] font-black tracking-[0]">今週のランキング</h2>
          <Link href="/search?sort=popular" className="text-[13px] font-black text-[var(--accent-strong)]">
            すべて見る
          </Link>
        </div>
        <div className="space-y-2">
          {ranking.map((product, index) => (
            <Link
              href={`/products/${product.id}`}
              key={product.id}
              className="app-card grid grid-cols-[34px_1fr_auto] items-center gap-3 p-3"
            >
              <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-[var(--accent)] text-[15px] font-black text-white">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-black">{product.name}</span>
                <span className="text-[12px] font-bold text-[var(--muted)]">{product.reviewCount}件のレビュー</span>
              </span>
              <span className="text-right">
                <RatingStars value={product.avgRating} />
                <span className="block text-[12px] font-black">{product.avgRating.toFixed(1)}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-[19px] font-black tracking-[0]">新着レビュー</h2>
          <Link href="/reviews/new" className="text-[13px] font-black text-[var(--accent-strong)]">
            レビューを書く
          </Link>
        </div>
        <div className="space-y-3">
          {latestReviews.map((review) => {
            const product = products.find((item) => item.id === review.productId);
            if (!product) return null;
            const withStats = enriched.find((item) => item.id === product.id);
            return (
              <Link href={`/products/${product.id}`} key={review.id} className="app-card grid grid-cols-[82px_1fr] gap-3 overflow-hidden p-2">
                <ProductThumb src={product.imageUrl} alt={product.name} />
                <span className="min-w-0 py-1 pr-1">
                  <span className="block truncate text-[15px] font-black">{product.name}</span>
                  <span className="mt-1 block">
                    <RatingStars value={review.rating} />
                  </span>
                  <span className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[var(--muted)]">{review.comment}</span>
                  <span className="mt-2 flex items-center justify-between text-[12px] font-bold text-[var(--muted)]">
                    <span>{review.purchaseLocation}</span>
                    <span>{withStats?.reviewCount ?? 0}件 / {formatDate(review.createdAt)}</span>
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mb-3">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-[19px] font-black tracking-[0]">気になる一本</h2>
          <span className="text-[12px] font-bold text-[var(--muted)]">似た味で探せます</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {enriched.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      </section>
    </div>
  );
}

function ProductThumb({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="relative block h-[96px] overflow-hidden rounded-[8px] bg-[var(--surface-soft)]">
      {/* next/image cannot infer remote dimensions in this tiny repeated row as cleanly as fill. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-contain" />
    </span>
  );
}
