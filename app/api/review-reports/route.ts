/**
 * 認証済みユーザーが不適切なレビューを運営へ通報するRoute Handler。
 * 自分のレビュー・非公開済みレビュー・重複通報を拒否し、通報による嫌がらせや運営キューの重複を抑える。
 */
import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { readJsonBodyWithinLimit, RequestBodyTooLargeError } from "@/lib/request-body";
import { isSameOriginRequest } from "@/lib/request-security";
import { createSafeErrorLog } from "@/lib/safe-error-log";
import { parseReviewReportInput } from "@/lib/safety-input";
import { createWorkOSSupabaseClient } from "@/lib/supabase-server";
import { ensureWorkOSProfile } from "@/lib/supabase-user";
import { enforceUserWriteRateLimit, UserWriteRateLimitError } from "@/lib/user-write-rate-limit";
import { hasWorkOSAuthConfig } from "@/lib/workos";

const maxReportRequestBytes = 8 * 1024;

export async function POST(request: NextRequest) {
  if (!hasWorkOSAuthConfig() || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "通報機能を準備中です。" }, { status: 503 });
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }

  const auth = await withAuth();
  if (!auth.user || !auth.accessToken) {
    return NextResponse.json({ error: "通報にはログインが必要です。" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await readJsonBodyWithinLimit(request, maxReportRequestBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "入力内容が大きすぎます。" }, { status: 413 });
    }
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }
  const report = parseReviewReportInput(payload);
  if (!report) return NextResponse.json({ error: "通報内容を確認してください。" }, { status: 400 });

  try {
    await enforceUserWriteRateLimit(auth.user.id, "review_report");

    const supabase = createWorkOSSupabaseClient(auth.accessToken);
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select("id,user_id,is_hidden")
      .eq("id", report.reviewId)
      .maybeSingle();
    if (reviewError) throw reviewError;
    if (!review || review.is_hidden) {
      return NextResponse.json({ error: "通報できるレビューが見つかりません。" }, { status: 404 });
    }
    if (review.user_id === auth.user.id) {
      return NextResponse.json({ error: "自分のレビューは通報できません。" }, { status: 400 });
    }

    await ensureWorkOSProfile(supabase, auth.user);
    const { error } = await supabase.from("review_reports").insert({
      review_id: report.reviewId,
      reporter_user_id: auth.user.id,
      reason: report.reason,
      details: report.details
    });
    if (error?.code === "23505") {
      return NextResponse.json({ error: "このレビューはすでに通報済みです。" }, { status: 409 });
    }
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof UserWriteRateLimitError) {
      return NextResponse.json(
        { error: "通報が続いています。少し待ってからもう一度お試しください。" },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } }
      );
    }
    console.error("[review-reports] submission failed", createSafeErrorLog(error));
    return NextResponse.json({ error: "通報を送信できませんでした。時間をおいてもう一度お試しください。" }, { status: 500 });
  }
}
