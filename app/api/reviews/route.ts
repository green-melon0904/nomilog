/**
 * 認証済みレビュー投稿のRoute Handler。
 *
 * ブラウザから受け取った入力をサーバーでも再検証し、WorkOSのJWTを付けたSupabase Clientで
 * RLSを通過させる。画面側のバリデーションは操作性のため、ここでの検証は改ざんされたHTTP
 * リクエストからDB制約と他ユーザーのデータを守るために必要になる。
 */
import { randomUUID } from "node:crypto";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createWorkOSSupabaseClient } from "@/lib/supabase-server";
import { hasWorkOSAuthConfig } from "@/lib/workos";
import type { CarbonationLevel, PurchaseLocation, SceneTag } from "@/lib/types";

const maxImageBytes = 2 * 1024 * 1024;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const purchaseLocations = new Set<PurchaseLocation>([
  "セブン-イレブン",
  "ローソン",
  "ファミマ",
  "スーパー",
  "ドラッグストア",
  "自販機",
  "Amazon",
  "その他"
]);
const sceneTags = new Set<SceneTag>([
  "朝",
  "運動後",
  "昼食",
  "夜",
  "暑い日",
  "リフレッシュ",
  "風呂あがり",
  "仕事・勉強中",
  "食事と一緒に",
  "リラックス",
  "スポーツの後"
]);

