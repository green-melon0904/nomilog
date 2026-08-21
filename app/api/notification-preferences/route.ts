/**
 * いいね通知の受信設定を管理するRoute Handler。
 * 未作成の設定はONとして扱い、既存ユーザーがmigration後も通知を受け取れる初期動作に揃える。
 */
import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { readJsonBodyWithinLimit, RequestBodyTooLargeError } from "@/lib/request-body";
import { isSameOriginRequest } from "@/lib/request-security";
import { createWorkOSSupabaseClient } from "@/lib/supabase-server";
import { ensureWorkOSProfile } from "@/lib/supabase-user";
import { hasWorkOSAuthConfig } from "@/lib/workos";

const maxPreferenceRequestBytes = 8 * 1024;

export async function GET() {
  const authResult = await getAuthenticatedClient();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { data, error } = await authResult.supabase
      .from("notification_preferences")
      .select("review_likes_enabled")
      .eq("user_id", authResult.user.id)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ reviewLikesEnabled: data?.review_likes_enabled ?? true });
  } catch (error) {
    console.error("[notification-preferences] lookup failed", error);
    return NextResponse.json({ error: "通知設定を読み込めませんでした。" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }
  const authResult = await getAuthenticatedClient();
  if (authResult instanceof NextResponse) return authResult;

  let payload: unknown;
  try {
    payload = await readJsonBodyWithinLimit(request, maxPreferenceRequestBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "入力内容が大きすぎます。" }, { status: 413 });
    }
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }
  const enabled = readReviewLikesEnabled(payload);
  if (enabled === null) return NextResponse.json({ error: "通知設定を確認してください。" }, { status: 400 });

  try {
    await ensureWorkOSProfile(authResult.supabase, authResult.user);
    const { error } = await authResult.supabase.from("notification_preferences").upsert({
      user_id: authResult.user.id,
      review_likes_enabled: enabled,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
    if (error) throw error;
    return NextResponse.json({ reviewLikesEnabled: enabled });
  } catch (error) {
    console.error("[notification-preferences] save failed", error);
    return NextResponse.json({ error: "通知設定を保存できませんでした。" }, { status: 500 });
  }
}

async function getAuthenticatedClient() {
  if (!hasWorkOSAuthConfig() || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "通知機能を準備中です。" }, { status: 503 });
  }
  const auth = await withAuth();
  if (!auth.user || !auth.accessToken) {
    return NextResponse.json({ error: "通知設定にはログインが必要です。" }, { status: 401 });
  }
  return { user: auth.user, supabase: createWorkOSSupabaseClient(auth.accessToken) };
}

function readReviewLikesEnabled(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const enabled = (value as Record<string, unknown>).reviewLikesEnabled;
  return typeof enabled === "boolean" ? enabled : null;
}
