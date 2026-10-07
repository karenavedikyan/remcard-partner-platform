import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapVerifyCodeError, resolvePostLoginPath, sanitizeReturnTo } from "./auth-flow.ts";
import type { AuthUser } from "./types.ts";

const proUser: AuthUser = { id: "u1", role: "PRO" };
const clientUser: AuthUser = { id: "u2", role: "CLIENT" };

describe("sanitizeReturnTo", () => {
  it("allows safe internal paths", () => {
    assert.equal(sanitizeReturnTo("/scanner"), "/scanner");
    assert.equal(sanitizeReturnTo("/history/purchases/abc"), "/history/purchases/abc");
  });

  it("rejects external and protocol-relative paths", () => {
    assert.equal(sanitizeReturnTo("https://evil.test"), null);
    assert.equal(sanitizeReturnTo("//evil.test"), null);
    assert.equal(sanitizeReturnTo("/login?x=1"), null);
  });
});

describe("resolvePostLoginPath", () => {
  it("routes PRO to returnTo or home", () => {
    assert.equal(resolvePostLoginPath(proUser, "/scanner"), "/scanner");
    assert.equal(resolvePostLoginPath(proUser, null), "/");
  });

  it("routes CLIENT to onboarding with returnTo", () => {
    assert.equal(resolvePostLoginPath(clientUser, "/scanner"), "/onboarding?returnTo=%2Fscanner");
  });
});

describe("mapVerifyCodeError", () => {
  it("maps auth failures to user-facing messages", () => {
    assert.match(mapVerifyCodeError(401, { error: "x" }), /неверный/i);
    assert.match(mapVerifyCodeError(429, { retryAfter: 30 }), /30/);
    assert.match(mapVerifyCodeError(0, null), /соединение/i);
  });
});
