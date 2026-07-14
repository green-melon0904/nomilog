"use client";

/** 商品名・メーカー・カテゴリ・購入場所を組み合わせて商品を探す画面。 */

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { ProductCard } from "@/components/ProductCard";
import {
  categories,
  enrichProducts,
  purchaseLocations,
  saveProductRequest
} from "@/lib/nomilog-data";
import { useNomilogReviews } from "@/components/useNomilogReviews";
import { useNomilogProducts } from "@/components/useNomilogProducts";

type SortKey = "popular" | "new" | "rating";

/** URLとローカル状態を同期し、検索条件を戻る・共有操作でも復元できるようにする。 */
export function SearchScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const reviews = useNomilogReviews();
  const catalog = useNomilogProducts();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "all");
  const [location, setLocation] = useState(params.get("location") ?? "all");
  const [sort, setSort] = useState<SortKey>((params.get("sort") as SortKey) ?? "popular");
  const [requested, setRequested] = useState(false);

  const results = useMemo(() => {
    // MVPの商品数ではサーバー検索の待ち時間より即時反応を優先し、商品マスタとレビューを
    // 同じクライアント状態から絞り込む。購入場所は商品自身ではなくレビューの存在で判定する。
    const normalized = query.trim().toLowerCase();
    const selectedCategoryId = categories.find((item) => item.slug === category)?.id;
    const products = enrichProducts(reviews, catalog).filter((product) => {
      const matchesQuery =
        !normalized ||
        product.name.toLowerCase().includes(normalized) ||
        product.maker.toLowerCase().includes(normalized);
      const matchesCategory = category === "all" || product.categoryId === selectedCategoryId;
      const matchesLocation =
        location === "all" ||
        reviews.some((review) => review.productId === product.id && review.purchaseLocation === location);
      return matchesQuery && matchesCategory && matchesLocation;
    });

    // 並び順ごとの比較をここへ集約し、フィルター適用後の商品だけを比較する。
    // 同点時の第二キーを固定して、レビュー追加のタイミングで表示が不安定にならないようにする。
    return products.sort((a, b) => {
      if (sort === "new") return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      if (sort === "rating") return b.avgRating - a.avgRating || b.reviewCount - a.reviewCount;
      return b.reviewCount - a.reviewCount || b.avgRating - a.avgRating;
    });
  }, [catalog, category, location, query, reviews, sort]);

  function syncUrl(nextQuery = query) {
    // URLを状態の保存先にすることで、検索結果の共有とブラウザの戻る操作で条件を復元できる。
    // 初期値は省略し、意味のある差分だけをクエリへ残してURLを短く保つ。
    const next = new URLSearchParams();
    if (nextQuery.trim()) next.set("q", nextQuery.trim());
    if (category !== "all") next.set("category", category);
    if (location !== "all") next.set("location", location);
    if (sort !== "popular") next.set("sort", sort);
    router.replace(`/search${next.toString() ? `?${next.toString()}` : ""}`);
  }

  function requestProduct() {
    // 商品が見つからない入力を即時マスタ登録すると、表記ミスが全ユーザーの検索結果へ混ざる。
    // 管理画面がないMVPでは、まずリクエストとして端末へ残し、運用確認の入口にする。
    if (!query.trim()) return;
    saveProductRequest(query.trim());
    setRequested(true);
  }

  return (
    <div className="screen">
      <BrandHeader />
      <form
        className="mb-3 flex items-center gap-2 rounded-[8px] bg-[var(--surface-soft)] px-3 focus-within:ring-1 focus-within:ring-[var(--accent)]"
        onSubmit={(event) => {
          event.preventDefault();
          syncUrl();
        }}
      >
        <Search className="h-5 w-5 text-[var(--text)]" strokeWidth={1.8} />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setRequested(false);
          }}
          placeholder="商品名・メーカーで検索"
          className="min-h-12 min-w-0 flex-1 bg-transparent text-[16px] outline-none"
        />
        <button className="tap-target rounded-[8px] px-2 text-[13px] text-[var(--accent-strong)]">
          検索
        </button>
      </form>

      <div className="scrollbar-none -mx-1 mb-3 flex gap-2 overflow-x-auto px-1">
        <FilterButton active={category === "all"} label="すべて" onClick={() => setCategory("all")} />
        {categories.map((item) => (
          <FilterButton key={item.id} active={category === item.slug} label={item.name} onClick={() => setCategory(item.slug)} />
        ))}
      </div>

      <div className="scrollbar-none -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
        <Select value={sort} onChange={(value) => setSort(value as SortKey)} options={[["popular", "人気順"], ["new", "新着"], ["rating", "評価"]]} />
        <Select value={location} onChange={setLocation} options={[["all", "購入場所"], ...purchaseLocations.map((item) => [item, item])]} />
        <button onClick={() => syncUrl()} className="tap-target shrink-0 rounded-[8px] bg-[var(--accent)] px-4 text-[13px] font-semibold !text-white">
          反映
        </button>
      </div>

      <div className="mb-3 mt-5 flex items-end justify-between">
        <p className="text-[14px] font-semibold text-[var(--muted)]">{results.length}件</p>
        <p className="text-[12px] font-bold text-[var(--muted)]">購入場所はレビュー情報から絞り込み</p>
      </div>

      {results.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 pb-4">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      ) : (
        <div className="soft-card p-4">
          <p className="text-[16px] font-semibold">商品が見つかりません</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
            登録されていない商品は追加リクエストとして保存できます。
          </p>
          <button
            disabled={!query.trim() || requested}
            onClick={requestProduct}
            className="tap-target mt-3 rounded-[8px] bg-[var(--accent)] px-4 text-[14px] font-semibold !text-white disabled:bg-[#b9d9ef]"
          >
            {requested ? "リクエスト済み" : "商品リクエストを送る"}
          </button>
        </div>
      )}
    </div>
  );
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`tap-target shrink-0 rounded-full border px-4 text-[14px] font-semibold ${
        active
          ? "border-[var(--accent)] bg-[var(--accent)] !text-white shadow-sm"
          : "border-[var(--border)] bg-white text-[var(--text)]"
      }`}
    >
      {label}
    </button>
  );
}

function Select({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="tap-target shrink-0 rounded-[8px] border border-[var(--border)] bg-white px-3 text-[14px] font-semibold text-[var(--text)]"
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}
