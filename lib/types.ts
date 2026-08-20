/**
 * 商品検索やカテゴリ表示で使う、DBと画面の両方で安定したカテゴリ識別子。
 * 表示名を識別子にすると文言変更で保存済みデータやURLが壊れるため、画面に出す日本語とは
 * 分離したslugを型で制限する。
 */
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
  // 仮運用では運営カタログの商品だけをレビュー対象にし、全レビューを商品詳細・集計へ結び付ける。
  productId: string;
  productName: string;
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
  // 商品IDは画面の選択値とサーバーの実在確認を通る。未登録飲料の自由入力は仮運用では許可しない。
  productId: string;
  productName: string;
  rating: number;
  sweetness: number;
  carbonation: CarbonationLevel;
  scene: SceneTag[];
  costPerformance: number;
  purchaseLocation: PurchaseLocation;
  comment: string;
  imageDataUrl?: string;
  // 編集時だけ使う。新しい画像と同時に指定する曖昧な要求はAPI側で拒否する。
  removeImage?: boolean;
};
