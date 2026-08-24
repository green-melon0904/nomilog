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
import { imageExtension, readImageDataUrl } from "@/lib/image-data-url";
import { isSameOriginRequest } from "@/lib/request-security";
import { readJsonBodyWithinLimit, RequestBodyTooLargeError } from "@/lib/request-body";
import { createSafeErrorLog } from "@/lib/safe-error-log";
import { createWorkOSSupabaseClient } from "@/lib/supabase-server";
import { enforceUserWriteRateLimit, UserWriteRateLimitError } from "@/lib/user-write-rate-limit";
import { hasWorkOSAuthConfig } from "@/lib/workos";
import type { CarbonationLevel, PurchaseLocation, SceneTag } from "@/lib/types";

const maxImageBytes = 2 * 1024 * 1024;
// 2MB画像をBase64化した場合の増加分と、レビュー本文・選択値の余白を含めたRoute Handlerの上限。
const maxReviewRequestBytes = 3 * 1024 * 1024;
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
  productId: string;
  rating: number;
  sweetness: number;
  carbonation: CarbonationLevel;
  scene: SceneTag[];
  costPerformance: number;
  purchaseLocation: PurchaseLocation;
  comment: string;
  imageDataUrl?: string;
  removeImage: boolean;
};

/**
 * 編集画面へ、ログイン中の本人が所有するレビューだけを返す。
 * 公開レビューは匿名でも読めるが、編集初期値はuser_idを明示して取得し、他人のレビューIDを
 * URLへ入れても編集対象として扱わない。
 */
export async function GET(request: NextRequest) {
  if (!hasReviewServiceConfig()) {
    return NextResponse.json({ error: "レビュー機能を準備中です。" }, { status: 503 });
  }

  const reviewId = request.nextUrl.searchParams.get("reviewId");
  if (!reviewId || !isUuid(reviewId)) {
    return NextResponse.json({ error: "レビューを確認してください。" }, { status: 400 });
  }

  const auth = await withAuth();
  if (!auth.user || !auth.accessToken) {
    return NextResponse.json({ error: "レビュー編集にはログインが必要です。" }, { status: 401 });
  }

  try {
    const supabase = createWorkOSSupabaseClient(auth.accessToken);
    const { data, error } = await supabase
      .from("reviews")
      .select("id,product_id,product_name,rating,sweetness,carbonation,scene,cost_performance,purchase_location,comment,image_url,created_at,updated_at")
      .eq("id", reviewId)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "編集できるレビューが見つかりません。" }, { status: 404 });

    return NextResponse.json({
      review: {
        id: data.id,
        productId: data.product_id,
        productName: data.product_name,
        rating: data.rating,
        sweetness: data.sweetness,
        carbonation: data.carbonation,
        scene: data.scene,
        costPerformance: data.cost_performance,
        purchaseLocation: data.purchase_location,
        comment: data.comment,
        imageUrl: data.image_url ?? undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    });
  } catch (error) {
    console.error("[reviews] owned review lookup failed", error);
    return NextResponse.json({ error: "レビューを読み込めませんでした。" }, { status: 500 });
  }
}

/**
 * ログイン中のユーザーが入力したレビューを検証し、画像があればStorageへ保存する。
 * 画面側の確認を通らない直接リクエストも同じ検証・認証・RLS境界へ通し、入力値の改ざんで
 * 他人のレビューや商品集計を操作できないようにする。
 */
