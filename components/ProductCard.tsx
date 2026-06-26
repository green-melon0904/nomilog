import Link from "next/link";
import { getCategoryName } from "@/lib/nomilog-data";
import type { ProductWithStats } from "@/lib/types";
import { RatingStars } from "@/components/RatingStars";

export function ProductCard({ product, compact = false }: { product: ProductWithStats; compact?: boolean }) {
  return (
    <Link href={`/products/${product.id}`} className="app-card block overflow-hidden">
      <div className={compact ? "relative h-28" : "relative h-36"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain" />
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-2 text-[15px] font-black leading-snug tracking-[0]">{product.name}</p>
        <p className="text-[12px] font-semibold text-[var(--muted)]">
          {product.maker} / {getCategoryName(product.categoryId)}
        </p>
        <div className="flex items-center justify-between gap-2">
          <RatingStars value={product.avgRating} />
          <span className="text-[12px] font-bold text-[var(--muted)]">{product.reviewCount}件</span>
        </div>
      </div>
    </Link>
  );
}
