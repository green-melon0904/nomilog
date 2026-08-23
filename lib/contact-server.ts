/**
 * 匿名問い合わせだけを保存する、サーバー専用の最小権限ラッパー。
 *
 * Supabase Secret keyはRLSを迂回できるためClient自体を外部へ返さず、レート制限付きDB関数の呼び出しだけを
 * 公開する。ブラウザへ渡る`NEXT_PUBLIC_`変数にはせず、このファイルをClient Componentから読み込まない。
 */
import { createClient } from "@supabase/supabase-js";
import type { ContactCategory } from "@/lib/safety-input";

export class ContactRateLimitError extends Error {
  constructor() {
    super("Contact submission rate limit exceeded");
  }
}

type ContactSubmission = {
  userId: string | null;
  email: string;
  category: ContactCategory;
  message: string;
  fingerprint: string;
};

/**
 * 入力検証と共有レート制限を行うDB関数へ問い合わせを渡す。
 * Secret keyでテーブルを直接操作できる設計にはせず、コードレビュー時に強い権限の用途をこの一箇所へ限定する。
 */
export async function submitContactInquiry(input: ContactSubmission) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error("Contact submission credentials are missing");

  const supabase = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
  const { error } = await supabase.rpc("submit_contact_inquiry", {
    p_user_id: input.userId,
    p_email: input.email,
    p_category: input.category,
    p_message: input.message,
    p_fingerprint: input.fingerprint
  });
  if (error?.message.includes("contact_rate_limited")) throw new ContactRateLimitError();
  if (error) throw error;
}