export async function POST(request: NextRequest) {
  if (!hasReviewServiceConfig()) {
    return NextResponse.json({ error: "ログイン設定が完了していません。" }, { status: 503 });
  }

  // 投稿はブラウザからの同一オリジン操作だけを受け付ける。
  // AuthKitのCookieが万一クロスサイトで送られる設定になっても、他サイトからのCSRF投稿を防ぐ。
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }

  const auth = await withAuth();
  if (!auth.user || !auth.accessToken) {
    return NextResponse.json({ error: "レビュー投稿にはログインが必要です。" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await readJsonBodyWithinLimit(request, maxReviewRequestBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "画像を含む入力は3MB以下にしてください。" }, { status: 413 });
    }
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }
  const review = parseReview(payload);
  if (!review || review.removeImage) {
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  const rateLimitResponse = await enforceReviewCreateRateLimit(auth.user.id);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const supabase = createWorkOSSupabaseClient(auth.accessToken);

    // 商品名はリクエストから受け取らず、選択されたIDを商品マスタで引き直す。投稿可能かどうかは
    // DBのis_reviewableを唯一の判定元にし、カタログ切り替え時に画面とAPIの許可範囲をずらさない。
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, is_reviewable")
      .eq("id", review.productId)
      .maybeSingle();
    if (productError || !product || !product.is_reviewable) {
      return NextResponse.json({ error: "カタログから飲み物を選択してください。" }, { status: 400 });
    }

    const profileName = [auth.user.firstName, auth.user.lastName].filter(Boolean).join(" ") || auth.user.email.split("@")[0] || "のみログユーザー";

    // 初回投稿時だけプロフィール行を用意する。既存行を更新しないことで、プロフィール編集で
    // 保存した表示名が、レビュー投稿のたびにWorkOSの初期名へ戻ることを防ぐ。
    const { error: profileError } = await supabase.from("profiles").upsert(
      { user_id: auth.user.id, name: profileName },
      { onConflict: "user_id", ignoreDuplicates: true }
    );
    if (profileError) throw profileError;

    const uploadedImage = review.imageDataUrl ? await uploadReviewImage(supabase, auth.user.id, review.imageDataUrl) : undefined;
    const { error: reviewError } = await supabase.from("reviews").insert({
      user_id: auth.user.id,
      product_id: review.productId,
      product_name: product.name,
      rating: review.rating,
      sweetness: review.sweetness,
      carbonation: review.carbonation,
      scene: review.scene,
      cost_performance: review.costPerformance,
      purchase_location: review.purchaseLocation,
      comment: review.comment,
      image_url: uploadedImage?.publicUrl ?? null
    });
    if (reviewError) {
      // Storageはreviews行と外部キーで結べない。INSERTが失敗したら自分でアップロードした画像を
      // すぐ消し、失敗した投稿だけが公開バケットに残ることを防ぐ。
      if (uploadedImage) await removeUploadedReviewImage(supabase, uploadedImage.path);
      throw reviewError;
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    // RLSや第三者JWTの検証エラーをそのまま返さず、設定情報の露出を避ける。
    console.error("[reviews] WorkOS-authenticated review save failed", error);
    return NextResponse.json({ error: "レビューの保存に失敗しました。時間をおいてもう一度お試しください。" }, { status: 500 });
  }
}

/**
 * 本人レビューを更新し、画像を変更する場合は新規画像の保存、DB更新、旧画像削除の順で処理する。
 * DB更新前に旧画像を消すと失敗時に元へ戻せないため、新規画像だけを先に用意し、更新失敗時は
 * その新規ファイルだけを掃除する。
 */
