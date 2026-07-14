/**
 * 一覧・ホーム・似た味欄で再利用する商品カード。
 * 商品名・画像・評価の配置を共通化し、同じ商品が出る場所によって情報量や詳細画面への
 * 遷移方法が変わらないようにする。compactは横スクロール欄の限られた幅だけで使う。
 */
import Image from "next/image";
import Link from "next/link";
import { getCategoryName } from "@/lib/nomilog-data";
import type { ProductWithStats } from "@/lib/types";
import { RatingStars } from "@/components/RatingStars";

/**
 * 事前に集計済みの商品を受け取り、カード内で再計算せず一定の表示を保つ。
 * カードごとにレビュー配列を走査すると一覧の件数に比例して処理が増え、画面ごとに
 * 集計条件もずれるため、集計の責務は呼び出し側へ残す。
 */
export function ProductCard({ product, compact = false }: { product: ProductWithStats; compact?: boolean }) {
  return (
    <Link href={`/products/${product.id}`} className="app-card block overflow-hidden transition-colors hover:border-[var(--accent)]">
      <div className={`${compact ? "relative h-28" : "relative h-36"} bg-white`}>
        <Image src={product.imageUrl} alt={product.name} fill sizes={compact ? "180px" : "220px"} className="object-contain p-2" />
      </div>
      <div className="space-y-1 border-t border-[var(--border)] p-2.5">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug">{product.name}</p>
        <p className="truncate text-[11px] text-[var(--muted)]">
          {product.maker} / {getCategoryName(product.categoryId)}
        </p>
        <div className="flex items-center justify-between gap-2">
          <RatingStars value={product.avgRating} />
          <span className="text-[11px] text-[var(--muted)]">{product.reviewCount}件</span>
        </div>
      </div>
    </Link>
  );
}
