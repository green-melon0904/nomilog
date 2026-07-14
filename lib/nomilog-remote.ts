/**
 * Supabaseの公開読み取りとレビュー投稿APIの境界。
 *
 * 商品・レビューの匿名読み取りはブラウザClientで行う一方、WorkOSのアクセストークンを
 * 必要とする保存処理はRoute Handlerへ委譲する。こうしてHttpOnly CookieとJWTをブラウザへ出さない。
 */
import { createClient, hasSupabaseEnv } from "@/lib/supabase";
import type { Product, Review, ReviewDraft } from "@/lib/types";

type ProductRow = {
  id: string;
  name: string;
  maker: string;
  category_id: string;
  image_url: string;
  created_at: string;
};

type ReviewRow = {
  id: string;
  user_id: string;
  product_id: string | null;
  product_name: string;
  rating: number;
  sweetness: number;
  carbonation: number;
  scene: string[];
  cost_performance: number;
  purchase_location: Review["purchaseLocation"];
  comment: string;
  image_url: string | null;
  like_count: number;
  created_at: string;
  updated_at: string | null;
  profiles?: { name?: string | null } | { name?: string | null }[] | null;
};

/**
 * 公開Supabase設定がそろっている場合だけ、画面の読み取り先をリモートへ切り替える。
 * 設定途中の開発環境でもseed表示を壊さず、公開キーの不足を理由に検索・レビュー画面全体を
 * エラーにしないため、接続可否をこのデータ層に閉じ込める。
 */
export function canUseRemoteData() {
  return hasSupabaseEnv();
}

/**
 * Supabaseの商品マスタを取得し、画面用のcamelCase型へ変換する。
 * 接続未設定・取得失敗は空配列にして、ローカルseed表示を継続できるようにする。
 */
export async function fetchRemoteProducts(): Promise<Product[]> {
  if (!canUseRemoteData()) return [];
  const supabase = createClient();
  if (!supabase) return [];

  // 商品名候補だけでなく検索・商品詳細でも同じ商品マスタを使うため、
  // Supabaseへ追加された商品をseed商品と同じcamelCaseのProductへ変換する。
  const { data, error } = await supabase
    .from("products")
    .select("id,name,maker,category_id,image_url,created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as ProductRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    maker: row.maker,
    categoryId: row.category_id,
    imageUrl: row.image_url,
    createdAt: row.created_at
  }));
}

/**
 * 公開レビューと投稿者プロフィール名をまとめて取得する。
 * プロフィールの関連結果が単体・配列どちらで返ってもtoReviewで正規化する。
 */
export async function fetchRemoteReviews(): Promise<Review[]> {
  if (!canUseRemoteData()) return [];
  const supabase = createClient();
  if (!supabase) return [];

  // reviewsとprofilesをまとめて取得し、レビュー一覧で投稿者名を表示できる形にする。
  // 取得に失敗してもローカルレビュー表示は継続したいため、呼び出し元には空配列を返す。
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id,user_id,product_id,product_name,rating,sweetness,carbonation,scene,cost_performance,purchase_location,comment,image_url,like_count,created_at,updated_at,profiles(name)"
    )
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as ReviewRow[]).map(toReview);
}

/**
 * 投稿内容を認証済みRoute Handlerへ送り、WorkOS JWT付きでSupabaseへ保存する。
 * Cookieをブラウザ側のAuthorizationヘッダーへ移さないことで、アクセストークンの公開を避ける。
 */
export async function saveRemoteReviewDraft(draft: ReviewDraft): Promise<void> {
  const response = await fetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft)
  });
  const result = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(result?.error ?? "レビュー投稿に失敗しました。");
}

/**
 * Supabase行のsnake_caseを、画面共通のReview型へ変換する。
 * DBの命名規則をコンポーネントへ持ち込まないことで、localStorage由来のcamelCaseレビューと
 * 同じ一覧・集計関数を使い、保存先による表示差を作らない。
 */
function toReview(row: ReviewRow): Review {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

  return {
    id: row.id,
    userId: row.user_id,
    userName: profile?.name ?? "のみログユーザー",
    productId: row.product_id ?? undefined,
    productName: row.product_name,
    rating: row.rating,
    sweetness: row.sweetness,
    carbonation: row.carbonation as Review["carbonation"],
    scene: row.scene as Review["scene"],
    costPerformance: row.cost_performance,
    purchaseLocation: row.purchase_location,
    comment: row.comment,
    imageUrl: row.image_url ?? undefined,
    likeCount: row.like_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined
  };
}
