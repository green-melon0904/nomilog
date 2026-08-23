import assert from "node:assert/strict";
import test from "node:test";
import { parseSupabaseSecretKey } from "./supabase-secret-key.ts";

test("accepts a single-line Supabase secret key", () => {
  assert.equal(parseSupabaseSecretKey("sb_secret_example_123-abc"), "sb_secret_example_123-abc");
});

test("rejects copied keys containing whitespace or line breaks", () => {
  assert.equal(parseSupabaseSecretKey(" sb_secret_example"), null);
  assert.equal(parseSupabaseSecretKey("sb_secret_exam\nple"), null);
  assert.equal(parseSupabaseSecretKey("sb_secret_example\t"), null);
});

test("rejects missing and legacy service role keys", () => {
  assert.equal(parseSupabaseSecretKey(undefined), null);
  assert.equal(parseSupabaseSecretKey("eyJhbGciOiJIUzI1NiJ9.example"), null);
});
