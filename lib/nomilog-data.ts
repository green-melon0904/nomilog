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

// 公開前の仮運用で使う20品目のカタログ。公開時は仮レビュー・いいね・画像を削除してから、
// 実在商品を新しい商品IDで登録する。仮データの名称だけを差し替えると、テスト投稿が実在商品の
// 評価として残るため、ユーザー入力で商品を増やさないことと同じくデータの意味を明確に保つ。
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
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0007",
    name: "静かな強炭酸水",
    maker: "Mizuno Works",
    categoryId: "11111111-1111-4111-8111-111111111111",
    imageUrl: "/products/citrus.svg",
    createdAt: "2026-06-16T08:20:00.000Z"
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0008",
    name: "塩ライムソーダ",
    maker: "Sora Craft",
    categoryId: "11111111-1111-4111-8111-111111111111",
    imageUrl: "/products/citrus.svg",
    createdAt: "2026-06-14T11:40:00.000Z"
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0009",
    name: "夜ふかしジンジャー",
    maker: "Tonic Lab",
    categoryId: "11111111-1111-4111-8111-111111111111",
    imageUrl: "/products/cola.svg",
    createdAt: "2026-06-13T19:10:00.000Z"
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0010",
    name: "香ばし麦茶",
    maker: "山の茶房",
    categoryId: "22222222-2222-4222-8222-222222222222",
    imageUrl: "/products/green-tea.svg",
    createdAt: "2026-06-17T07:50:00.000Z"
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0011",
    name: "白桃ジャスミン茶",
    maker: "Mellow Tea",
    categoryId: "22222222-2222-4222-8222-222222222222",
    imageUrl: "/products/green-tea.svg",
    createdAt: "2026-06-12T14:30:00.000Z"
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0012",
    name: "ほうじ茶ラテ",
    maker: "Kissa Origin",
    categoryId: "22222222-2222-4222-8222-222222222222",
    imageUrl: "/products/latte.svg",
    createdAt: "2026-06-08T09:10:00.000Z"
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0013",
    name: "ブラックモカ",
    maker: "Daily Roast",
    categoryId: "33333333-3333-4333-8333-333333333333",
    imageUrl: "/products/cola.svg",
    createdAt: "2026-06-15T06:45:00.000Z"
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0014",
    name: "深煎りカフェオレ",
    maker: "Daily Roast",
    categoryId: "33333333-3333-4333-8333-333333333333",
    imageUrl: "/products/latte.svg",
    createdAt: "2026-06-11T10:20:00.000Z"
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0015",
    name: "オーツミルクラテ",
    maker: "North Cup",
    categoryId: "33333333-3333-4333-8333-333333333333",
    imageUrl: "/products/latte.svg",
    createdAt: "2026-06-07T15:00:00.000Z"
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0016",
    name: "微炭酸チューハイ レモン",
    maker: "北浜酒造",
    categoryId: "44444444-4444-4444-8444-444444444444",
    imageUrl: "/products/lemon-sour.svg",
    createdAt: "2026-06-18T20:00:00.000Z"
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0017",
    name: "桃香るサワー",
    maker: "Sakura Spirits",
    categoryId: "44444444-4444-4444-8444-444444444444",
    imageUrl: "/products/lemon-sour.svg",
    createdAt: "2026-06-10T21:15:00.000Z"
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0018",
    name: "クラフトハイボール",
    maker: "Amber House",
    categoryId: "44444444-4444-4444-8444-444444444444",
    imageUrl: "/products/lemon-sour.svg",
    createdAt: "2026-06-06T18:35:00.000Z"
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0019",
    name: "シトラスエナジー",
    maker: "Volt Lab",
    categoryId: "55555555-5555-4555-8555-555555555555",
    imageUrl: "/products/energy.svg",
    createdAt: "2026-06-19T13:40:00.000Z"
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0020",
    name: "ナイトベリーエナジー",
    maker: "Volt Lab",
    categoryId: "55555555-5555-4555-8555-555555555555",
    imageUrl: "/products/energy.svg",
    createdAt: "2026-06-05T22:10:00.000Z"
  }
];

