"use client";

/**
 * 検索・ランキング・新着レビューを一つの入口へまとめたホーム画面。
 * 初回訪問で目的が決まっていないユーザーでも、検索・人気商品・他人のレビューのどこから
 * でも飲み物探しを始められるよう、主要な発見導線を同じスクロール内に置く。
 */

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Crown, Search, Star } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { ReviewListCard } from "@/components/ReviewListCard";
import { categories, enrichProducts, getWeeklyRanking } from "@/lib/nomilog-data";
import { useNomilogReviews } from "@/components/useNomilogReviews";
import { useNomilogProducts } from "@/components/useNomilogProducts";

const categoryStyles = [
  "bg-[#e8f4ff] text-[#1685cc]",
  "bg-[#edf8e9] text-[#397534]",
  "bg-[#fff0e8] text-[#a4541d]",
  "bg-[#eaf2ff] text-[#2469bf]",
  "bg-[#f7ebf8] text-[#8c3c92]",
  "bg-[#f2f3f5] text-[#666b72]"
];

const RANKING_PLACEHOLDER_COUNT = 5;

/**
 * 同じレビュー配列からランキングと新着欄を作り、画面間で数値を揃える。
 * 表示ごとに別のデータ取得や集計を行うと、投稿直後に件数・平均値が食い違うため、
 * seed、端末内レビュー、Supabaseレビューを統合した一つの配列を計算元にする。
 */
export function HomeScreen() {
  const reviews = useNomilogReviews();
  const catalog = useNomilogProducts();
  // ホームの「今週」という表示に合わせ、直近7日間の評価といいねから最大10位まで計算する。
  // 検索画面の人気順とは意図が異なるため、全期間向けのgetRankingをここで流用しない。
  const ranking = getWeeklyRanking(reviews, 10, catalog);
  const enriched = enrichProducts(reviews, catalog);
  const latestReviews = [...reviews]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    // 今週のランキングと同じレビュー母集団から、ホームでも新着6件を見せる。
    // デモ運用中に投稿量が少ないため、最初の数件だけでは飲み物ごとの違いが伝わりにくく、
    // 6件まで表示してコメント・購入場所の比較を始めやすくする。
    .slice(0, 6);

  return (
    <div className="screen">
      <BrandHeader />

      <Link
        href="/search"
        className="tap-target flex items-center gap-3 rounded-[8px] bg-[var(--surface-soft)] px-4 text-[15px] text-[#8a8e94]"
      >
        <Search className="h-5 w-5 text-[var(--text)]" strokeWidth={1.8} />
        ドリンク名・キーワードで検索
      </Link>

      <div className="scrollbar-none -mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-1">
        {categories.slice(0, 5).map((category, index) => (
          <Link
            href={`/search?category=${category.slug}`}
            key={category.id}
            className={`inline-flex h-9 shrink-0 items-center rounded-full px-4 text-[13px] font-semibold ${categoryStyles[index]}`}
          >
            {category.name}
          </Link>
        ))}
      </div>

      <section className="mt-6">
        <SectionTitle title="今週のランキング" icon={<Crown className="h-5 w-5 fill-[var(--star)] text-[var(--star)]" strokeWidth={1.7} />} />
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {ranking.length > 0 ? (
            ranking.map((product, index) => (
              <Link
                href={`/products/${product.id}`}
                key={product.id}
                className="relative w-[82px] shrink-0 border-r border-[var(--border)] px-1.5 last:border-r-0"
              >
                <span
                  className={`absolute left-0 top-0 z-10 grid h-6 w-6 place-items-center rounded-full text-[12px] font-semibold ${
                    index === 0
                      ? "bg-[var(--star)] text-white"
                      : index === 1
                        ? "bg-[#bfc3c8] text-white"
                        : index === 2
                          ? "bg-[#b86c28] text-white"
                          : "bg-[#d5d7da] text-[var(--text)]"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="relative block h-[112px]">
                  <Image src={product.imageUrl} alt={product.name} fill sizes="82px" className="object-contain" />
                </span>
                <span className="line-clamp-2 min-h-10 text-[12px] leading-[1.45]">{product.name}</span>
                <span className="mt-1 flex items-center justify-center gap-1 text-[13px] text-[var(--star)]">
                  <Star className="h-3.5 w-3.5 fill-[var(--star)]" strokeWidth={1.5} aria-hidden="true" />
                  {product.avgRating.toFixed(1)}
                </span>
              </Link>
            ))
          ) : (
            <WeeklyRankingPlaceholder />
          )}
        </div>
        {ranking.length === 0 ? (
          <p className="mt-2 text-center text-[12px] font-normal text-[var(--muted)]">今週のランキングはまだありません</p>
        ) : null}
      </section>

      <section className="mt-6">
        <SectionTitle title="最新のレビュー" href="/search?sort=new" />
        <div className="space-y-2">
          {latestReviews.flatMap((review) => {
            const product = catalog.find((item) => item.id === review.productId);
            return product ? <ReviewListCard key={review.id} review={review} product={product} /> : [];
          })}
        </div>
        <Link href="/search?sort=new" className="tap-target mt-1 flex items-center justify-center gap-1 text-[13px] text-[var(--accent)]">
          もっと見る <ChevronRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="mt-5 pb-4">
        <SectionTitle title="気になる一本" href="/search" />
        <div className="grid grid-cols-2 gap-3">
          {enriched.slice(0, 4).map((product) => (
            <Link key={product.id} href={`/products/${product.id}`} className="app-card flex items-center gap-2 p-2">
              <span className="relative h-16 w-12 shrink-0">
                <Image src={product.imageUrl} alt={product.name} fill sizes="48px" className="object-contain" />
              </span>
              <span className="min-w-0">
                <span className="line-clamp-2 text-[12px] leading-[1.45]">{product.name}</span>
                <span className="mt-1 flex items-center gap-1 text-[12px] text-[var(--star)]">
                  <Star className="h-3.5 w-3.5 fill-[var(--star)]" strokeWidth={1.5} aria-hidden="true" />
                  {product.avgRating.toFixed(1)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * 今週の対象レビューがない場合も、ランキング欄の占有領域と横スクロールの手掛かりを残す。
 * これは読み込み状態ではないためアニメーションは付けず、通信中だと誤解させない静的な表示にする。
 */
function WeeklyRankingPlaceholder() {
  return (
    <>
      {Array.from({ length: RANKING_PLACEHOLDER_COUNT }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="relative w-[82px] shrink-0 border-r border-[var(--border)] px-1.5 last:border-r-0"
        >
          <span className="absolute left-0 top-0 z-10 h-6 w-6 rounded-full bg-[#d5d7da]" />
          <span className="my-1 block h-[104px] rounded-[6px] bg-[var(--surface-soft)]" />
          <span className="mt-2 block h-3 rounded-[3px] bg-[#e1e4e8]" />
          <span className="mt-2 block h-3 w-3/4 rounded-[3px] bg-[#e8eaed]" />
          <span className="mx-auto mt-3 block h-3 w-10 rounded-[3px] bg-[#e1e4e8]" />
        </span>
      ))}
    </>
  );
}

function SectionTitle({ title, href, icon }: { title: string; href?: string; icon?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-1.5 text-[17px]">{icon}{title}</h2>
      {href ? (
        <Link href={href} className="inline-flex items-center text-[12px] text-[var(--accent)]">
          すべて見る <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}
