"use client";

/**
 * マイページで本人レビューを表示し、編集・削除操作を提供するカード。
 *
 * 商品詳細への閲覧導線と状態変更ボタンを分け、削除ボタンを押しただけで商品ページへ遷移しない。
 * 削除前にはブラウザ確認を挟み、確定後もAPIとRLSで所有者を再検証する。
 */
import Image from "next/image";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { RatingStars } from "@/components/RatingStars";
import { deleteLocalReview } from "@/lib/nomilog-data";
import { canUseRemoteData, deleteRemoteReview } from "@/lib/nomilog-remote";
import type { ProductWithStats, Review } from "@/lib/types";

export function OwnedReviewCard({ review, product }: { review: Review; product: ProductWithStats }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteReview() {
    if (deleting) return;
    const confirmed = window.confirm(`「${product.name}」のレビューを削除しますか？\n削除したレビューは元に戻せません。`);
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    try {
      if (canUseRemoteData()) await deleteRemoteReview(review.id);
      else deleteLocalReview(review.id);
      // リモート削除はstorageイベントを発火しないため、同じタブの件数・ランキングも再取得する。
      window.dispatchEvent(new Event("nomilog:reviews"));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "レビューを削除できませんでした。");
      setDeleting(false);
    }
  }

  return (
    <article className="soft-card p-3">
      <div className="flex min-w-0 items-center gap-3">
        <Link href={`/products/${product.id}`} aria-label={`${product.name}の商品詳細`} className="relative h-[78px] w-[72px] shrink-0 overflow-hidden rounded-[8px] bg-white">
          <Image src={product.imageUrl} alt="" fill sizes="72px" className="object-contain p-1" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/products/${product.id}`} className="block min-w-0">
            <span className="block truncate text-[14px]">{product.name}</span>
            <span className="mt-1 flex items-center gap-2"><RatingStars value={review.rating} /><span className="text-[12px] text-[var(--text)]">{review.rating.toFixed(1)}</span></span>
            <span className="mt-1 block truncate text-[12px] font-normal text-[#4b5158]">{review.comment}</span>
          </Link>
          <div className="mt-1 flex justify-end gap-1">
            <Link href={`/reviews/${review.id}/edit`} className="tap-target inline-flex min-h-11 items-center gap-1 px-2 text-[12px] text-[var(--accent)]" aria-label={`${product.name}のレビューを編集`}>
              <Pencil className="h-4 w-4" strokeWidth={1.8} />編集
            </Link>
            <button type="button" onClick={deleteReview} disabled={deleting} className="tap-target inline-flex min-h-11 items-center gap-1 px-2 text-[12px] text-[var(--danger)] disabled:cursor-wait disabled:opacity-50" aria-label={`${product.name}のレビューを削除`}>
              <Trash2 className="h-4 w-4" strokeWidth={1.8} />{deleting ? "削除中" : "削除"}
            </button>
          </div>
        </div>
      </div>
      {error ? <p role="alert" className="mt-2 rounded-[6px] bg-[#fff3f3] p-2 text-[11px] text-[var(--danger)]">{error}</p> : null}
    </article>
  );
}
