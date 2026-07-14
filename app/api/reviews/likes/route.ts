/**
 * レビューのいいね状態を扱うRoute Handler。
 *
 * GETは本人が押したレビューIDだけをRLS経由で返し、POST/DELETEはWorkOSのJWT subjectを
 * user_idとしてSupabaseへ渡す。いいね行そのものを匿名へ公開しないことで、誰がどのレビューを
 * 支持したかを第三者から推測されにくくする。
 */
import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createWorkOSSupabaseClient } from "@/lib/supabase-server";
import { hasWorkOSAuthConfig } from "@/lib/workos";

type LikeActionBody = {
  reviewId?: unknown;
};

/**
 * 指定されたレビューについて、ログイン中の本人が押しているかを返す。
 * いいね行を公開一覧として返すのではなく本人分だけを返し、UIの選択状態に必要な情報と
 * 他人の行動履歴の秘匿を両立する。
 */
export async function GET(request: NextRequest) {
  if (!hasWorkOSAuthConfig()) {
    return NextResponse.json({ configured: false, authenticated: false, likedReviewIds: [] });
  }

  const requestedIds = parseReviewIds(
    request.nextUrl.searchParams.get("reviewIds") ?? request.nextUrl.searchParams.get("reviewId")
  );
  if (!requestedIds) {
    return NextResponse.json({ error: "レビューIDを確認してください。" }, { status: 400 });
  }

  try {
    const auth = await withAuth();
    if (!auth.user || !auth.accessToken) {
      return NextResponse.json({ configured: true, authenticated: false, likedReviewIds: [] });
    }

    const supabase = createWorkOSSupabaseClient(auth.accessToken);
    const { data, error } = await supabase
      .from("review_likes")
      .select("review_id")
      .in("review_id", requestedIds);
    if (error) throw error;

    const likedReviewIds = (data ?? []).map((row) => row.review_id as string);
    const response: {
      configured: true;
      authenticated: true;
      likedReviewIds: string[];
      liked?: boolean;
      likeCount?: number;
    } = {
      configured: true,
      authenticated: true,
      likedReviewIds
    };

    if (requestedIds.length === 1) {
      response.liked = likedReviewIds.includes(requestedIds[0]);
      response.likeCount = await readLikeCount(supabase, requestedIds[0]);
    }

    return NextResponse.json(response);
  } catch (error) {
    // セッションやRLSの詳細はブラウザへ返さず、認証済み状態の取得失敗として扱う。
    console.error("[review-likes] authenticated like lookup failed", error);
    return NextResponse.json({ configured: true, authenticated: false, likedReviewIds: [] });
  }
}

/**
 * レビューへのいいねを冪等に追加する。重複は複合主キーでDB側が拒否する。
 * 連打やネットワーク再送が同じ操作を複数回送っても件数が増えすぎないよう、重複排除は
 * クライアントの状態ではなくDBの一意制約へ任せる。
 */
export async function POST(request: NextRequest) {
  return updateLike(request, true);
}

/**
 * ログイン中の本人が押したいいねだけを削除する。
 * user_idをリクエスト本文から受け取らず、JWT subjectとRLSで削除対象を決めることで、他人の
 * いいねを取り消すためのID差し替えを許さない。
 */
export async function DELETE(request: NextRequest) {
  return updateLike(request, false);
}

/**
 * 追加・削除の共通処理。
 * Cookie認証を使う状態変更なので同一オリジンを必須にし、DB側ではJWT subjectのRLSを通す。
 */
async function updateLike(request: NextRequest, shouldLike: boolean) {
  if (!hasWorkOSAuthConfig()) {
    return NextResponse.json({ error: "ログイン設定が完了していません。" }, { status: 503 });
  }

  // Cookieを利用する状態変更は同一オリジンからだけ受け付け、他サイト経由のCSRFを防ぐ。
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }

  const auth = await withAuth();
  if (!auth.user || !auth.accessToken) {
    return NextResponse.json({ error: "いいねにはログインが必要です。" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null) as LikeActionBody | null;
  const reviewId = parseReviewId(payload?.reviewId);
  if (!reviewId) {
    return NextResponse.json({ error: "レビューIDを確認してください。" }, { status: 400 });
  }

  try {
    const supabase = createWorkOSSupabaseClient(auth.accessToken);
    await ensureProfile(supabase, auth.user.id, auth.user.email, auth.user.firstName, auth.user.lastName);

    if (shouldLike) {
      // 複合主キーで重複を防ぎ、連続タップや再送があっても1件だけ保持する。
      const { error } = await supabase.from("review_likes").upsert(
        { review_id: reviewId, user_id: auth.user.id },
        { onConflict: "review_id,user_id", ignoreDuplicates: true }
      );
      if (error) throw error;
    } else {
      // user_idは本文から受け取らず、DELETEポリシーがJWTのsubjectで本人の行だけに絞り込む。
      const { error } = await supabase.from("review_likes").delete().eq("review_id", reviewId);
      if (error) throw error;
    }

    const likeCount = await readLikeCount(supabase, reviewId);
    return NextResponse.json({ liked: shouldLike, likeCount });
  } catch (error) {
    // DBやRLSの内部情報を出さず、画面には再試行可能な一般メッセージだけを返す。
    console.error("[review-likes] like update failed", error);
    return NextResponse.json({ error: "いいねの更新に失敗しました。時間をおいてもう一度お試しください。" }, { status: 500 });
  }
}

/**
 * いいね行の外部キーを満たすため、本人のプロフィールがなければ作成する。
 * WorkOSのユーザーはSupabase Authのトリガーで自動作成されないため、レビューやいいねの保存
 * 入口で本人のsubjectに限ってプロフィールを整える。既存の表示名は上書きせず、他ユーザーの行も
 * 作成しない。
 */
async function ensureProfile(
  supabase: ReturnType<typeof createWorkOSSupabaseClient>,
  userId: string,
  email: string,
  firstName: string | null,
  lastName: string | null
) {
  const name = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0] || "のみログユーザー";
  const { error } = await supabase.from("profiles").upsert(
    { user_id: userId, name },
    { onConflict: "user_id", ignoreDuplicates: true }
  );
  if (error) throw error;
}

/**
 * トリガー反映後のレビュー行から、表示用の最新いいね数を読む。
 * 追加・削除のレスポンスをクライアントの推測値ではなくDBの集計値に合わせ、同時操作後も
 * 次の表示で件数が戻らないようにする。
 */
async function readLikeCount(supabase: ReturnType<typeof createWorkOSSupabaseClient>, reviewId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("like_count")
    .eq("id", reviewId)
    .maybeSingle();
  if (error || !data) throw error ?? new Error("Review was not found");
  return Number(data.like_count) || 0;
}

/**
 * クエリのIDをUUIDへ絞り、過剰な一括問い合わせを100件までに制限する。
 * URLへ任意の文字列や大量のIDを渡されてもDBエラーや不要な負荷を生まないよう、入力の形式と
 * 件数をAPI境界で制限する。
 */
function parseReviewIds(value: string | null) {
  if (!value) return null;
  const ids = [...new Set(value.split(",").map((item) => parseReviewId(item)).filter((item): item is string => Boolean(item)))];
  return ids.length > 0 && ids.length <= 100 ? ids : null;
}

/**
 * 外部入力のレビューIDをUUID形式へ検証する。
 * DBへ問い合わせる前に形式不正を400系の入力エラーとして扱い、内部のSQLエラーや実装詳細を
 * クライアントへ漏らさない。
 */
function parseReviewId(value: unknown) {
  return typeof value === "string" && isUuid(value.trim()) ? value.trim() : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
