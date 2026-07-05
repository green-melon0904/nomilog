"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { SearchIcon } from "@/components/icons";
import {
  categories,
  enrichProducts,
  purchaseLocations,
  saveProductRequest
} from "@/lib/nomilog-data";
import { useNomilogReviews } from "@/components/useNomilogReviews";

type SortKey = "popular" | "new" | "rating";

export function SearchScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const reviews = useNomilogReviews();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "all");
  const [location, setLocation] = useState(params.get("location") ?? "all");
  const [sort, setSort] = useState<SortKey>((params.get("sort") as SortKey) ?? "popular");
  const [requested, setRequested] = useState(false);

  const results = useMemo(() => {
    // 検索条件はすべてクライアント側で組み合わせる。MVPでは商品数が少ないため、
    // DB検索APIを作らず、seed商品とレビュー情報を突き合わせて絞り込みを行う。
    const normalized = query.trim().toLowerCase();
    const selectedCategoryId = categories.find((item) => item.slug === category)?.id;
    const products = enrichProducts(reviews).filter((product) => {
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

    // 人気順はレビュー数を優先し、同数なら平均評価で並べる。
    // 評価順では平均評価を優先しつつ、レビュー数が多い商品を同点時に上へ出す。
    return products.sort((a, b) => {
      if (sort === "new") return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      if (sort === "rating") return b.avgRating - a.avgRating || b.reviewCount - a.reviewCount;
      return b.reviewCount - a.reviewCount || b.avgRating - a.avgRating;
    });
  }, [category, location, query, reviews, sort]);

  function syncUrl(nextQuery = query) {
    // フィルター状態をURLに反映しておくと、検索結果を共有したり戻る操作をしたりしても
    // 直前の条件が復元される。初期値の条件はURLを短く保つため省略する。
    const next = new URLSearchParams();
    if (nextQuery.trim()) next.set("q", nextQuery.trim());
    if (category !== "all") next.set("category", category);
    if (location !== "all") next.set("location", location);
    if (sort !== "popular") next.set("sort", sort);
    router.replace(`/search${next.toString() ? `?${next.toString()}` : ""}`);
  }

  function requestProduct() {
    // 商品が見つからない場合でもユーザーの意図を捨てないため、MVPでは即時追加ではなく
    // 商品リクエストとして保存する。管理画面がない間はlocalStorageに積むだけにしている。
    if (!query.trim()) return;
    saveProductRequest(query.trim());
    setRequested(true);
  }

  return (
    <div className="screen">
      <Header title={query ? `検索結果: ${query}` : "検索・ランキング"} backHref="/" action="none" />

      <form
        className="mb-3 flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-white px-3 shadow-sm focus-within:border-[var(--accent)]"
        onSubmit={(event) => {
          event.preventDefault();
          syncUrl();
        }}
      >
        <SearchIcon className="h-5 w-5 text-[var(--accent)]" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setRequested(false);
          }}
          placeholder="商品名・メーカーで検索"
          className="min-h-12 min-w-0 flex-1 bg-transparent text-[16px] font-bold outline-none"
        />
        <button className="tap-target rounded-[8px] px-2 text-[13px] font-semibold text-[var(--accent-strong)]">
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
        <button onClick={() => syncUrl()} className="tap-target shrink-0 rounded-[8px] bg-[var(--accent)] px-4 text-[13px] font-semibold text-white">
          反映
        </button>
      </div>

      <div className="mb-3 flex items-end justify-between">
        <p className="text-[14px] font-semibold text-[var(--muted)]">{results.length}件</p>
        <p className="text-[12px] font-bold text-[var(--muted)]">購入場所はレビュー情報から絞り込み</p>
      </div>

      {results.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      ) : (
        <div className="soft-card p-4">
          <p className="text-[16px] font-semibold">商品が見つかりません</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
            MVPでは商品はseed管理です。見つからない商品は追加リクエストとして保存できます。
          </p>
          <button
            disabled={!query.trim() || requested}
            onClick={requestProduct}
            className="tap-target mt-3 rounded-[8px] bg-[var(--accent)] px-4 text-[14px] font-semibold text-white disabled:bg-[#b9d9ef]"
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
          ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm"
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
