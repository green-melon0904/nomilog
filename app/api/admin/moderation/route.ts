/**
 * レビュー通報と問い合わせを、登録済み運営ユーザーだけが処理するRoute Handler。
 *
 * 画面の管理者表示は利便性にしか使わず、APIでapp_adminsを再照合し、更新はさらにDB RLSと
 * 運営列保護トリガーを通す。クライアントがisAdminを偽装しても非公開化や対応状況を変更できない。
 */
import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { readJsonBodyWithinLimit, RequestBodyTooLargeError } from "@/lib/request-body";
import { isSameOriginRequest } from "@/lib/request-security";
import { createWorkOSSupabaseClient } from "@/lib/supabase-server";
import { isNomilogAdmin } from "@/lib/supabase-user";
import { hasWorkOSAuthConfig } from "@/lib/workos";

const maxModerationRequestBytes = 8 * 1024;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AdminContext = {
  userId: string;
  supabase: ReturnType<typeof createWorkOSSupabaseClient>;
};

type ModerationAction =
  | { action: "hide_review" | "restore_review"; reviewId: string }
  | { action: "resolve_report" | "dismiss_report"; reportId: string }
  | { action: "update_inquiry"; inquiryId: string; status: "read" | "resolved" };

export async function GET() {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;

  try {
    const [{ data: reports, error: reportsError }, { data: inquiries, error: inquiriesError }] = await Promise.all([
      context.supabase
        .from("review_reports")
        .select("id,review_id,reporter_user_id,reason,details,status,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      context.supabase
        .from("contact_inquiries")
        .select("id,user_id,email,category,message,status,created_at")
        .order("created_at", { ascending: false })
        .limit(100)
    ]);
    if (reportsError || inquiriesError) throw reportsError ?? inquiriesError;

    const reviewIds = [...new Set((reports ?? []).map((report) => report.review_id))];
    const reporterIds = [...new Set((reports ?? []).map((report) => report.reporter_user_id))];
    const [{ data: reviews, error: reviewError }, { data: reporters, error: reporterError }] = await Promise.all([
      reviewIds.length > 0
        ? context.supabase.from("reviews").select("id,product_id,user_id,comment,is_hidden").in("id", reviewIds)
        : Promise.resolve({ data: [], error: null }),
      reporterIds.length > 0
        ? context.supabase.from("profiles").select("user_id,name").in("user_id", reporterIds)
        : Promise.resolve({ data: [], error: null })
    ]);
    if (reviewError || reporterError) throw reviewError ?? reporterError;

    const productIds = [...new Set((reviews ?? []).map((review) => review.product_id))];
    const { data: products, error: productError } = productIds.length > 0
      ? await context.supabase.from("products").select("id,name").in("id", productIds)
      : { data: [], error: null };
    if (productError) throw productError;

    const reviewById = new Map((reviews ?? []).map((review) => [review.id, review]));
    const reporterById = new Map((reporters ?? []).map((profile) => [profile.user_id, profile]));
    const productById = new Map((products ?? []).map((product) => [product.id, product]));

    return NextResponse.json({
      reports: (reports ?? []).map((report) => {
        const review = reviewById.get(report.review_id);
        return {
          id: report.id,
          reviewId: report.review_id,
          reason: report.reason,
          details: report.details,
          status: report.status,
          createdAt: report.created_at,
          reporterName: reporterById.get(report.reporter_user_id)?.name ?? "のみログユーザー",
          reviewComment: review?.comment ?? "削除済みのレビュー",
          productName: review ? productById.get(review.product_id)?.name ?? "商品" : "商品",
          isHidden: review?.is_hidden ?? true
        };
      }),
      inquiries: inquiries ?? []
    });
  } catch (error) {
    console.error("[admin/moderation] lookup failed", error);
    return NextResponse.json({ error: "運営データを読み込めませんでした。" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;

  let payload: unknown;
  try {
    payload = await readJsonBodyWithinLimit(request, maxModerationRequestBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "入力内容が大きすぎます。" }, { status: 413 });
    }
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }
  const action = parseModerationAction(payload);
  if (!action) return NextResponse.json({ error: "運営操作を確認してください。" }, { status: 400 });

  try {
    if (action.action === "hide_review" || action.action === "restore_review") {
      const hidden = action.action === "hide_review";
      const { error } = await context.supabase.from("reviews").update({
        is_hidden: hidden,
        moderated_at: new Date().toISOString(),
        moderated_by: context.userId
      }).eq("id", action.reviewId);
      if (error) throw error;

      if (hidden) {
        // レビュー非公開化が先に成功すれば利用者保護は成立する。通報状態の更新失敗は画面から再試行できるため、
        // 複雑なSECURITY DEFINER RPCを増やさず、最小権限のRLS更新を二段階で行う。
        const { error: reportError } = await context.supabase.from("review_reports").update({
          status: "resolved",
          reviewed_by: context.userId,
          reviewed_at: new Date().toISOString()
        }).eq("review_id", action.reviewId).eq("status", "pending");
        if (reportError) throw reportError;
      }
    } else if (action.action === "resolve_report" || action.action === "dismiss_report") {
      const { error } = await context.supabase.from("review_reports").update({
        status: action.action === "resolve_report" ? "resolved" : "dismissed",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString()
      }).eq("id", action.reportId);
      if (error) throw error;
    } else if (action.action === "update_inquiry") {
      const { error } = await context.supabase.from("contact_inquiries").update({
        status: action.status,
        handled_by: context.userId,
        handled_at: action.status === "resolved" ? new Date().toISOString() : null
      }).eq("id", action.inquiryId);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/moderation] update failed", error);
    return NextResponse.json({ error: "運営操作を完了できませんでした。" }, { status: 500 });
  }
}

async function getAdminContext(): Promise<AdminContext | NextResponse> {
  if (!hasWorkOSAuthConfig() || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "運営機能を準備中です。" }, { status: 503 });
  }
  const auth = await withAuth();
  if (!auth.user || !auth.accessToken) {
    return NextResponse.json({ error: "運営画面にはログインが必要です。" }, { status: 401 });
  }
  const supabase = createWorkOSSupabaseClient(auth.accessToken);
  try {
    if (!await isNomilogAdmin(supabase, auth.user.id)) {
      return NextResponse.json({ error: "この操作を行う権限がありません。" }, { status: 403 });
    }
    return { userId: auth.user.id, supabase };
  } catch (error) {
    console.error("[admin/moderation] admin lookup failed", error);
    return NextResponse.json({ error: "管理者権限を確認できませんでした。" }, { status: 500 });
  }
}

function parseModerationAction(value: unknown): ModerationAction | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if ((input.action === "hide_review" || input.action === "restore_review") && isUuid(input.reviewId)) {
    return { action: input.action, reviewId: input.reviewId as string };
  }
  if ((input.action === "resolve_report" || input.action === "dismiss_report") && isUuid(input.reportId)) {
    return { action: input.action, reportId: input.reportId as string };
  }
  if (input.action === "update_inquiry" && isUuid(input.inquiryId) && (input.status === "read" || input.status === "resolved")) {
    return { action: input.action, inquiryId: input.inquiryId as string, status: input.status };
  }
  return null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}
