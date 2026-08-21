/**
 * ログイン中のユーザーへ、自分宛てのアプリ内通知だけを返すRoute Handler。
 *
 * 通知行の所有者はWorkOS JWT subjectとRLSで固定し、既読更新でもrecipient_user_idを本文から
 * 受け取らない。通知の関連情報はRLSを通る別クエリで補い、非公開レビューの本文を第三者へ漏らさない。
 */
import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { readJsonBodyWithinLimit, RequestBodyTooLargeError } from "@/lib/request-body";
import { isSameOriginRequest } from "@/lib/request-security";
import { createWorkOSSupabaseClient } from "@/lib/supabase-server";
import { hasWorkOSAuthConfig } from "@/lib/workos";

const maxNotificationRequestBytes = 8 * 1024;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  if (!hasNotificationConfig()) return unavailableResponse();

  const auth = await withAuth();
  if (!auth.user || !auth.accessToken) {
    return NextResponse.json({ error: "通知の表示にはログインが必要です。" }, { status: 401 });
  }

  try {
    const supabase = createWorkOSSupabaseClient(auth.accessToken);
    const { data: rows, error } = await supabase
      .from("notifications")
      .select("id,actor_user_id,review_id,kind,read_at,created_at")
      .eq("recipient_user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    const notifications = rows ?? [];
    const actorIds = [...new Set(notifications.map((row) => row.actor_user_id))];
    const reviewIds = [...new Set(notifications.map((row) => row.review_id))];
    const [{ data: actors, error: actorError }, { data: reviews, error: reviewError }] = await Promise.all([
      actorIds.length > 0
        ? supabase.from("profiles").select("user_id,name,avatar_url").in("user_id", actorIds)
        : Promise.resolve({ data: [], error: null }),
      reviewIds.length > 0
        ? supabase.from("reviews").select("id,product_id,comment").in("id", reviewIds)
        : Promise.resolve({ data: [], error: null })
    ]);
    if (actorError || reviewError) throw actorError ?? reviewError;

    const productIds = [...new Set((reviews ?? []).map((review) => review.product_id))];
    const { data: products, error: productError } = productIds.length > 0
      ? await supabase.from("products").select("id,name").in("id", productIds)
      : { data: [], error: null };
    if (productError) throw productError;

    const actorById = new Map((actors ?? []).map((actor) => [actor.user_id, actor]));
    const reviewById = new Map((reviews ?? []).map((review) => [review.id, review]));
    const productById = new Map((products ?? []).map((product) => [product.id, product]));

    return NextResponse.json({
      unreadCount: notifications.filter((notification) => !notification.read_at).length,
      notifications: notifications.map((notification) => {
        const actor = actorById.get(notification.actor_user_id);
        const review = reviewById.get(notification.review_id);
        const product = review ? productById.get(review.product_id) : undefined;
        return {
          id: notification.id,
          kind: notification.kind,
          readAt: notification.read_at,
          createdAt: notification.created_at,
          reviewId: notification.review_id,
          productId: review?.product_id,
          productName: product?.name ?? "レビュー",
          actorName: actor?.name ?? "のみログユーザー",
          actorAvatarUrl: actor?.avatar_url ?? undefined
        };
      })
    });
  } catch (error) {
    console.error("[notifications] lookup failed", error);
    return NextResponse.json({ error: "通知を読み込めませんでした。" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!hasNotificationConfig()) return unavailableResponse();
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }

  const auth = await withAuth();
  if (!auth.user || !auth.accessToken) {
    return NextResponse.json({ error: "通知の変更にはログインが必要です。" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await readJsonBodyWithinLimit(request, maxNotificationRequestBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "入力内容が大きすぎます。" }, { status: 413 });
    }
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  const input = parseMarkReadInput(payload);
  if (!input) return NextResponse.json({ error: "通知を確認してください。" }, { status: 400 });

  try {
    const supabase = createWorkOSSupabaseClient(auth.accessToken);
    let query = supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_user_id", auth.user.id);
    if (input.notificationId) query = query.eq("id", input.notificationId);
    const { error } = await query;
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[notifications] mark read failed", error);
    return NextResponse.json({ error: "既読状態を更新できませんでした。" }, { status: 500 });
  }
}

function parseMarkReadInput(value: unknown): { notificationId?: string } | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (input.markAll === true) return {};
  return typeof input.notificationId === "string" && uuidPattern.test(input.notificationId)
    ? { notificationId: input.notificationId }
    : null;
}

function hasNotificationConfig() {
  return hasWorkOSAuthConfig() && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function unavailableResponse() {
  return NextResponse.json({ error: "通知機能を準備中です。" }, { status: 503 });
}
