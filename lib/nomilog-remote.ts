import { createClient, hasSupabaseEnv } from "@/lib/supabase";
import type { Review, ReviewDraft } from "@/lib/types";

type ReviewRow = {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  sweetness: number;
  carbonation: number;
  scene: string[];
  cost_performance: number;
  purchase_location: Review["purchaseLocation"];
  comment: string;
  image_url: string | null;
  created_at: string;
  updated_at: string | null;
  profiles?: { name?: string | null } | { name?: string | null }[] | null;
};

export function canUseRemoteData() {
  // SupabaseのURLと匿名キーがある環境だけ、リモートDBを使う。
  // 未設定ならローカルデモとして動かし、開発者が.envなしでもUIを確認できる。
  return hasSupabaseEnv();
}

export async function fetchRemoteReviews(): Promise<Review[]> {
  if (!canUseRemoteData()) return [];
  const supabase = createClient();
  if (!supabase) return [];

  // reviewsとprofilesをまとめて取得し、レビュー一覧で投稿者名を表示できる形にする。
  // 取得に失敗してもローカルレビュー表示は継続したいため、呼び出し元には空配列を返す。
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id,user_id,product_id,rating,sweetness,carbonation,scene,cost_performance,purchase_location,comment,image_url,created_at,updated_at,profiles(name)"
    )
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as ReviewRow[]).map(toReview);
}

export async function saveRemoteReviewDraft(draft: ReviewDraft): Promise<Review> {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabaseの接続情報が見つかりません。");

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Supabase接続時はレビュー投稿にログインが必要です。マイページからログインしてください。");
  }

  let imageUrl: string | undefined;
  if (draft.imageDataUrl) {
    // フォームではプレビューしやすいData URLで画像を持つため、送信直前にBlobへ戻す。
    // Storageのパスはuser.id配下にし、RLSで本人だけが差し替え・削除できる構造に揃える。
    const blob = await fetch(draft.imageDataUrl).then((response) => response.blob());
    const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("review-images").upload(path, blob, {
      contentType: blob.type,
      upsert: false
    });
    if (uploadError) throw new Error("写真のアップロードに失敗しました。");
    imageUrl = supabase.storage.from("review-images").getPublicUrl(path).data.publicUrl;
  }

  // reviewsへのinsertはDB側の制約とトリガーに任せる。成功時はprofilesを結合して取り直し、
  // 画面で使うReview型へ変換して呼び出し元に返す。
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      user_id: user.id,
      product_id: draft.productId,
      rating: draft.rating,
      sweetness: draft.sweetness,
      carbonation: draft.carbonation,
      scene: draft.scene,
      cost_performance: draft.costPerformance,
      purchase_location: draft.purchaseLocation,
      comment: draft.comment,
      image_url: imageUrl
    })
    .select(
      "id,user_id,product_id,rating,sweetness,carbonation,scene,cost_performance,purchase_location,comment,image_url,created_at,updated_at,profiles(name)"
    )
    .single();

  if (error || !data) throw new Error(error?.message ?? "レビュー投稿に失敗しました。");
  return toReview(data as ReviewRow);
}

function toReview(row: ReviewRow): Review {
  // Supabaseのsnake_case行を、Reactコンポーネントで扱いやすいcamelCaseのReview型へ変換する。
  // profilesはSupabaseの型推論で配列になる場合があるため、単一プロフィールへ正規化してから読む。
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

  return {
    id: row.id,
    userId: row.user_id,
    userName: profile?.name ?? "のみログユーザー",
    productId: row.product_id,
    rating: row.rating,
    sweetness: row.sweetness,
    carbonation: row.carbonation as Review["carbonation"],
    scene: row.scene as Review["scene"],
    costPerformance: row.cost_performance,
    purchaseLocation: row.purchase_location,
    comment: row.comment,
    imageUrl: row.image_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined
  };
}
