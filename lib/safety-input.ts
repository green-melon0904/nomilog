/**
 * 通報・問い合わせ・アカウント削除で受け取る外部入力を正規化する。
 *
 * 画面側のrequiredやmaxLengthは操作性のための補助であり、HTTPリクエストから回避できる。
 * Route Handlerで共通の検証関数を使い、DB制約へ到達する前に利用者向けの入力エラーへ変換する。
 */

export const reportReasons = ["spam", "harassment", "inappropriate", "rights", "other"] as const;
export const contactCategories = ["general", "account", "content", "privacy", "other"] as const;
export const accountDeletionConfirmation = "アカウントを削除";

export type ReportReason = (typeof reportReasons)[number];
export type ContactCategory = (typeof contactCategories)[number];

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ReviewReportInput = {
  reviewId: string;
  reason: ReportReason;
  details: string;
};

export type ContactInquiryInput = {
  email: string;
  category: ContactCategory;
  message: string;
  website: string;
};

/**
 * レビュー通報を、許可済み理由・UUID・300文字以内の補足へ絞る。
 * 補足は任意だが制御文字は拒否し、運営画面で予期しない表示崩れを起こさないようにする。
 */
export function parseReviewReportInput(value: unknown): ReviewReportInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const reviewId = normalizeText(input.reviewId);
  const reason = normalizeText(input.reason);
  const details = normalizeMultilineText(input.details ?? "");

  if (!reviewId || !uuidPattern.test(reviewId)) return null;
  if (!reason || !reportReasons.includes(reason as ReportReason)) return null;
  if (details === null || details.length > 300) return null;

  return { reviewId, reason: reason as ReportReason, details };
}

/**
 * 匿名送信も許す問い合わせを、返信可能なメール・区分・20〜1000文字の本文へ整える。
 * websiteは画面に見せないハニーポットで、値がある送信は自動投稿としてAPI側で成功扱いにして破棄する。
 */
export function parseContactInquiryInput(value: unknown): ContactInquiryInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const email = normalizeText(input.email)?.toLowerCase() ?? null;
  const category = normalizeText(input.category);
  const message = normalizeMultilineText(input.message);
  const website = normalizeText(input.website) ?? "";

  if (!email || email.length > 254 || !emailPattern.test(email)) return null;
  if (!category || !contactCategories.includes(category as ContactCategory)) return null;
  if (message === null || message.length < 20 || message.length > 1000) return null;
  if (website.length > 200) return null;

  return { email, category: category as ContactCategory, message, website };
}

/**
 * 取り消せない削除操作は、画面の確認ダイアログに加えて固定文言の完全一致を必須にする。
 * boolean一つでは誤タップや古い画面からの再送を区別できないため、意図を本文でも確認する。
 */
export function hasAccountDeletionConfirmation(value: unknown) {
  if (!value || typeof value !== "object") return false;
  return (value as Record<string, unknown>).confirmation === accountDeletionConfirmation;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFKC").trim();
  return /[\u0000-\u001f\u007f]/.test(normalized) ? null : normalized;
}

function normalizeMultilineText(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFKC").replace(/\r\n?/g, "\n").trim();
  return /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(normalized) ? null : normalized;
}
