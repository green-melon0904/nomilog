import type {
  CarbonationLevel,
  Category,
  Product,
  ProductRequest,
  ProductStats,
  ProductWithStats,
  PurchaseLocation,
  Review,
  ReviewDraft,
  SceneTag
} from "@/lib/types";

export const carbonationLabels: Record<CarbonationLevel, string> = {
  0: "なし",
  1: "弱め",
  2: "普通",
  3: "強め",
  4: "強炭酸"
};

export const purchaseLocations: PurchaseLocation[] = [
  "セブン",
  "ローソン",
  "ファミマ",
  "自販機",
  "スーパー",
  "その他"
];

export const sceneTags: SceneTag[] = ["朝", "運動後", "昼食", "夜", "暑い日"];

export const categories: Category[] = [
  { id: "11111111-1111-4111-8111-111111111111", name: "炭酸", slug: "soda" },
  { id: "22222222-2222-4222-8222-222222222222", name: "お茶", slug: "tea" },
  { id: "33333333-3333-4333-8333-333333333333", name: "コーヒー", slug: "coffee" },
  { id: "44444444-4444-4444-8444-444444444444", name: "酒類", slug: "alcohol" },
  { id: "55555555-5555-4555-8555-555555555555", name: "エナジー", slug: "energy" },
  { id: "66666666-6666-4666-8666-666666666666", name: "その他", slug: "other" }
];

export const demoUser = {
  userId: "demo-user",
  name: "のみログユーザー",
  avatarUrl: "飲"
};

export const products: Product[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    name: "クラフトゼロコーラ",
    maker: "Nomi Beverage",
    categoryId: "11111111-1111-4111-8111-111111111111",
    imageUrl: "/products/cola.svg",
    createdAt: "2026-06-18T09:00:00.000Z"
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    name: "柚子スパーク",
    maker: "Kita Citrus",
    categoryId: "11111111-1111-4111-8111-111111111111",
    imageUrl: "/products/citrus.svg",
    createdAt: "2026-06-20T10:30:00.000Z"
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
    name: "深み緑茶 すっきり",
    maker: "山の茶房",
    categoryId: "22222222-2222-4222-8222-222222222222",
    imageUrl: "/products/green-tea.svg",
    createdAt: "2026-06-10T12:00:00.000Z"
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
    name: "朝の微糖ラテ",
    maker: "Daily Roast",
    categoryId: "33333333-3333-4333-8333-333333333333",
    imageUrl: "/products/latte.svg",
    createdAt: "2026-06-11T07:00:00.000Z"
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5",
    name: "雷光エナジー",
    maker: "Volt Lab",
    categoryId: "55555555-5555-4555-8555-555555555555",
    imageUrl: "/products/energy.svg",
    createdAt: "2026-06-22T08:00:00.000Z"
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6",
    name: "まる搾りレモンサワー",
    maker: "北浜酒造",
    categoryId: "44444444-4444-4444-8444-444444444444",
    imageUrl: "/products/lemon-sour.svg",
    createdAt: "2026-06-09T19:00:00.000Z"
  }
];

