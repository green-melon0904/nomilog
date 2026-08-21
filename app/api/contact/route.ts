/**
 * ログイン前後の問い合わせを受け付ける公開Route Handler。
 *
 * 同一オリジン・本文上限・ハニーポット・DB共有レート制限を重ねる。匿名のData API直接INSERTは
 * 許可せず、強い保存権限は問い合わせ専用ラッパー内のRPC呼び出しだけに閉じ込める。
 */
import { createHmac } from "node:crypto";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { ContactRateLimitError, submitContactInquiry } from "@/lib/contact-server";
import { readJsonBodyWithinLimit, RequestBodyTooLargeError } from "@/lib/request-body";
import { isSameOriginRequest } from "@/lib/request-security";
import { parseContactInquiryInput } from "@/lib/safety-input";
import { createWorkOSSupabaseClient } from "@/lib/supabase-server";
import { ensureWorkOSProfile } from "@/lib/supabase-user";
import { hasWorkOSAuthConfig } from "@/lib/workos";

const maxContactRequestBytes = 8 * 1024;

export async function POST(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL
    || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || !process.env.SUPABASE_SERVICE_ROLE_KEY
    || !process.env.WORKOS_COOKIE_PASSWORD
  ) {
    return NextResponse.json({ error: "お問い合わせ機能を準備中です。" }, { status: 503 });
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await readJsonBodyWithinLimit(request, maxContactRequestBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "入力内容が大きすぎます。" }, { status: 413 });
    }
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }
  const inquiry = parseContactInquiryInput(payload);
  if (!inquiry) return NextResponse.json({ error: "メールアドレスとお問い合わせ内容を確認してください。" }, { status: 400 });

  // ハニーポットに値を入れる自動送信へ保存失敗を返すと回避学習されるため、通常の成功応答で静かに破棄する。
  if (inquiry.website) return NextResponse.json({ ok: true }, { status: 201 });

  try {
    const auth = hasWorkOSAuthConfig() ? await withAuth() : { user: null, accessToken: null };
    if (auth.user && auth.accessToken) {
      await ensureWorkOSProfile(createWorkOSSupabaseClient(auth.accessToken), auth.user);
    }
    await submitContactInquiry({
      userId: auth.user && auth.accessToken ? auth.user.id : null,
      email: inquiry.email,
      category: inquiry.category,
      message: inquiry.message,
      fingerprint: createContactFingerprint(request)
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof ContactRateLimitError) {
      return NextResponse.json({ error: "短時間に送信できる回数を超えました。しばらくしてからお試しください。" }, { status: 429 });
    }
    console.error("[contact] submission failed", error);
    return NextResponse.json({ error: "お問い合わせを送信できませんでした。時間をおいてもう一度お試しください。" }, { status: 500 });
  }
}

/**
 * 信頼できるCDNが付け直す接続元だけを使い、クライアントが自由に指定できるx-forwarded-forは参照しない。
 * 未対応プロキシでは全利用者を同じ値として安全側に制限するため、本番配信基盤を変える際はヘッダー契約も見直す。
 */
function createContactFingerprint(request: NextRequest) {
  const source = process.env.NODE_ENV === "development"
    ? "local-development"
    : firstHeaderValue(request.headers.get("x-vercel-forwarded-for"))
      ?? request.headers.get("cf-connecting-ip")?.trim()
      ?? "untrusted-proxy";
  return createHmac("sha256", process.env.WORKOS_COOKIE_PASSWORD as string)
    .update("nomilog-contact-rate-limit\0")
    .update(source)
    .digest("hex");
}

function firstHeaderValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}
