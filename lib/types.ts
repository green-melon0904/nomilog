export type CategorySlug = "soda" | "tea" | "coffee" | "alcohol" | "energy" | "other";

export type PurchaseLocation =
  | "セブン"
  | "ローソン"
  | "ファミマ"
  | "自販機"
  | "スーパー"
  | "その他";

export type SceneTag = "朝" | "運動後" | "昼食" | "夜" | "暑い日";

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

export type ProductRequest = {
  id: string;
  userId: string;
  name: string;
  maker?: string;
  note?: string;
  status: "new" | "reviewing" | "added" | "rejected";
  createdAt: string;
};

export type ProductStats = {
  avgRating: number;
  avgSweetness: number;
  avgCarbonation: number;
  avgCostPerformance: number;
  reviewCount: number;
};

export type ProductWithStats = Product & ProductStats;

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