export const seedReviews: Review[] = [
  {
    id: "r-1",
    userId: "u-1",
    userName: "しゅわ好き",
    productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    rating: 5,
    sweetness: 3,
    carbonation: 4,
    scene: ["昼食", "暑い日"],
    costPerformance: 4,
    purchaseLocation: "セブン",
    comment: "香りがしっかりあって、ゼロ系にありがちな後味の軽さが少ない。",
    createdAt: "2026-06-24T12:20:00.000Z"
  },
  {
    id: "r-2",
    userId: "u-2",
    userName: "駅前レビュー",
    productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    rating: 4,
    sweetness: 2,
    carbonation: 4,
    scene: ["運動後"],
    costPerformance: 5,
    purchaseLocation: "自販機",
    comment: "冷えているとかなりうまい。強炭酸寄りで眠気覚ましにも良い。",
    createdAt: "2026-06-23T17:42:00.000Z"
  },
  {
    id: "r-3",
    userId: "u-3",
    userName: "限定品ハンター",
    productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    rating: 5,
    sweetness: 4,
    carbonation: 3,
    scene: ["暑い日", "夜"],
    costPerformance: 3,
    purchaseLocation: "ローソン",
    comment: "柚子の皮っぽい苦味が少しあって、甘いだけじゃないのが好き。",
    createdAt: "2026-06-25T10:12:00.000Z"
  },
  {
    id: "r-4",
    userId: "u-4",
    userName: "お茶派",
    productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
    rating: 4,
    sweetness: 1,
    carbonation: 0,
    scene: ["朝", "昼食"],
    costPerformance: 5,
    purchaseLocation: "ファミマ",
    comment: "渋すぎず食事に合わせやすい。常備したいタイプ。",
    createdAt: "2026-06-22T08:33:00.000Z"
  },
  {
    id: "r-5",
    userId: "u-5",
    userName: "朝活ラテ",
    productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
    rating: 4,
    sweetness: 3,
    carbonation: 0,
    scene: ["朝"],
    costPerformance: 4,
    purchaseLocation: "スーパー",
    comment: "微糖だけどミルク感がちゃんとある。朝の移動中にちょうどいい。",
    createdAt: "2026-06-21T07:44:00.000Z"
  },
  {
    id: "r-6",
    userId: "u-6",
    userName: "夜更かし",
    productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5",
    rating: 3,
    sweetness: 5,
    carbonation: 3,
    scene: ["夜"],
    costPerformance: 3,
    purchaseLocation: "セブン",
    comment: "甘さは強い。パンチはあるけど飲み切るには気合いがいる。",
    createdAt: "2026-06-20T23:10:00.000Z"
  },
  {
    id: "r-7",
    userId: "u-7",
    userName: "家飲みメモ",
    productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6",
    rating: 4,
    sweetness: 2,
    carbonation: 3,
    scene: ["夜", "暑い日"],
    costPerformance: 4,
    purchaseLocation: "ローソン",
    comment: "レモンの香りが自然。食事中でも重くならない。",
    createdAt: "2026-06-19T20:05:00.000Z"
  }
];

const reviewsKey = "nomilog.reviews.v1";
const requestsKey = "nomilog.productRequests.v1";

