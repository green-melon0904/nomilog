import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server.js";
import { createAccountDeletedResponse } from "./workos-session-cookies.ts";

test("account deletion expires every WorkOS browser cookie without redirecting", async () => {
  const request = new NextRequest("https://nomilog-eight.vercel.app/api/account", {
    headers: {
      cookie: [
        "wos-session=encrypted-session",
        "workos-access-token=short-lived-token",
        "wos-auth-verifier-a1b2c3d4=pkce-state"
      ].join("; ")
    }
  });

  const response = createAccountDeletedResponse(request);
  const setCookies = response.headers.getSetCookie();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("cache-control"), "no-store");
  for (const name of ["wos-session", "workos-access-token", "wos-auth-verifier-a1b2c3d4"]) {
    const cookie = setCookies.find((value) => value.startsWith(`${name}=`));
    assert.ok(cookie, `${name} should be expired`);
    assert.match(cookie, /Max-Age=0/i);
    assert.match(cookie, /Expires=Thu, 01 Jan 1970 00:00:00 GMT/i);
    assert.match(cookie, /Path=\//i);
    assert.match(cookie, /Secure/i);
  }
});
