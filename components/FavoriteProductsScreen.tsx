"use client";

/**
 * ログインユーザーが保存したお気に入り商品を一覧管理する画面。
 *
 * お気に入りAPIは商品IDだけを返し、公開商品情報とレビュー集計は既存の共通データ層から組み立てる。
 * これにより個人データのレスポンスを最小化し、商品名や画像の変更も一覧へ自動反映する。
 */
import Link from "next/link";
import { Heart } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { FavoriteButtonView } from "@/components/FavoriteButton";
import { ProductCard } from "@/components/ProductCard";
import { useNomilogFavorites } from "@/components/useNomilogFavorites";
import { useNomilogProducts } from "@/components/useNomilogProducts";
import { useNomilogReviews } from "@/components/useNomilogReviews";
import { enrichProducts } from "@/lib/nomilog-data";

export function FavoriteProductsScreen() {
  const catalog = useNomilogProducts();
  const reviews = useNomilogReviews();
  const favorites = useNomilogFavorites();
  const { favoriteProductIds, status } = favorites;
  const products = enrichProducts(reviews, catalog);
  const favoriteProducts = favoriteProductIds.flatMap((id) => {
    const product = products.find((item) => item.id === id);
    return product ? [product] : [];
  });

  return (
    <div className="screen pb-8">
      <BrandHeader />
      <div className="mb-5 border-b border-[var(--border)] pb-3">
        <h1 className="text-[20px]">お気に入り</h1>
        <p className="mt-1 text-[12px] font-normal text-[var(--muted)]">あとで見返したいドリンクを管理できます。</p>
      </div>

      {status === "loading" ? (
        <div className="grid grid-cols-2 gap-3" aria-label="お気に入りを読み込み中">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-56 animate-pulse rounded-[8px] bg-[var(--surface-soft)]" />)}
        </div>
      ) : status === "signed-out" ? (
        <EmptyState title="ログインするとお気に入りを保存できます" description="メールへ届く6桁コードでログインできます。">
          <Link href="/sign-in?next=%2Fmypage%2Ffavorites" className="tap-target mt-4 inline-flex items-center rounded-[8px] bg-[var(--accent)] px-5 text-[14px] !text-white">ログインする</Link>
        </EmptyState>
      ) : status === "unavailable" ? (
        <EmptyState title="お気に入りを読み込めませんでした" description="時間をおいて、もう一度この画面を開いてください。" />
      ) : favoriteProducts.length === 0 ? (
        <EmptyState title="お気に入りはまだありません" description="商品詳細のハートを押すと、ここで見返せます。">
          <Link href="/search" className="tap-target mt-4 inline-flex items-center rounded-[8px] border border-[var(--accent)] px-5 text-[14px] text-[var(--accent)]">ドリンクを探す</Link>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {favoriteProducts.map((product) => (
            <div key={product.id} className="min-w-0">
              <ProductCard product={product} />
              <div className="mt-2 flex justify-center">
                <FavoriteButtonView productId={product.id} returnTo="/mypage/favorites" favorites={favorites} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <section className="py-14 text-center">
      <Heart className="mx-auto h-11 w-11 text-[var(--accent)]" strokeWidth={1.5} />
      <h2 className="mt-4 text-[17px]">{title}</h2>
      <p className="mt-2 text-[12px] font-normal text-[var(--muted)]">{description}</p>
      {children}
    </section>
  );
}
