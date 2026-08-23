import assert from "node:assert/strict";
import test from "node:test";
import { submitContactInquiry } from "./contact-server.ts";

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
      submitContactInquiry({
        userId: null,
        email: "smoke-test@nomilog.invalid",
        category: "other",
        message: "This request must stop before network access.",
        fingerprint: "a".repeat(64)
      }),
      /Contact submission credentials are missing/
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
