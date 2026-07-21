import assert from "node:assert/strict";
import { test } from "node:test";
import { getWeeklyRanking } from "./nomilog-data.ts";
import type { Product, Review } from "./types.ts";

const now = new Date("2026-07-21T12:00:00.000Z");

const rankingProducts: Product[] = [
  {
    id: "product-a",
    name: "商品A",
    maker: "テストメーカー",
    categoryId: "category",
    imageUrl: "/product-a.svg",
    createdAt: "2026-07-01T00:00:00.000Z"
  },
  {
    id: "product-b",
    name: "商品B",
    maker: "テストメーカー",
    categoryId: "category",
    imageUrl: "/product-b.svg",
    createdAt: "2026-07-01T00:00:00.000Z"
  },
  {
    id: "product-c",
    name: "商品C",
    maker: "テストメーカー",
    categoryId: "category",
    imageUrl: "/product-c.svg",
    createdAt: "2026-07-01T00:00:00.000Z"
  }
];

function createReview(overrides: Partial<Review> & Pick<Review, "id" | "productId" | "rating">): Review {
  return {
    userId: "reviewer",
    userName: "テストユーザー",
    productName: rankingProducts.find((product) => product.id === overrides.productId)?.name ?? "不明な商品",
    sweetness: 3,
    carbonation: 2,
    scene: ["リフレッシュ"],
    costPerformance: 3,
    purchaseLocation: "セブン-イレブン",
    comment: "ランキング計算のテスト用レビューです。",
    createdAt: "2026-07-20T12:00:00.000Z",
    ...overrides
  };
}

test("weekly ranking excludes reviews older than seven days", () => {
  const ranking = getWeeklyRanking(
    [
      createReview({ id: "old-high-score", productId: "product-a", rating: 5, createdAt: "2026-07-14T11:59:59.000Z" }),
      createReview({ id: "recent-score", productId: "product-b", rating: 4 })
    ],
    4,
    rankingProducts,
    now
  );

  assert.deepEqual(ranking.map((product) => product.id), ["product-b"]);
});

test("weekly ranking includes a review created exactly seven days ago", () => {
  const ranking = getWeeklyRanking(
    [
      createReview({ id: "boundary-review", productId: "product-a", rating: 4, createdAt: "2026-07-14T12:00:00.000Z" }),
      createReview({ id: "outdated-review", productId: "product-b", rating: 5, createdAt: "2026-07-14T11:59:59.000Z" })
    ],
    4,
    rankingProducts,
    now
  );

  assert.deepEqual(ranking.map((product) => product.id), ["product-a"]);
});

test("weekly ranking uses likes per review instead of total review volume", () => {
  const ranking = getWeeklyRanking(
    [
      createReview({ id: "a-1", productId: "product-a", rating: 4, likeCount: 0 }),
      createReview({ id: "a-2", productId: "product-a", rating: 4, likeCount: 0 }),
      createReview({ id: "b-1", productId: "product-b", rating: 4, likeCount: 2 }),
      createReview({ id: "b-2", productId: "product-b", rating: 4, likeCount: 2 }),
      createReview({ id: "c-1", productId: "product-c", rating: 4, likeCount: 1 })
    ],
    4,
    rankingProducts,
    now
  );

  assert.deepEqual(ranking.map((product) => product.id), ["product-b", "product-c", "product-a"]);
});

test("weekly ranking does not put a single five-star review above two four-star reviews", () => {
  const ranking = getWeeklyRanking(
    [
      createReview({ id: "a-single-five", productId: "product-a", rating: 5, likeCount: 0 }),
      createReview({ id: "b-supported-1", productId: "product-b", rating: 4, likeCount: 0 }),
      createReview({ id: "b-supported-2", productId: "product-b", rating: 4, likeCount: 0 })
    ],
    4,
    rankingProducts,
    now
  );

  assert.equal(ranking[0]?.id, "product-b");
});

test("weekly ranking uses product names as a stable final tie breaker", () => {
  const ranking = getWeeklyRanking(
    [
      createReview({ id: "a-tie", productId: "product-a", rating: 4, likeCount: 1 }),
      createReview({ id: "b-tie", productId: "product-b", rating: 4, likeCount: 1 })
    ],
    4,
    rankingProducts,
    now
  );

  assert.deepEqual(ranking.map((product) => product.id), ["product-a", "product-b"]);
});

test("weekly ranking uses product IDs when products have the same name", () => {
  const sameNameProducts = rankingProducts.map((product) => ({ ...product, name: "同名商品" }));
  const ranking = getWeeklyRanking(
    [
      createReview({ id: "same-name-a", productId: "product-a", rating: 4, likeCount: 1 }),
      createReview({ id: "same-name-b", productId: "product-b", rating: 4, likeCount: 1 })
    ],
    4,
    sameNameProducts,
    now
  );

  assert.deepEqual(ranking.map((product) => product.id), ["product-a", "product-b"]);
});
