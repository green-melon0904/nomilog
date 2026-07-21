/**
 * ホーム・レビュー一覧で共通利用する、カタログ商品のレビューカード。
 * 商品詳細へのリンクといいね操作を別の要素に分け、いいねを押したときに詳細画面へ遷移する
 * 競合を避ける。仮運用では全レビューが商品へ紐づくため、リンク先を持たない表示分岐は置かない。
 */
import Image from "next/image";
import Link from "next/link";
import { RatingStars } from "@/components/RatingStars";
import { ReviewLikeButton } from "@/components/ReviewLikeButton";
import { formatDate } from "@/lib/nomilog-data";
import type { Product, Review } from "@/lib/types";

type ReviewListCardProps = {
  review: Review;
  product: Product;
};

/**
 * 商品詳細リンクと、認証が必要ないいね操作を一つのカードにまとめる。
 * カード全体をリンクにせず操作単位を分けることで、ログイン誘導やいいねの再試行を
 * レビュー詳細への遷移から独立して扱える。
 */
export function ReviewListCard({ review, product }: ReviewListCardProps) {
  const productName = product.name;
  return (
    <article className="app-card grid grid-cols-[76px_minmax(0,1fr)] gap-3 p-2.5">
      <Link href={`/products/${product.id}`} aria-label={`${productName}の商品詳細`} className="relative block h-[96px] overflow-hidden rounded-[6px] bg-[var(--surface-soft)]">
        <Image src={product.imageUrl} alt={product.name} fill sizes="76px" className="object-contain" />
      </Link>
      <span className="min-w-0 py-0.5">
        <Link href={`/products/${product.id}`} className="block min-w-0">
          <span className="block truncate text-[14px]">{productName}</span>
          <span className="mt-1 flex items-center gap-2">
            <RatingStars value={review.rating} />
            <span className="text-[12px]">{review.rating.toFixed(1)}</span>
          </span>
          <span className="mt-1.5 line-clamp-2 block text-[12px] font-normal leading-[1.5] text-[#3d4147]">{review.comment}</span>
        </Link>
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
