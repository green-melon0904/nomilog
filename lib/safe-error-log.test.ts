import assert from "node:assert/strict";
import test from "node:test";
import { createSafeErrorLog } from "./safe-error-log.ts";

test("keeps only a short machine-readable error code", () => {
  const log = createSafeErrorLog({
    code: "42501",
    message: "request failed with sb_secret_example",
    details: "private inquiry body"
  });

  assert.deepEqual(log, { code: "42501" });
  assert.equal(JSON.stringify(log).includes("sb_secret"), false);
  assert.equal(JSON.stringify(log).includes("inquiry body"), false);
});

test("replaces untrusted error codes instead of logging them", () => {
  assert.deepEqual(createSafeErrorLog({ code: "sb_secret_exam\nple" }), { code: "unknown" });
  assert.deepEqual(createSafeErrorLog({ code: "sb_secret_example" }), { code: "unknown" });
  assert.deepEqual(createSafeErrorLog(new Error("private value")), { code: "unknown" });
});

test("keeps PostgREST error codes without accepting arbitrary text", () => {
  assert.deepEqual(createSafeErrorLog({ code: "PGRST116" }), { code: "PGRST116" });
  assert.deepEqual(createSafeErrorLog({ code: "P0001" }), { code: "P0001" });
});
