export type CategorySlug = "soda" | "tea" | "coffee" | "alcohol" | "energy" | "other";

export type PurchaseLocation =
  | "セブン"
  | "ローソン"
  | "ファミマ"
  | "自販機"
  | "スーパー"
  | "その他";

export type SceneTag = "朝" | "運動後" | "昼食" | "夜" | "暑い日";

// 炭酸だけは「なし」を表す0を持つため、他の5段階評価とは違って0〜4で扱う。
// 表示文言への変換はnomilog-data.tsのcarbonationLabelsに集約する。
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
  productId: string;
  rating: number;
  sweetness: number;
  carbonation: CarbonationLevel;
  scene: SceneTag[];
  costPerformance: number;
  purchaseLocation: PurchaseLocation;
  comment: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
};

// 商品リクエストはMVPでは商品マスタを直接増やさないための受け皿。
// statusを持たせておくことで、後から承認・却下の運用フローへ広げられる。
export type ProductRequest = {
  id: string;
  userId: string;
  name: string;
  maker?: string;
  note?: string;
  status: "new" | "reviewing" | "added" | "rejected";
  createdAt: string;
};

// Product本体はマスタ情報だけを持ち、レビュー由来の平均値はProductStatsとして分ける。
// 画面ではProductWithStatsに合成して使い、集計の入力元をレビュー配列に限定する。
export type ProductStats = {
  avgRating: number;
  avgSweetness: number;
  avgCarbonation: number;
  avgCostPerformance: number;
  reviewCount: number;
};

export type ProductWithStats = Product & ProductStats;

// フォーム入力中の値。保存先がlocalStorageでもSupabaseでも同じ形を渡せるようにし、
// imageDataUrlはプレビュー兼アップロード元として任意で持たせる。
export type ReviewDraft = {
  productId: string;
  rating: number;
  sweetness: number;
  carbonation: CarbonationLevel;
  scene: SceneTag[];
  costPerformance: number;
  purchaseLocation: PurchaseLocation;
  comment: string;
  imageDataUrl?: string;
};
