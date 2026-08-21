/**
 * ログイン中の本人が、のみログ内のデータとWorkOSアカウントを削除するRoute Handler。
 *
 * Storage、Supabase、WorkOSの順に削除する。分散サービス間の一括トランザクションは組めないため、
 * 公開画像と個人データを先に消し、最後のWorkOS失敗だけ再実行可能にする順序を採用している。
 */
import { NotFoundException, WorkOS } from "@workos-inc/node";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { readJsonBodyWithinLimit, RequestBodyTooLargeError } from "@/lib/request-body";
import { isSameOriginRequest } from "@/lib/request-security";
import { hasAccountDeletionConfirmation } from "@/lib/safety-input";
import { createWorkOSSupabaseClient } from "@/lib/supabase-server";
import { hasWorkOSAuthConfig } from "@/lib/workos";

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

    // 管理者ではない利用者は0件削除で成功する。本人の管理者登録だけを先に外し、WorkOS削除後に
    // 利用されない強い権限のsubjectが運用表へ残らないようにする。
    const { error: adminCleanupError } = await supabase.from("app_admins").delete().eq("user_id", auth.user.id);
    if (adminCleanupError) throw adminCleanupError;

    // profilesを親にするレビュー、いいね、お気に入り、通知、通報は外部キーのCASCADEで同時に消える。
    // 個別DELETEを増やすより、新しい個人テーブルを追加した際もDBの所有関係へ追従しやすい。
    const { error: profileError } = await supabase.from("profiles").delete().eq("user_id", auth.user.id);
    if (profileError) throw profileError;

    try {
      const apiKey = process.env.WORKOS_API_KEY;
      if (!apiKey) throw new Error("WorkOS API key is missing");
      await new WorkOS(apiKey).userManagement.deleteUser(auth.user.id);
    } catch (error) {
      // 再送前にWorkOS側だけ削除済みになっていても、利用者の目的は達成済みなので成功扱いにする。
      if (!(error instanceof NotFoundException)) throw error;
    }

    return NextResponse.json({ ok: true });
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
