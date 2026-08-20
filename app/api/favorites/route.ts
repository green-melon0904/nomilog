/**
 * WorkOSでログインしたユーザーのお気に入り商品を管理するRoute Handler。
 *
 * ブラウザへアクセストークンを渡さず、サーバーで取得したJWTをSupabaseへ渡す。user_idは
 * リクエスト本文から受け取らないため、商品IDを差し替えても他ユーザーのお気に入りを
 * 読み書きできず、DBのRLSでも同じ所有者条件を再確認できる。
 */
import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { readJsonBodyWithinLimit, RequestBodyTooLargeError } from "@/lib/request-body";
import { isSameOriginRequest } from "@/lib/request-security";
import { createWorkOSSupabaseClient } from "@/lib/supabase-server";
import { hasWorkOSAuthConfig } from "@/lib/workos";

const maxFavoriteRequestBytes = 8 * 1024;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type FavoriteRequest = {
  productId: string;
};

/**
 * 本人のお気に入り商品IDを、新しく保存した順で返す。
 *
 * RLSだけに絞り込みを任せずuser_id条件もクエリへ含め、対象行が増えても本人の主キー索引を
 * 使えるようにする。未ログイン時は空配列にせず401を返し、画面がログイン誘導へ切り替えられる
 * ようにする。
 */
export async function GET() {
  const unavailable = unavailableResponse();
  if (unavailable) return unavailable;

  const auth = await withAuth();
  if (!auth.user || !auth.accessToken) {
    return NextResponse.json({ error: "お気に入りの表示にはログインが必要です。" }, { status: 401 });
  }

  try {
    const supabase = createWorkOSSupabaseClient(auth.accessToken);
    const { data, error } = await supabase
      .from("product_favorites")
      .select("product_id")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json({ favoriteProductIds: (data ?? []).map((row) => row.product_id) });
  } catch (error) {
    console.error("[favorites] favorite lookup failed", error);
    return NextResponse.json({ error: "お気に入りを読み込めませんでした。" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return changeFavorite(request, "add");
}

export async function DELETE(request: NextRequest) {
  return changeFavorite(request, "remove");
}

/**
 * 商品のお気に入り追加と解除に、同じ認証・入力検証・所有者条件を適用する。
 *
 * 追加前に投稿可能なカタログ商品か確認し、非公開商品IDを直接送る操作を拒否する。解除は
 * 商品の公開状態が後から変わっても個人データを消せるよう、既存行の所有者条件だけで処理する。
 */
async function changeFavorite(request: NextRequest, operation: "add" | "remove") {
  const unavailable = unavailableResponse();
  if (unavailable) return unavailable;

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }

  const auth = await withAuth();
  if (!auth.user || !auth.accessToken) {
    return NextResponse.json({ error: "お気に入りの変更にはログインが必要です。" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await readJsonBodyWithinLimit(request, maxFavoriteRequestBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "入力内容が大きすぎます。" }, { status: 413 });
    }
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  const favorite = parseFavoriteRequest(payload);
  if (!favorite) {
    return NextResponse.json({ error: "商品を確認してください。" }, { status: 400 });
  }

  try {
    const supabase = createWorkOSSupabaseClient(auth.accessToken);

    if (operation === "add") {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id,is_reviewable")
        .eq("id", favorite.productId)
        .maybeSingle();
      if (productError || !product?.is_reviewable) {
        return NextResponse.json({ error: "公開中のカタログ商品を選んでください。" }, { status: 400 });
      }

      // お気に入りがログイン後の最初の操作でも外部キーを満たせるよう、プロフィールを一度だけ用意する。
      // 既存行は更新せず、プロフィール編集で保存した表示名をWorkOSの初期名へ戻さない。
      const profileName = [auth.user.firstName, auth.user.lastName].filter(Boolean).join(" ") || auth.user.email.split("@")[0] || "のみログユーザー";
      const { error: profileError } = await supabase.from("profiles").upsert(
        { user_id: auth.user.id, name: profileName },
        { onConflict: "user_id", ignoreDuplicates: true }
      );
      if (profileError) throw profileError;

      // 主キーの重複は成功扱いにし、連打や複数タブから同じ商品を追加しても一行だけに保つ。
      const { error } = await supabase.from("product_favorites").upsert(
        { user_id: auth.user.id, product_id: favorite.productId },
        { onConflict: "user_id,product_id", ignoreDuplicates: true }
      );
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("product_favorites")
        .delete()
        .eq("user_id", auth.user.id)
        .eq("product_id", favorite.productId);
      if (error) throw error;
    }

    return NextResponse.json({ productId: favorite.productId, favorited: operation === "add" });
  } catch (error) {
    console.error("[favorites] favorite mutation failed", error);
    return NextResponse.json({ error: "お気に入りを変更できませんでした。時間をおいてもう一度お試しください。" }, { status: 500 });
  }
}

function parseFavoriteRequest(value: unknown): FavoriteRequest | null {
  if (!value || typeof value !== "object") return null;
  const productId = (value as Record<string, unknown>).productId;
  return typeof productId === "string" && uuidPattern.test(productId) ? { productId } : null;
}

function unavailableResponse() {
  if (!hasWorkOSAuthConfig() || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "お気に入り機能を準備中です。" }, { status: 503 });
  }
  return null;
}
