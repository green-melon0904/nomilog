import assert from "node:assert/strict";
import test from "node:test";
import {
  accountDeletionConfirmation,
  hasAccountDeletionConfirmation,
  parseContactInquiryInput,
  parseReviewReportInput
} from "./safety-input.ts";

test("review report input normalizes allowed values", () => {
  assert.deepEqual(parseReviewReportInput({
    reviewId: "d9428888-122b-4e37-a556-63bc600d1c0a",
    reason: "spam",
    details: "  同じ内容が繰り返されています。  "
  }), {
    reviewId: "d9428888-122b-4e37-a556-63bc600d1c0a",
    reason: "spam",
    details: "同じ内容が繰り返されています。"
  });
  assert.equal(parseReviewReportInput({ reviewId: "not-a-uuid", reason: "spam", details: "" }), null);
  assert.equal(parseReviewReportInput({ reviewId: "d9428888-122b-4e37-a556-63bc600d1c0a", reason: "unknown", details: "" }), null);
});

test("contact input requires a reply address and meaningful message", () => {
  const parsed = parseContactInquiryInput({
    email: " USER@EXAMPLE.COM ",
    category: "account",
    message: "  アカウントについて確認したいことがあります。  ",
    website: ""
  });
  assert.equal(parsed?.email, "user@example.com");
  assert.equal(parsed?.category, "account");
  assert.equal(parseContactInquiryInput({ email: "invalid", category: "account", message: "十分に長い問い合わせ本文です。", website: "" }), null);
  assert.equal(parseContactInquiryInput({ email: "user@example.com", category: "account", message: "短い", website: "" }), null);
});

test("account deletion requires the exact confirmation phrase", () => {
  assert.equal(hasAccountDeletionConfirmation({ confirmation: accountDeletionConfirmation }), true);
  assert.equal(hasAccountDeletionConfirmation({ confirmation: "削除" }), false);
});
