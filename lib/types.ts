/** 商品検索やカテゴリ表示で使う、DBと画面の両方で安定したカテゴリ識別子。 */
export type CategorySlug = "soda" | "tea" | "coffee" | "alcohol" | "energy" | "other";

export type PurchaseLocation =
  | "セブン-イレブン"
  | "ローソン"
  | "ファミマ"
  | "スーパー"
  | "ドラッグストア"
  | "自販機"
  | "Amazon"
  | "その他";

/**
 * レビューを飲む場面として選べるタグ。
 *
 * seedデータと投稿フォームで同じ型を共有し、Supabaseのtext[]へそのまま保存できるようにする。
 * 新しい表示文言を追加する場合は、投稿APIとDBのCHECK制約も同時に確認する。
 */
export type SceneTag =
  | "朝"
  | "運動後"
  | "昼食"
  | "夜"
  | "暑い日"
  | "リフレッシュ"
  | "風呂あがり"
  | "仕事・勉強中"
  | "食事と一緒に"
  | "リラックス"
  | "スポーツの後";

/**
 * 炭酸の強さを表す保存値。
 *
 * 「なし」を0で表すため、甘さやコスパの1〜5評価とは別の範囲を持つ。
 * 画面に出す日本語はnomilog-data.tsのcarbonationLabelsで一元変換する。
 */
export type CarbonationLevel = 0 | 1 | 2 | 3 | 4;

export type Profile = {
  userId: string;
  name: string;
  avatarUrl: string;
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  slug: CategorySlug;
};

export type Product = {
  id: string;
  name: string;
  maker: string;
  categoryId: string;
  imageUrl: string;
  createdAt: string;
};

export type Review = {
  id: string;
  userId: string;
  userName: string;
  /** 既存商品に紐づく場合だけ保持し、未登録飲料ではundefinedにする。 */
  productId?: string;
  productName?: string;
  rating: number;
  sweetness: number;
  carbonation: CarbonationLevel;
  scene: SceneTag[];
  costPerformance: number;
  purchaseLocation: PurchaseLocation;
  comment: string;
  imageUrl?: string;
  /**
   * DB側のトリガーで集計されたいいね数。
   * seedレビューにはDB行がないため未設定を許し、表示時は0件へフォールバックする。
   */
  likeCount?: number;
  createdAt: string;
  updatedAt?: string;
};

/** 商品マスタへ即時登録せず、運用側の確認待ちとして受け付けるリクエスト。 */
export type ProductRequest = {
  id: string;
  userId: string;
  name: string;
  maker?: string;
  note?: string;
  status: "new" | "reviewing" | "added" | "rejected";
  createdAt: string;
};

/**
 * レビューから導出する商品評価。
 *
 * Product本体へ直接書き込まず別型に分けることで、seed・localStorage・DBのレビューを
 * 同じ計算経路へ通し、商品マスタの値と表示上の集計値が混ざるのを防ぐ。
 */
export type ProductStats = {
  avgRating: number;
  avgSweetness: number;
  avgCarbonation: number;
  avgCostPerformance: number;
  reviewCount: number;
};

export type ProductWithStats = Product & ProductStats;

/**
 * 投稿フォームから保存処理へ渡す値。
 *
 * 保存先がlocalStorageでもSupabaseでも同じ形を使えるようにし、画像はブラウザ側の
 * プレビューとサーバー側のStorageアップロードに共用できるData URLで受け渡す。
 */
export type ReviewDraft = {
  /** 既存商品の候補を選んだ場合だけ設定する。 */
  productId?: string;
  productName: string;
  rating: number;
  sweetness: number;
  carbonation: CarbonationLevel;
  scene: SceneTag[];
  costPerformance: number;
  purchaseLocation: PurchaseLocation;
  comment: string;
  imageDataUrl?: string;
};
