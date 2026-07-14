/**
 * ログイン中のユーザーが自分のプロフィール名を更新するRoute Handler。
 *
 * ブラウザからuser_idを受け取らず、WorkOSのJWT subjectを保存対象に使うことで、入力値の差し替え
 * だけで他ユーザーのプロフィールを書き換えられないようにする。実際の更新はSupabaseのRLSへ
 * 通し、画面側の認証ガードを迂回したリクエストにも同じ本人確認を適用する。
 */
import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/request-security";
import { createWorkOSSupabaseClient } from "@/lib/supabase-server";
import { hasWorkOSAuthConfig } from "@/lib/workos";

const maxProfileNameLength = 30;

/**
 * 表示名を検証して保存用の文字列へ整える。
 *
 * 表示名はレビュー一覧にも出るため、空文字・過長値・制御文字をDBへ入れない。NFKC正規化は
 * 全角半角の揺れを抑えるが、ユーザーが入力した日本語や絵文字などの表示可能な文字は残す。
 */
function parseProfileName(value: unknown) {
  if (!value || typeof value !== "object") return null;

  const name = (value as { name?: unknown }).name;
  if (typeof name !== "string") return null;

  const normalizedName = name.normalize("NFKC").trim();
  if (
    !normalizedName ||
    normalizedName.length > maxProfileNameLength ||
    /[\u0000-\u001f\u007f]/.test(normalizedName)
  ) {
    return null;
  }

  return normalizedName;
}

export async function PATCH(request: NextRequest) {
  if (!hasWorkOSAuthConfig()) {
    return NextResponse.json({ error: "ログイン設定が完了していません。" }, { status: 503 });
  }

  // Cookieを使う状態変更は同一オリジンからだけ受け付け、別サイト経由のCSRFを防ぐ。
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }

  const auth = await withAuth();
  if (!auth.user || !auth.accessToken) {
    return NextResponse.json({ error: "プロフィール編集にはログインが必要です。" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const name = parseProfileName(payload);
  if (!name) {
    return NextResponse.json({ error: "表示名は1〜30文字で入力してください。" }, { status: 400 });
  }

  try {
    const supabase = createWorkOSSupabaseClient(auth.accessToken);
    const { error } = await supabase.from("profiles").upsert(
      { user_id: auth.user.id, name },
      { onConflict: "user_id" }
    );

    if (error) throw error;
    return NextResponse.json({ profile: { name } });
  } catch (error) {
    // SupabaseやRLSの内部エラーをそのまま返さず、設定値やDB構造の露出を避ける。
    console.error("[profile] profile update failed", error);
    return NextResponse.json({ error: "プロフィールの保存に失敗しました。時間をおいてもう一度お試しください。" }, { status: 500 });
  }
}