export function getCategoryName(categoryId: string) {
  return categories.find((category) => category.id === categoryId)?.name ?? "その他";
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

export function calculateStats(productId: string, reviews: Review[]): ProductStats {
  // 商品ごとの平均値は、表示中のレビュー配列を唯一の入力にして計算する。
  // これによりseedレビュー、localStorageレビュー、Supabaseレビューを混ぜても同じロジックで扱える。
  const productReviews = reviews.filter((review) => review.productId === productId);
  if (productReviews.length === 0) {
    return {
      avgRating: 0,
      avgSweetness: 0,
      avgCarbonation: 0,
      avgCostPerformance: 0,
      reviewCount: 0
    };
  }

  const average = (field: keyof Pick<Review, "rating" | "sweetness" | "carbonation" | "costPerformance">) =>
    productReviews.reduce((sum, review) => sum + Number(review[field]), 0) / productReviews.length;

  return {
    avgRating: average("rating"),
    avgSweetness: average("sweetness"),
    avgCarbonation: average("carbonation"),
    avgCostPerformance: average("costPerformance"),
    reviewCount: productReviews.length
  };
}

export function enrichProducts(reviews: Review[] = seedReviews): ProductWithStats[] {
  // 商品一覧カードでは平均評価やレビュー数も必要になるため、商品マスタに集計値を付与して返す。
  // 元のproducts配列は変更せず、画面ごとに最新レビューから派生データを作る。
  return products.map((product) => ({
    ...product,
    ...calculateStats(product.id, reviews)
  }));
}

export function getRanking(reviews: Review[], limit = 5) {
  // レビュー数だけだと古い商品が固定化され、平均評価だけだと少数レビューの商品が上がりやすい。
  // そのため平均評価を主軸にしつつ、最大10件までのレビュー数を軽く加点してランキングを作る。
  return enrichProducts(reviews)
    .filter((product) => product.reviewCount > 0)
    .sort((a, b) => {
      const weightedA = a.avgRating * 0.7 + Math.min(a.reviewCount, 10) * 0.15;
      const weightedB = b.avgRating * 0.7 + Math.min(b.reviewCount, 10) * 0.15;
      return weightedB - weightedA;
    })
    .slice(0, limit);
}

export function getSimilarProducts(productId: string, reviews: Review[], limit = 6) {
  // MVPのレコメンドは説明可能性を優先し、甘さと炭酸の平均値だけで距離を計算する。
  // 将来はカテゴリや購入場所も加味できるが、ここでは「似た味」の最小実装として保っている。
  const all = enrichProducts(reviews);
  const base = all.find((product) => product.id === productId);
  if (!base) return [];

  return all
    .filter((product) => product.id !== productId && product.reviewCount > 0)
    .map((product) => ({
      product,
      distance: Math.hypot(
        base.avgSweetness - product.avgSweetness,
        base.avgCarbonation - product.avgCarbonation
      )
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((entry) => entry.product);
}

export function readLocalReviews(): Review[] {
  if (typeof window === "undefined") return [];
  try {
    // localStorageは壊れたJSONが入る可能性があるため、読めない場合は空配列に戻す。
    // 画面全体を落とさず、投稿・検索の体験を続けられることを優先する。
    return JSON.parse(window.localStorage.getItem(reviewsKey) ?? "[]") as Review[];
  } catch {
    return [];
  }
}

export function readAllReviews(): Review[] {
  return [...seedReviews, ...readLocalReviews()];
}

export function saveReviewDraft(draft: ReviewDraft): Review {
  // Supabase未設定の開発環境でもレビュー投稿の一連の体験を確認できるよう、
  // localStorageへ保存するレビューを本番DBのReview型に近い形で組み立てる。
  const now = new Date().toISOString();
  const review: Review = {
    id: `local-${crypto.randomUUID()}`,
    userId: demoUser.userId,
    userName: demoUser.name,
    productId: draft.productId,
    rating: draft.rating,
    sweetness: draft.sweetness,
    carbonation: draft.carbonation,
    scene: draft.scene,
    costPerformance: draft.costPerformance,
    purchaseLocation: draft.purchaseLocation,
    comment: draft.comment,
    imageUrl: draft.imageDataUrl,
    createdAt: now,
    updatedAt: now
  };
  const next = [...readLocalReviews(), review];
  try {
    // 画像をData URLで持つと容量を使いやすいため、QuotaExceededErrorはユーザー向けに
    // 写真を外す対処が分かるメッセージへ変換する。
    window.localStorage.setItem(reviewsKey, JSON.stringify(next));
  } catch (error) {
    throw new Error(
      error instanceof DOMException && error.name === "QuotaExceededError"
        ? "画像を含むレビューの保存容量を超えました。写真を外して再投稿してください。"
        : "レビューの保存に失敗しました。もう一度お試しください。"
    );
  }
  // 同じタブ内ではstorageイベントが発火しないため、独自イベントで一覧やランキングを再同期する。
  window.dispatchEvent(new Event("nomilog:reviews"));
  return review;
}

export function deleteLocalReview(reviewId: string) {
  // マイページの削除はMVPではローカルレビューだけを対象にする。
  // 削除後は投稿時と同じイベントを出し、商品詳細やランキングの集計を更新させる。
  const next = readLocalReviews().filter((review) => review.id !== reviewId);
  window.localStorage.setItem(reviewsKey, JSON.stringify(next));
  window.dispatchEvent(new Event("nomilog:reviews"));
}

export function readProductRequests(): ProductRequest[] {
  if (typeof window === "undefined") return [];
  try {
    // 商品リクエストもレビューと同様、壊れたlocalStorageで画面を壊さないよう空配列へ戻す。
    return JSON.parse(window.localStorage.getItem(requestsKey) ?? "[]") as ProductRequest[];
  } catch {
    return [];
  }
}

export function saveProductRequest(name: string) {
  // MVPではユーザーが直接商品マスタを増やさず、リクエストとして残すだけにする。
  // seed管理から運用管理画面へ移すときも、この形なら承認フローへつなげやすい。
  const request: ProductRequest = {
    id: `request-${crypto.randomUUID()}`,
    userId: demoUser.userId,
    name,
    status: "new",
    createdAt: new Date().toISOString()
  };
  window.localStorage.setItem(requestsKey, JSON.stringify([...readProductRequests(), request]));
  return request;
}
