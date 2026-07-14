/** ホーム・レビュー一覧で共通利用するレビューカード。未登録飲料も同じ情報密度で表示する。 */
import Image from "next/image";
import Link from "next/link";
import { GlassWater } from "lucide-react";
import { RatingStars } from "@/components/RatingStars";
import { ReviewLikeButton } from "@/components/ReviewLikeButton";
import { formatDate } from "@/lib/nomilog-data";
import type { Product, Review } from "@/lib/types";

type ReviewListCardProps = {
  review: Review;
  product?: Product;
};

/** 商品詳細リンクと、認証が必要ないいね操作を一つのカードにまとめる。 */
export function ReviewListCard({ review, product }: ReviewListCardProps) {
  const productName = product?.name ?? review.productName ?? "名称未入力のドリンク";
  return (
    <article className="app-card grid grid-cols-[76px_minmax(0,1fr)] gap-3 p-2.5">
      {product ? (
        <Link href={`/products/${product.id}`} aria-label={`${productName}の商品詳細`} className="relative block h-[96px] overflow-hidden rounded-[6px] bg-[var(--surface-soft)]">
          <Image src={product.imageUrl} alt={product.name} fill sizes="76px" className="object-contain" />
        </Link>
      ) : (
        <span className="relative block h-[96px] overflow-hidden rounded-[6px] bg-[var(--surface-soft)]">
          {/* 未登録飲料を空白にするとカードごとの高さと視線のリズムが崩れるため、商品画像と同じ枠を保つ。 */}
          <span className="flex h-full flex-col items-center justify-center gap-1 text-[var(--accent)]">
            <GlassWater className="h-8 w-8" strokeWidth={1.5} />
            <span className="text-[10px]">ドリンク</span>
          </span>
        </span>
      )}
      <span className="min-w-0 py-0.5">
        {product ? (
          <Link href={`/products/${product.id}`} className="block min-w-0">
            <span className="block truncate text-[14px]">{productName}</span>
            <span className="mt-1 flex items-center gap-2">
              <RatingStars value={review.rating} />
              <span className="text-[12px]">{review.rating.toFixed(1)}</span>
            </span>
            <span className="mt-1.5 line-clamp-2 block text-[12px] font-normal leading-[1.5] text-[#3d4147]">{review.comment}</span>
          </Link>
        ) : (
          <div>
            <span className="block truncate text-[14px]">{productName}</span>
            <span className="mt-1 flex items-center gap-2">
              <RatingStars value={review.rating} />
              <span className="text-[12px]">{review.rating.toFixed(1)}</span>
            </span>
            <span className="mt-1.5 line-clamp-2 block text-[12px] font-normal leading-[1.5] text-[#3d4147]">{review.comment}</span>
          </div>
        )}
        <span className="mt-2 flex min-h-[44px] items-center justify-between gap-2 text-[11px] text-[var(--muted)]">
          <span>{review.userName}</span>
          <span className="flex items-center gap-1">
            <span>{formatDate(review.createdAt)}</span>
            <ReviewLikeButton reviewId={review.id} initialCount={review.likeCount} />
          </span>
        </span>
      </span>
    </article>
  );
}
