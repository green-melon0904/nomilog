/**
 * ログイン中の本人が、のみログ内のデータとWorkOSアカウントを削除するRoute Handler。
 *
 * Storage、Supabase、WorkOSの順に削除する。分散サービス間の一括トランザクションは組めないため、
 * 公開画像と個人データを先に消し、最後のWorkOS失敗だけ再実行可能にする順序を採用している。
 * 完了時は削除済みユーザーの外部ログアウトURLへ移動せず、この応答で端末の認証Cookieを失効する。
 */
import { NotFoundException, WorkOS } from "@workos-inc/node";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { readJsonBodyWithinLimit, RequestBodyTooLargeError } from "@/lib/request-body";
import { isSameOriginRequest } from "@/lib/request-security";
import { hasAccountDeletionConfirmation } from "@/lib/safety-input";
import { createWorkOSSupabaseClient } from "@/lib/supabase-server";
import { hasWorkOSAuthConfig } from "@/lib/workos";
import { createAccountDeletedResponse } from "@/lib/workos-session-cookies";

const maxAccountRequestBytes = 8 * 1024;

export async function DELETE(request: NextRequest) {
  if (!hasWorkOSAuthConfig() || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "アカウント管理機能を準備中です。" }, { status: 503 });
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }

  const auth = await withAuth();
  if (!auth.user || !auth.accessToken) {
    return NextResponse.json({ error: "アカウント削除にはログインが必要です。" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await readJsonBodyWithinLimit(request, maxAccountRequestBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "入力内容が大きすぎます。" }, { status: 413 });
    }
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }
  if (!hasAccountDeletionConfirmation(payload)) {
    return NextResponse.json({ error: "確認欄へ「アカウントを削除」と入力してください。" }, { status: 400 });
  }

  try {
    const supabase = createWorkOSSupabaseClient(auth.accessToken);
    await Promise.all([
      removeOwnedFolder(supabase, "review-images", auth.user.id),
      removeOwnedFolder(supabase, "profile-images", auth.user.id)
    ]);

    // reviews.moderated_byとreview_reports.reviewed_byはapp_adminsを参照し、管理者削除時にNULLへ
    // 更新される。ただしFKの自動更新中は管理者行が削除中で権限判定に失敗するため、権限が有効な
    // うちに本人の監査参照だけを外す。非公開・解決状態と日時は変えず、個人識別子だけを削除する。
    const { error: reviewAuditCleanupError } = await supabase
      .from("reviews")
      .update({ moderated_by: null })
      .eq("moderated_by", auth.user.id);
    if (reviewAuditCleanupError) throw reviewAuditCleanupError;

    const { error: reportAuditCleanupError } = await supabase
      .from("review_reports")
      .update({ reviewed_by: null })
      .eq("reviewed_by", auth.user.id);
    if (reportAuditCleanupError) throw reportAuditCleanupError;

    // 管理者ではない利用者は0件削除で成功する。監査参照を外してから本人の管理者登録を削除し、
    // WorkOS削除後に利用されない強い権限のsubjectが運用表へ残らないようにする。
    const { error: adminCleanupError } = await supabase.from("app_admins").delete().eq("user_id", auth.user.id);
    if (adminCleanupError) throw adminCleanupError;

    // profilesを親にするレビュー、いいね、お気に入り、通知、通報は外部キーのCASCADEで同時に消える。
    // 個別DELETEを増やすより、新しい個人テーブルを追加した際もDBの所有関係へ追従しやすい。
    const { error: profileError } = await supabase.from("profiles").delete().eq("user_id", auth.user.id);
    if (profileError) throw profileError;

    try {
      const apiKey = process.env.WORKOS_API_KEY;
      if (!apiKey) throw new Error("WorkOS API key is missing");
      const workos = new WorkOS(apiKey);

      // ユーザー削除後に外部ログアウトURLを開くと、存在しないセッションの応答をSafariが
      // ダウンロードとして扱うことがある。現在セッションはユーザーを消す前にサーバーで失効する。
      if (auth.sessionId) {
        try {
          await workos.userManagement.revokeSession({ sessionId: auth.sessionId });
        } catch (error) {
          if (!(error instanceof NotFoundException)) throw error;
        }
      }
      await workos.userManagement.deleteUser(auth.user.id);
    } catch (error) {
      // 再送前にWorkOS側だけ削除済みになっていても、利用者の目的は達成済みなので成功扱いにする。
      if (!(error instanceof NotFoundException)) throw error;
    }

    return createAccountDeletedResponse(request);
  } catch (error) {
    console.error("[account] deletion failed", error);
    return NextResponse.json({ error: "アカウントを削除できませんでした。サポートへお問い合わせください。" }, { status: 500 });
  }
}

/**
 * RLSで本人フォルダだけを一覧・削除する。100件を超える画像はページングし、削除でoffsetが詰まるため
 * 毎回先頭ページを読み直す。空フォルダは成功扱いにして、途中まで削除済みの再試行を冪等にする。
 */
async function removeOwnedFolder(
  supabase: ReturnType<typeof createWorkOSSupabaseClient>,
  bucket: "review-images" | "profile-images",
  userId: string
) {
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(userId, { limit: 100, offset: 0 });
    if (error) throw error;
    const paths = (data ?? []).filter((item) => item.id).map((item) => `${userId}/${item.name}`);
    if (paths.length === 0) return;
    const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
    if (removeError) throw removeError;
  }
}