export async function PATCH(request: NextRequest) {
  if (!hasReviewServiceConfig()) {
    return NextResponse.json({ error: "レビュー機能を準備中です。" }, { status: 503 });
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }

  const auth = await withAuth();
  if (!auth.user || !auth.accessToken) {
    return NextResponse.json({ error: "レビュー編集にはログインが必要です。" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await readJsonBodyWithinLimit(request, maxReviewRequestBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "画像を含む入力は3MB以下にしてください。" }, { status: 413 });
    }
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  const reviewId = readReviewId(payload);
  const expectedUpdatedAt = readExpectedUpdatedAt(payload);
  const review = parseReview(payload);
  if (!reviewId || !expectedUpdatedAt || !review) {
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  try {
    const supabase = createWorkOSSupabaseClient(auth.accessToken);
    const { data: existing, error: existingError } = await supabase
      .from("reviews")
      .select("id,user_id,image_url,updated_at")
      .eq("id", reviewId)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return NextResponse.json({ error: "編集できるレビューが見つかりません。" }, { status: 404 });
    if (existing.updated_at !== expectedUpdatedAt) {
      return NextResponse.json({ error: "別の画面でレビューが更新されています。画面を開き直してください。" }, { status: 409 });
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id,name,is_reviewable")
      .eq("id", review.productId)
      .maybeSingle();
    if (productError || !product?.is_reviewable) {
      return NextResponse.json({ error: "カタログから飲み物を選択してください。" }, { status: 400 });
    }

    let uploadedImage: Awaited<ReturnType<typeof uploadReviewImage>> | undefined;
    try {
      if (review.imageDataUrl) {
        uploadedImage = await uploadReviewImage(supabase, auth.user.id, review.imageDataUrl);
      }

      const nextImageUrl = uploadedImage?.publicUrl ?? (review.removeImage ? null : existing.image_url);
      const { data: updated, error: updateError } = await supabase
        .from("reviews")
        .update({
          product_id: review.productId,
          product_name: product.name,
          rating: review.rating,
          sweetness: review.sweetness,
          carbonation: review.carbonation,
          scene: review.scene,
          cost_performance: review.costPerformance,
          purchase_location: review.purchaseLocation,
          comment: review.comment,
          image_url: nextImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq("id", reviewId)
        .eq("user_id", auth.user.id)
        // 読み込み後に別タブで更新された場合は0件になり、古い画像URLや入力で上書きしない。
        .eq("updated_at", expectedUpdatedAt)
        .select("id,product_id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated) {
        if (uploadedImage) await removeUploadedReviewImage(supabase, uploadedImage.path);
        return NextResponse.json({ error: "別の画面でレビューが更新されています。画面を開き直してください。" }, { status: 409 });
      }
    } catch (error) {
      if (uploadedImage) await removeUploadedReviewImage(supabase, uploadedImage.path);
      throw error;
    }

    if (existing.image_url && (uploadedImage || review.removeImage)) {
      await removeOwnedReviewImageByUrl(supabase, existing.image_url, auth.user.id);
    }

    return NextResponse.json({ ok: true, reviewId, productId: review.productId });
  } catch (error) {
    console.error("[reviews] WorkOS-authenticated review update failed", error);
    return NextResponse.json({ error: "レビューの更新に失敗しました。時間をおいてもう一度お試しください。" }, { status: 500 });
  }
}

/**
 * 入力検証後、画像アップロードや商品照合より先に共有カウンターを消費し、短時間の新規投稿でStorageと
 * DBへ負荷が集中するのを防ぐ。編集は投稿数を増やさないため同じ枠へ含めず、入力ミスでも回数を消費しない。
 * 制限基盤が壊れた場合は投稿を許可せず500にする。可用性より書き込み境界を優先し、障害中の無制限投稿を
 * 意図的に避ける。
 */
async function enforceReviewCreateRateLimit(userId: string) {
  try {
    await enforceUserWriteRateLimit(userId, "review_create");
    return null;
  } catch (error) {
    if (error instanceof UserWriteRateLimitError) {
      return NextResponse.json(
        { error: "レビューの操作が続いています。少し待ってからもう一度お試しください。" },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } }
      );
    }

    console.error("[reviews] rate limit check failed", createSafeErrorLog(error));
    return NextResponse.json(
      { error: "レビューの保存に失敗しました。時間をおいてもう一度お試しください。" },
      { status: 500 }
    );
  }
}

/**
 * 本人レビューを削除する。review_likesと商品集計はDBのCASCADE・トリガーへ任せ、レビュー画像だけは
 * Storageに外部キーがないため、DB削除が成功した後に本人フォルダのファイルを明示的に消す。
 */
export async function DELETE(request: NextRequest) {
  if (!hasReviewServiceConfig()) {
    return NextResponse.json({ error: "レビュー機能を準備中です。" }, { status: 503 });
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }

  const auth = await withAuth();
  if (!auth.user || !auth.accessToken) {
    return NextResponse.json({ error: "レビュー削除にはログインが必要です。" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await readJsonBodyWithinLimit(request, maxReviewRequestBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "入力内容が大きすぎます。" }, { status: 413 });
    }
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  const reviewId = readReviewId(payload);
  if (!reviewId) return NextResponse.json({ error: "レビューを確認してください。" }, { status: 400 });

  try {
    const supabase = createWorkOSSupabaseClient(auth.accessToken);
    const { data: existing, error: existingError } = await supabase
      .from("reviews")
      .select("id,user_id,product_id,image_url")
      .eq("id", reviewId)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return NextResponse.json({ error: "削除できるレビューが見つかりません。" }, { status: 404 });

    const { data: deleted, error: deleteError } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId)
      .eq("user_id", auth.user.id)
      .select("id")
      .maybeSingle();
    if (deleteError) throw deleteError;
    if (!deleted) throw new Error("Review delete affected no owned row");

    if (existing.image_url) {
      await removeOwnedReviewImageByUrl(supabase, existing.image_url, auth.user.id);
    }

    return NextResponse.json({ ok: true, reviewId, productId: existing.product_id });
  } catch (error) {
    console.error("[reviews] WorkOS-authenticated review delete failed", error);
    return NextResponse.json({ error: "レビューの削除に失敗しました。時間をおいてもう一度お試しください。" }, { status: 500 });
  }
}

/**
 * JSON入力をDBへ保存できるReviewDraftへ変換する。
 * 不正値は部分的に補正せずnullへ落とし、画面とDBの両方で同じ契約を守る。
 */
function parseReview(value: unknown): ValidReview | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
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
  const removeImage = input.removeImage === true;

  if (!productId || !comment || comment.length > 300 || !hasValidScores || !validCarbonation || scene.length === 0 || scene.length > 6 || !location) return null;
  if (input.removeImage !== undefined && typeof input.removeImage !== "boolean") return null;
  if (imageDataUrl && !readImageDataUrl(imageDataUrl, maxImageBytes)) return null;
  if (imageDataUrl && removeImage) return null;

  return {
    productId,
    rating: Number(input.rating),
    sweetness: Number(input.sweetness),
    carbonation: Number(carbonation) as CarbonationLevel,
    scene: [...new Set(scene)],
    costPerformance: Number(input.costPerformance),
    purchaseLocation: location,
    comment,
    imageDataUrl,
    removeImage
  };
}

/**
 * Data URLを検証済みバイナリへ変換し、本人フォルダへ新規画像として保存する。
 * ブラウザから送られたData URLをそのまま公開しないことで、Storage側のMIME・容量制約と
 * 本人フォルダのRLSを適用できる形へ変換する。
 */
async function uploadReviewImage(supabase: ReturnType<typeof createWorkOSSupabaseClient>, userId: string, imageDataUrl: string) {
  const image = readImageDataUrl(imageDataUrl, maxImageBytes);
  if (!image) throw new Error("Invalid image payload");

  const extension = imageExtension(image.type);
  const path = `${userId}/${randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("review-images").upload(path, image.bytes, {
    contentType: image.type,
    upsert: false
  });
  if (error) throw error;

  return {
    path,
    publicUrl: supabase.storage.from("review-images").getPublicUrl(path).data.publicUrl
  };
}

/**
 * レビュー行の保存に失敗した後、直前に作ったStorageオブジェクトを片付ける。
 * 元のDBエラーを優先して利用者へ返すため、削除失敗はログに残すだけにし、再試行時の原因を
 * 画像削除エラーへすり替えない。移行SQLでも残存オブジェクトを掃除するため、二重の回収網になる。
 */
async function removeUploadedReviewImage(supabase: ReturnType<typeof createWorkOSSupabaseClient>, path: string) {
  const { error } = await supabase.storage.from("review-images").remove([path]);
  if (error) console.error("[reviews] Failed to remove orphaned review image", error);
}

/**
 * DBに保存された公開URLから、ログインユーザー自身のreview-imagesパスだけを取り出して削除する。
 * 任意URLをStorageの削除APIへ渡さず、bucket名とuserId prefixの両方が一致した場合だけ処理する。
 */
async function removeOwnedReviewImageByUrl(
  supabase: ReturnType<typeof createWorkOSSupabaseClient>,
  imageUrl: string,
  userId: string
) {
  const marker = "/storage/v1/object/public/review-images/";
  try {
    const pathname = new URL(imageUrl).pathname;
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex < 0) return;
    const path = decodeURIComponent(pathname.slice(markerIndex + marker.length));
    if (!path.startsWith(`${userId}/`)) return;
    await removeUploadedReviewImage(supabase, path);
  } catch (error) {
    // 古い不正URLがあってもレビュー本体の更新・削除は完了しているため、掃除だけを失敗扱いにしない。
    console.warn("[reviews] previous review image cleanup skipped", error);
  }
}

function readReviewId(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const reviewId = (value as Record<string, unknown>).reviewId;
  return typeof reviewId === "string" && isUuid(reviewId) ? reviewId : null;
}

/**
 * 編集画面が読み込んだ版を示すupdated_atを取り出す。
 * 同じ日時の行だけを更新条件へ含め、別タブで先に保存された内容や画像参照を上書きしない。
 */
function readExpectedUpdatedAt(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const expectedUpdatedAt = (value as Record<string, unknown>).expectedUpdatedAt;
  return typeof expectedUpdatedAt === "string" && expectedUpdatedAt.length <= 40 && !Number.isNaN(Date.parse(expectedUpdatedAt))
    ? expectedUpdatedAt
    : null;
}

function hasReviewServiceConfig() {
  return hasWorkOSAuthConfig() && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Supabaseのuuid列へ渡す値がUUID形式か確認する。
 * Route Handlerへ任意の文字列を渡すとDBエラーや不正な参照を招くため、UUID列へ到達する前に
 * 形式を絞る。実在確認はこの後の商品マスタ照会で行う。
 */
function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
