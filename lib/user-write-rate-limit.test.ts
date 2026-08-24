import assert from "node:assert/strict";
import test from "node:test";
import { enforceUserWriteRateLimit, parseUserWriteRateLimitDecision } from "./user-write-rate-limit.ts";

test("parses an allowed fixed-window decision", () => {
  assert.deepEqual(parseUserWriteRateLimitDecision([
    { allowed: true, retry_after_seconds: 0 }
  ]), {
    allowed: true,
    retryAfterSeconds: 0
  });
});

test("parses a limited decision returned with PostgREST numeric text", () => {
  assert.deepEqual(parseUserWriteRateLimitDecision([
    { allowed: false, retry_after_seconds: "42" }
  ]), {
    allowed: false,
    retryAfterSeconds: 42
  });
});

test("fails closed when the RPC response is missing or outside the supported window", () => {
  assert.equal(parseUserWriteRateLimitDecision([]), null);
  assert.equal(parseUserWriteRateLimitDecision([{ allowed: "true", retry_after_seconds: 0 }]), null);
  assert.equal(parseUserWriteRateLimitDecision([{ allowed: false, retry_after_seconds: -1 }]), null);
  assert.equal(parseUserWriteRateLimitDecision([{ allowed: false, retry_after_seconds: 3601 }]), null);
});

test("rejects a malformed secret key before creating a Supabase request", async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousSecretKey = process.env.SUPABASE_SECRET_KEY;
  const previousFetch = globalThis.fetch;
  let fetchCalled = false;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_exam\nple";
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error("Network access must not occur");
  }) as typeof fetch;

  try {
    await assert.rejects(
      enforceUserWriteRateLimit("user_01KXASZ52B98E4J26ZZD3K6EHE", "review_create"),
      /User write rate limit credentials are missing/
    );
    assert.equal(fetchCalled, false);
  } finally {
    restoreEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL", previousUrl);
    restoreEnvironmentValue("SUPABASE_SECRET_KEY", previousSecretKey);
    globalThis.fetch = previousFetch;
  }
});

function restoreEnvironmentValue(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