export const seedReviews: Review[] = [
  {
    id: "r-1",
    userId: "u-1",
    userName: "しゅわ好き",
    productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    productName: "クラフトゼロコーラ",
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
    productName: "クラフトゼロコーラ",
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
    productName: "柚子スパーク",
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
    productName: "深み緑茶 すっきり",
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
    productName: "朝の微糖ラテ",
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
    productName: "雷光エナジー",
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
    productName: "まる搾りレモンサワー",
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
type StoredReview = Omit<Review, "purchaseLocation" | "productId" | "productName"> & {
  productId?: string;
  productName?: string;
  purchaseLocation?: string;
};

/**
 * カテゴリIDを画面表示用の日本語名へ変換し、未知のIDは「その他」へ退避する。
 * DBや将来のseedに新しいIDが混ざってもカードの表示を空欄にせず、検索や商品詳細を継続できる
 * よう、表示層では未知値を例外にしない。
 */
export function getCategoryName(categoryId: string) {
  return categories.find((category) => category.id === categoryId)?.name ?? "その他";
}

/**
 * ISO形式の日付を、レビューカードで使う月日表記へ変換する。
 * 保存形式と表示形式を分けておくことで、並び替えはタイムゾーンに依存しないISO値で行い、
 * 表示だけを日本語ロケールへ揃えられる。
 */
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

/**
 * 商品マスタを変更せず、現在のレビュー配列から表示用の集計値を合成する。
 * seedや端末内投稿を含む最新のレビューを画面へ反映するため、マスタに保存された古い集計値を
 * 上書きせず、表示時だけ導出値を重ねる。
 */
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

const weeklyRankingDurationMs = 7 * 24 * 60 * 60 * 1000;
const ratingPriorReviewCount = 3;
const maxLikesPerReview = 2;
const fullyReliableReviewCount = 3;

/**
 * 直近7日間の評価と、1レビューあたりのいいねを使ってホーム用ランキングを作る。
 *
 * 平均評価は全レビューの週次平均へ3件分だけ寄せる。加えて、評価の信頼度は3件で上限にする。
 * これにより評価1件だけの5.0が偶然1位になるのを防ぎつつ、件数そのものを人気の代理指標に
 * しない。いいねは合計ではなくレビューあたりで正規化し、各投稿がどれだけ支持されたかを反映する。
 *
 * @param now 集計基準時刻。テストでは固定時刻を渡し、画面では現在時刻を使う。
 */
export function getWeeklyRanking(
  reviews: Review[],
  limit = 5,
  catalog: Product[] = products,
  now = new Date()
) {
  const nowTime = now.getTime();
  const rankingStartTime = nowTime - weeklyRankingDurationMs;
  const weeklyReviews = reviews.filter((review) => {
    const createdAt = Date.parse(review.createdAt);
    return createdAt >= rankingStartTime && createdAt <= nowTime;
  });

  if (weeklyReviews.length === 0) return [];

  const weeklyAverageRating = weeklyReviews.reduce((total, review) => total + review.rating, 0) / weeklyReviews.length;

  return enrichProducts(weeklyReviews, catalog)
    .filter((product) => product.reviewCount > 0)
    .map((product) => {
      const productReviews = weeklyReviews.filter((review) => review.productId === product.id);
      const totalLikes = productReviews.reduce((total, review) => total + (review.likeCount ?? 0), 0);
      const likesPerReview = totalLikes / productReviews.length;
      const adjustedRating =
        (product.avgRating * product.reviewCount + weeklyAverageRating * ratingPriorReviewCount) /
        (product.reviewCount + ratingPriorReviewCount);
      const reviewReliability = Math.min(product.reviewCount / fullyReliableReviewCount, 1);

      // 評価・支持度・評価の信頼度を0〜1へ揃えてから比較する。信頼度は3件で飽和するため、
      // 大量投稿による人気順には戻らず、少数の偶然の高評価だけを抑える役割に限定される。
      const score =
        (adjustedRating / 5) * 0.5 +
        (Math.min(likesPerReview, maxLikesPerReview) / maxLikesPerReview) * 0.2 +
        reviewReliability * 0.3;

      return { product, score, adjustedRating, likesPerReview, reviewReliability };
    })
    .sort((first, second) =>
      second.score - first.score ||
      second.adjustedRating - first.adjustedRating ||
      second.likesPerReview - first.likesPerReview ||
      second.reviewReliability - first.reviewReliability ||
      first.product.name.localeCompare(second.product.name, "ja") ||
      first.product.id.localeCompare(second.product.id)
    )
    .slice(0, limit)
    .map(({ product }) => product);
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
 * 仮運用ではカタログ外の投稿を残さないため、旧UIで保存した未登録飲料もここで削除する。
 * 直接localStorageを編集した値まで一覧へ混ぜず、商品詳細・集計の前提を画面側でも保つ。
 */
export function readLocalReviews(): Review[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(reviewsKey) ?? "[]") as StoredReview[];
    let migrated = false;
    const reviews = stored.flatMap((review): Review[] => {
      const product = typeof review.productId === "string" ? products.find((item) => item.id === review.productId) : undefined;
      if (!product) {
        // 旧仕様の未登録飲料は公開前のカタログ運用へ持ち込まず、読込時に端末からも削除する。
        migrated = true;
        return [];
      }

      // 旧UIで保存した「セブン」は新しい選択肢「セブン-イレブン」へ読み込み時に正規化する。
      const purchaseLocation = normalizePurchaseLocation(review.purchaseLocation);
      if (purchaseLocation !== review.purchaseLocation || review.productName !== product.name) migrated = true;
      return [{ ...review, productId: product.id, productName: product.name, purchaseLocation }];
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

/**
 * seedレビューと端末内レビューを、画面が扱う単一の配列へまとめる。
 * 開発デモの投稿も公開レビューと同じ一覧・集計経路へ乗せることで、保存先ごとの分岐が画面に
 * 増えることを防ぐ。本番のリモートレビュー追加は別の同期フックでこの配列へ重ねる。
 */
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
  const product = products.find((item) => item.id === draft.productId);
  if (!product) throw new Error("カタログから飲み物を選択してください。");

  const now = new Date().toISOString();
  const review: Review = {
    id: `local-${crypto.randomUUID()}`,
    userId: demoUser.userId,
    userName: demoUser.name,
    productId: product.id,
    productName: product.name,
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

/**
 * Supabase未設定時の本人レビューを、投稿時と同じReview型のまま更新する。
 *
 * seedレビューは確認環境の共有データなので編集対象にせず、localStorageに保存したdemo-userの行だけを
 * 変更する。本番APIと同じく作成日時は保持し、画像を変更しない更新では既存画像を失わない。
 */
export function updateLocalReview(reviewId: string, draft: ReviewDraft, expectedUpdatedAt: string): Review {
  const product = products.find((item) => item.id === draft.productId);
  const reviews = readLocalReviews();
  const existing = reviews.find((review) => review.id === reviewId && review.userId === demoUser.userId);
  if (!product) throw new Error("カタログから飲み物を選択してください。");
  if (!existing) throw new Error("編集するレビューが見つかりません。");
  if ((existing.updatedAt ?? existing.createdAt) !== expectedUpdatedAt) {
    throw new Error("別の画面でレビューが更新されています。画面を開き直してください。");
  }

  const updated: Review = {
    ...existing,
    productId: product.id,
    productName: product.name,
    rating: draft.rating,
    sweetness: draft.sweetness,
    carbonation: draft.carbonation,
    scene: draft.scene,
    costPerformance: draft.costPerformance,
    purchaseLocation: draft.purchaseLocation,
    comment: draft.comment,
    imageUrl: draft.imageDataUrl ?? (draft.removeImage ? undefined : existing.imageUrl),
    updatedAt: new Date().toISOString()
  };
  const next = reviews.map((review) => review.id === reviewId ? updated : review);

  try {
    window.localStorage.setItem(reviewsKey, JSON.stringify(next));
  } catch (error) {
    throw new Error(
      error instanceof DOMException && error.name === "QuotaExceededError"
        ? "画像を含むレビューの保存容量を超えました。写真を外して更新してください。"
        : "レビューの更新に失敗しました。もう一度お試しください。"
    );
  }
  window.dispatchEvent(new Event("nomilog:reviews"));
  return updated;
}

/**
 * 端末内レビューを削除し、同じタブの各画面へ再計算イベントを通知する。
 * storageイベントは変更元と同じタブには届かないため、独自イベントも発火してホームや詳細の
 * 件数・ランキングを削除直後に更新する。
 */
export function deleteLocalReview(reviewId: string) {
  const next = readLocalReviews().filter((review) => review.id !== reviewId);
  window.localStorage.setItem(reviewsKey, JSON.stringify(next));
  window.dispatchEvent(new Event("nomilog:reviews"));
}
