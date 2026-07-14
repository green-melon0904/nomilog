/**
 * のみログのローカルデータ層。
 *
 * seed・localStorage・Supabase由来のレビューを同じReview型へ揃え、画面がどの保存先を
 * 使っているかを意識せずに集計・検索できるようにする。ブラウザ専用処理は関数内で
 * windowの有無を確認し、Server Componentから誤って呼ばれてもクラッシュさせない。
 */
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
  "セブン-イレブン",
  "ローソン",
  "ファミマ",
  "スーパー",
  "ドラッグストア",
  "自販機",
  "Amazon",
  "その他"
];

export const sceneTags: SceneTag[] = [
  "リフレッシュ",
  "風呂あがり",
  "仕事・勉強中",
  "食事と一緒に",
  "リラックス",
  "スポーツの後"
];

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

// 商品を選ばずに投稿を始めるMVP導線では、この代表商品へレビューを紐づける。
// 配列の並び順に依存するとseed商品の追加・並び替えで投稿先が変わるため、固定IDで参照する。
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
    purchaseLocation: "セブン-イレブン",
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
    purchaseLocation: "セブン-イレブン",
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
type StoredReview = Omit<Review, "purchaseLocation"> & { purchaseLocation?: string };

/** カテゴリIDを画面表示用の日本語名へ変換し、未知のIDは「その他」へ退避する。 */
export function getCategoryName(categoryId: string) {
  return categories.find((category) => category.id === categoryId)?.name ?? "その他";
}

/** ISO形式の日付を、レビューカードで使う月日表記へ変換する。 */
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

/**
 * 指定商品のレビューから、画面表示用の平均値を計算する。
 *
 * 集計元を引数の配列だけに限定することで、seed・localStorage・Supabaseのレビューが
 * 混在しても同じ結果を得られる。レビューがない商品は0を返し、カード側の分岐を増やさない。
 */
export function calculateStats(productId: string, reviews: Review[]): ProductStats {
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

/** 商品マスタを変更せず、現在のレビュー配列から表示用の集計値を合成する。 */
export function enrichProducts(reviews: Review[] = seedReviews, catalog: Product[] = products): ProductWithStats[] {
  return catalog.map((product) => ({
    ...product,
    ...calculateStats(product.id, reviews)
  }));
}

/**
 * 平均評価とレビュー数を組み合わせてランキングを作る。
 *
 * 平均評価だけでは1件だけの高評価が上位に偏り、レビュー数だけでは古い商品が固定化する。
 * そこで評価を70%、レビュー数による加点を最大1.5点までとして、少数レビューと人気の偏りを抑える。
 */
export function getRanking(reviews: Review[], limit = 5, catalog: Product[] = products) {
  return enrichProducts(reviews, catalog)
    .filter((product) => product.reviewCount > 0)
    .sort((a, b) => {
      const weightedA = a.avgRating * 0.7 + Math.min(a.reviewCount, 10) * 0.15;
      const weightedB = b.avgRating * 0.7 + Math.min(b.reviewCount, 10) * 0.15;
      return weightedB - weightedA;
    })
    .slice(0, limit);
}

/**
 * 甘さと炭酸の平均値を2次元座標として、指定商品に近い商品を返す。
 *
 * MVPではユーザーへ説明しやすい指標だけを使う。カテゴリや購入場所を増やすと推薦理由が
 * 不透明になりやすいため、追加条件は推薦精度を検証してから導入する。
 */
export function getSimilarProducts(productId: string, reviews: Review[], limit = 6, catalog: Product[] = products) {
  const all = enrichProducts(reviews, catalog);
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

/**
 * localStorageから投稿レビューを読み込む。
 *
 * ブラウザ拡張や手動編集で壊れた値が入る可能性があるため、読み込み失敗は空配列へ戻す。
 * これは画面全体を壊すより、投稿や検索を継続できることを優先するためのフォールバック。
 */
export function readLocalReviews(): Review[] {
  if (typeof window === "undefined") return [];
  try {
    // localStorageは壊れたJSONが入る可能性があるため、読めない場合は空配列に戻す。
    // 画面全体を落とさず、投稿・検索の体験を続けられることを優先する。
    const stored = JSON.parse(window.localStorage.getItem(reviewsKey) ?? "[]") as StoredReview[];
    let migrated = false;
    const reviews: Review[] = stored.map((review) => {
      // 旧UIで保存した「セブン」は新しい選択肢「セブン-イレブン」へ読み込み時に正規化する。
      // 既存レビューを消さず、新しい検索・購入場所表示で同じ値として扱えるようにする移行処理。
      const purchaseLocation = normalizePurchaseLocation(review.purchaseLocation);
      if (purchaseLocation !== review.purchaseLocation) migrated = true;
      return { ...review, purchaseLocation };
    });
    if (migrated) window.localStorage.setItem(reviewsKey, JSON.stringify(reviews));
    return reviews;
  } catch {
    return [];
  }
}

function normalizePurchaseLocation(value: string | undefined): PurchaseLocation {
  if (value === "セブン") return "セブン-イレブン";
  return purchaseLocations.includes(value as PurchaseLocation) ? (value as PurchaseLocation) : "その他";
}

/** seedレビューと端末内レビューを、画面が扱う単一の配列へまとめる。 */
export function readAllReviews(): Review[] {
  return [...seedReviews, ...readLocalReviews()];
}

/**
 * Supabaseが未設定の開発環境向けに、投稿内容をlocalStorageへ保存する。
 *
 * 本番のReview型と同じ形へ変換してから保存することで、データソースを切り替えても
 * 集計・一覧表示のコードを分岐させずに済む。画像付きレビューは容量超過を明示する。
 */
export function saveReviewDraft(draft: ReviewDraft): Review {
  const now = new Date().toISOString();
  const review: Review = {
    id: `local-${crypto.randomUUID()}`,
    userId: demoUser.userId,
    userName: demoUser.name,
    productId: draft.productId,
    productName: draft.productName,
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

/** 端末内レビューを削除し、同じタブの各画面へ再計算イベントを通知する。 */
export function deleteLocalReview(reviewId: string) {
  const next = readLocalReviews().filter((review) => review.id !== reviewId);
  window.localStorage.setItem(reviewsKey, JSON.stringify(next));
  window.dispatchEvent(new Event("nomilog:reviews"));
}

/** 端末内に保存した商品リクエストを読み込み、壊れた値は空配列へ退避する。 */
export function readProductRequests(): ProductRequest[] {
  if (typeof window === "undefined") return [];
  try {
    // 商品リクエストもレビューと同様、壊れたlocalStorageで画面を壊さないよう空配列へ戻す。
    return JSON.parse(window.localStorage.getItem(requestsKey) ?? "[]") as ProductRequest[];
  } catch {
    return [];
  }
}

/**
 * 検索で見つからない飲み物を、即時の商品追加ではなく運用確認用リクエストとして保存する。
 * 商品マスタをユーザー入力で直接変更しないため、誤表記が検索結果へ混入するのを防げる。
 */
export function saveProductRequest(name: string) {
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
