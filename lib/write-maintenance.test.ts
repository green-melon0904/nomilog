import assert from "node:assert/strict";
import test from "node:test";
import { shouldBlockApiWrite } from "./write-maintenance.ts";

test("write maintenance blocks API mutations only when explicitly enabled", () => {
  assert.equal(shouldBlockApiWrite("/api/reviews", "POST", "1"), true);
  assert.equal(shouldBlockApiWrite("/api/reviews", "DELETE", "1"), true);
  assert.equal(shouldBlockApiWrite("/api/reviews", "GET", "1"), false);
  assert.equal(shouldBlockApiWrite("/mypage", "POST", "1"), false);
  assert.equal(shouldBlockApiWrite("/api/reviews", "POST", undefined), false);
  assert.equal(shouldBlockApiWrite("/api/reviews", "POST", "true"), false);
});