type ValidReview = {
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

/**
 * ログイン中のユーザーが入力したレビューを検証し、画像があればStorageへ保存する。
 * 画面側の確認を通らない直接リクエストも同じ検証・認証・RLS境界へ通し、入力値の改ざんで
 * 他人のレビューや商品集計を操作できないようにする。
 */
export async function POST(request: NextRequest) {
  if (!hasWorkOSAuthConfig()) {
    return NextResponse.json({ error: "ログイン設定が完了していません。" }, { status: 503 });
  }

  // 投稿はブラウザからの同一オリジン操作だけを受け付ける。
  // AuthKitのCookieが万一クロスサイトで送られる設定になっても、他サイトからのCSRF投稿を防ぐ。
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }

  const auth = await withAuth();
  if (!auth.user || !auth.accessToken) {
    return NextResponse.json({ error: "レビュー投稿にはログインが必要です。" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const review = parseReview(payload);
  if (!review) {
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  try {
    const supabase = createWorkOSSupabaseClient(auth.accessToken);

    // productIdと商品名をDBの実データで照合する。IDだけを信頼すると、別商品の評価を
    // 任意の商品へ紐づけてランキングや平均値を汚染できるため、表示名も正規化して比較する。
    if (review.productId) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, name")
        .eq("id", review.productId)
        .maybeSingle();
      if (productError || !product || normalizeProductName(product.name) !== normalizeProductName(review.productName)) {
        return NextResponse.json({ error: "選択した商品を確認してください。" }, { status: 400 });
      }
    }

    const profileName = [auth.user.firstName, auth.user.lastName].filter(Boolean).join(" ") || auth.user.email.split("@")[0] || "のみログユーザー";

    // 初回投稿時だけプロフィール行を用意する。既存行を更新しないことで、プロフィール編集で
    // 保存した表示名が、レビュー投稿のたびにWorkOSの初期名へ戻ることを防ぐ。
    const { error: profileError } = await supabase.from("profiles").upsert(
      { user_id: auth.user.id, name: profileName },
      { onConflict: "user_id", ignoreDuplicates: true }
    );
    if (profileError) throw profileError;

    const imageUrl = review.imageDataUrl ? await uploadReviewImage(supabase, auth.user.id, review.imageDataUrl) : undefined;
    const { error: reviewError } = await supabase.from("reviews").insert({
      user_id: auth.user.id,
      product_id: review.productId ?? null,
      product_name: review.productName,
      rating: review.rating,
      sweetness: review.sweetness,
      carbonation: review.carbonation,
      scene: review.scene,
      cost_performance: review.costPerformance,
      purchase_location: review.purchaseLocation,
      comment: review.comment,
      image_url: imageUrl ?? null
    });
    if (reviewError) throw reviewError;

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    // RLSや第三者JWTの検証エラーをそのまま返さず、設定情報の露出を避ける。
    console.error("[reviews] WorkOS-authenticated review save failed", error);
    return NextResponse.json({ error: "レビューの保存に失敗しました。時間をおいてもう一度お試しください。" }, { status: 500 });
  }
}

/**
 * JSON入力をDBへ保存できるReviewDraftへ変換する。
 * 不正値は部分的に補正せずnullへ落とし、画面とDBの両方で同じ契約を守る。
 */
function parseReview(value: unknown): ValidReview | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const productName = typeof input.productName === "string" ? input.productName.trim() : "";
  const comment = typeof input.comment === "string" ? input.comment.trim() : "";
  const productId = typeof input.productId === "string" && isUuid(input.productId) ? input.productId : undefined;
  const scores = [input.rating, input.sweetness, input.costPerformance];
  const hasValidScores = scores.every((score) => Number.isInteger(score) && Number(score) >= 1 && Number(score) <= 5);
  const carbonation = input.carbonation;
  const validCarbonation = Number.isInteger(carbonation) && Number(carbonation) >= 0 && Number(carbonation) <= 4;
  const scene = Array.isArray(input.scene) ? input.scene.filter((item): item is SceneTag => typeof item === "string" && sceneTags.has(item as SceneTag)) : [];
  const location = typeof input.purchaseLocation === "string" && purchaseLocations.has(input.purchaseLocation as PurchaseLocation)
    ? input.purchaseLocation as PurchaseLocation
    : undefined;
  const imageDataUrl = typeof input.imageDataUrl === "string" ? input.imageDataUrl : undefined;

  if (!productName || productName.length > 80 || !comment || comment.length > 300 || !hasValidScores || !validCarbonation || scene.length === 0 || scene.length > 6 || !location) return null;
  if (imageDataUrl && !readImageDataUrl(imageDataUrl)) return null;

  return {
    productId,
    productName,
    rating: Number(input.rating),
    sweetness: Number(input.sweetness),
    carbonation: Number(carbonation) as CarbonationLevel,
    scene: [...new Set(scene)],
    costPerformance: Number(input.costPerformance),
    purchaseLocation: location,
    comment,
    imageDataUrl
  };
}

/**
 * Data URLを検証済みバイナリへ変換し、本人フォルダへ新規画像として保存する。
 * ブラウザから送られたData URLをそのまま公開しないことで、Storage側のMIME・容量制約と
 * 本人フォルダのRLSを適用できる形へ変換する。
 */
async function uploadReviewImage(supabase: ReturnType<typeof createWorkOSSupabaseClient>, userId: string, imageDataUrl: string) {
  const image = readImageDataUrl(imageDataUrl);
  if (!image) throw new Error("Invalid image payload");

  const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("review-images").upload(path, image.bytes, {
    contentType: image.type,
    upsert: false
  });
  if (error) throw error;

  return supabase.storage.from("review-images").getPublicUrl(path).data.publicUrl;
}

/**
 * MIME・容量・マジックバイトを検証し、拡張子偽装された画像を受け付けない。
 * Content-Typeだけを信頼すると宣言と実体が違うファイルを保存できるため、許可形式と実バイト
 * の両方を確認し、公開Storageへ入る入力を狭める。
 */
function readImageDataUrl(value: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || !imageTypes.has(match[1])) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > maxImageBytes || !hasExpectedImageSignature(bytes, match[1])) return null;
  return { type: match[1], bytes };
}

/**
 * 宣言されたMIMEと実ファイル先頭の署名が一致するか確認する。
 * 拡張子やブラウザのMIME申告は利用者が変更できるため、JPEG/PNG/WebPの実データ先頭を見て
 * 受け付ける形式を決める。
 */
function hasExpectedImageSignature(bytes: Buffer, type: string) {
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

/**
 * 全角半角と空白の差だけを吸収し、商品名の意図的なすり替えは残す。
 * サーバーは表示名を商品IDの補助照合に使うため、あいまいな自動修正をすると別商品への投稿を
 * 許してしまう。意味が変わる差は入力エラーとして残す。
 */
function normalizeProductName(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, "").toLocaleLowerCase();
}

/**
 * Supabaseのuuid列へ渡す値がUUID形式か確認する。
 * Route Handlerへ任意の文字列を渡すとDBエラーや不正な参照を招くため、UUID列へ到達する前に
 * 形式を絞り、未登録飲料のnullとは別の扱いにする。
 */
function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
