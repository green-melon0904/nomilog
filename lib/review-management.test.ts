import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { deleteLocalReview, products, readLocalReviews, updateLocalReview } from "./nomilog-data.ts";

const reviewsKey = "nomilog.reviews.v1";
const originalWindow = globalThis.window;

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage, dispatchEvent: () => true }
  });
});

afterEach(() => {
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, "window");
    return;
  }
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
});

function seedLocalReview() {
  const review = {
    id: "local-review",
    userId: "demo-user",
    userName: "のみログユーザー",
    productId: products[0].id,
    productName: products[0].name,
    rating: 3,
    sweetness: 2,
    carbonation: 3,
    scene: ["リフレッシュ"],
    costPerformance: 3,
    purchaseLocation: "ローソン",
    comment: "更新前のコメント",
    imageUrl: "data:image/png;base64,existing",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z"
  };
  storage.setItem(reviewsKey, JSON.stringify([review]));
  return review;
}

test("review update preserves creation time and unchanged image", () => {
  const existing = seedLocalReview();
  const updated = updateLocalReview(existing.id, {
    productId: products[1].id,
    productName: "リクエスト側の名前は採用しない",
    rating: 5,
    sweetness: 4,
    carbonation: 2,
    scene: ["食事と一緒に"],
    costPerformance: 4,
    purchaseLocation: "ファミマ",
    comment: "更新後のコメント"
  }, existing.updatedAt);

  assert.equal(updated.createdAt, existing.createdAt);
  assert.equal(updated.imageUrl, existing.imageUrl);
  assert.equal(updated.productName, products[1].name);
  assert.equal(updated.rating, 5);
});

test("review update removes an existing image only when requested", () => {
  const existing = seedLocalReview();
  const updated = updateLocalReview(existing.id, {
    productId: existing.productId,
    productName: existing.productName,
    rating: 4,
    sweetness: 3,
    carbonation: 2,
    scene: ["リラックス"],
    costPerformance: 4,
    purchaseLocation: "自販機",
    comment: "画像を外した更新",
    removeImage: true
  }, existing.updatedAt);

  assert.equal(updated.imageUrl, undefined);
});

test("review delete removes only the selected local review", () => {
  const existing = seedLocalReview();
  storage.setItem(reviewsKey, JSON.stringify([
    existing,
    { ...existing, id: "local-review-2", comment: "残すレビュー" }
  ]));

  deleteLocalReview(existing.id);

  assert.deepEqual(readLocalReviews().map((review) => review.id), ["local-review-2"]);
});

test("review update rejects a stale editor snapshot", () => {
  const existing = seedLocalReview();

  assert.throws(() => updateLocalReview(existing.id, {
    productId: existing.productId,
    productName: existing.productName,
    rating: 4,
    sweetness: 3,
    carbonation: 2,
    scene: ["リラックス"],
    costPerformance: 4,
    purchaseLocation: "自販機",
    comment: "古い画面からの更新"
  }, "2026-07-31T00:00:00.000Z"), /別の画面でレビューが更新/);

  assert.equal(readLocalReviews()[0].comment, existing.comment);
});
