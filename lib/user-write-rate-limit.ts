/**
 * 認証ユーザーの書き込み回数を、Supabase上の共有レート制限へ記録するサーバー専用モジュール。
 *
 * Vercelのメモリ内カウンターはインスタンスの再起動や水平分割で値が分かれるため使わない。
 * Secret keyで実行できる用途を回数記録RPCだけに閉じ込め、ユーザー所有データの読み書きは従来どおり
 * WorkOS JWTとRLSへ任せる。
 */
import { createClient } from "@supabase/supabase-js";
import { readSupabaseSecretKey } from "./supabase-secret-key.ts";

export type UserWriteRateLimitAction = "review_create" | "review_like" | "review_report";

type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export class UserWriteRateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("User write rate limit exceeded");
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * DBの原子的な固定窓カウンターを消費し、上限超過なら再試行可能時刻を含む専用エラーを投げる。
 * userIdは必ずWorkOSの認証結果から渡し、リクエスト本文の値を使わない。DBにはそのSHA-256指紋だけを
 * 保存するため、このモジュールからユーザーIDを直接テーブルへ書き込まない。
 */
export async function enforceUserWriteRateLimit(userId: string, action: UserWriteRateLimitAction) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = readSupabaseSecretKey();
  if (!url || !secretKey) throw new Error("User write rate limit credentials are missing");

  const supabase = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
  const { data, error } = await supabase.rpc("consume_nomilog_user_write_limit", {
    p_user_id: userId,
    p_action: action
  });
  if (error) throw error;

  const decision = parseUserWriteRateLimitDecision(data);
  if (!decision) throw new Error("User write rate limit returned an invalid response");
  if (!decision.allowed) throw new UserWriteRateLimitError(decision.retryAfterSeconds);
}

/**
 * PostgRESTのRPC応答を、Route Handlerが扱う最小の判定値へ変換する。
 * 型や範囲が壊れた応答を「許可」とみなすとDB障害時に制限を迂回できるため、曖昧な値はnullで拒否する。
 */
export function parseUserWriteRateLimitDecision(value: unknown): RateLimitDecision | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || typeof candidate !== "object") return null;

  const row = candidate as Record<string, unknown>;
  if (typeof row.allowed !== "boolean") return null;

  const retryAfterSeconds = typeof row.retry_after_seconds === "number"
    ? row.retry_after_seconds
    : Number(row.retry_after_seconds);
  if (!Number.isInteger(retryAfterSeconds) || retryAfterSeconds < 0 || retryAfterSeconds > 3600) return null;

  return { allowed: row.allowed, retryAfterSeconds };
}
