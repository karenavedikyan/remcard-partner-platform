import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapVerifyCodeError,
  resolveDestinationAfterAuth,
  resolveStepFromReadiness,
  sanitizeReturnTo,
} from "./auth-flow.ts";
import type { CabinetReadiness } from "./cabinet-readiness.ts";

const ready: CabinetReadiness = {
  nextStep: "ready",
  missingConsents: [],
  needsProfileOnboarding: false,
  canAccessCabinet: true,
  isEmployee: false,
  isAdmin: false,
};

const needsConsents: CabinetReadiness = {
  nextStep: "consents",
  missingConsents: [
    {
      kind: "TERMS",
      legalDocumentId: "d1",
      version: "1",
      url: "/terms",
      status: "missing",
    },
  ],
  needsProfileOnboarding: false,
  canAccessCabinet: false,
  isEmployee: false,
  isAdmin: false,
};

describe("sanitizeReturnTo", () => {
  it("allows safe internal paths", () => {
    assert.equal(sanitizeReturnTo("/scanner"), "/scanner");
    assert.equal(sanitizeReturnTo("/history/purchases/abc"), "/history/purchases/abc");
  });

  it("rejects external, login loops and onboarding loops", () => {
    assert.equal(sanitizeReturnTo("https://evil.test"), null);
    assert.equal(sanitizeReturnTo("//evil.test"), null);
    assert.equal(sanitizeReturnTo("/login"), null);
    assert.equal(sanitizeReturnTo("/onboarding"), null);
  });
});

describe("resolveStepFromReadiness", () => {
  it("routes session with pending consents to consents step", () => {
    assert.equal(resolveStepFromReadiness(needsConsents, true), "consents");
    assert.equal(resolveStepFromReadiness(ready, true), "done");
    assert.equal(resolveStepFromReadiness(null, false), "code");
  });
});

describe("resolveDestinationAfterAuth", () => {
  it("routes ready PRO to returnTo", () => {
    assert.equal(resolveDestinationAfterAuth(ready, "/scanner"), "/scanner");
  });

  it("routes CLIENT profile need to onboarding", () => {
    const profile: CabinetReadiness = {
      ...needsConsents,
      nextStep: "profile",
      needsProfileOnboarding: true,
      missingConsents: [],
    };
    assert.equal(resolveDestinationAfterAuth(profile, "/scanner"), "/onboarding?returnTo=%2Fscanner");
  });
});

describe("mapVerifyCodeError", () => {
  it("maps auth failures to user-facing messages", () => {
    assert.match(mapVerifyCodeError(401, { error: "x" }), /неверный/i);
    assert.match(mapVerifyCodeError(429, { retryAfter: 30 }), /30/);
    assert.match(mapVerifyCodeError(0, null), /соединение/i);
  });
});
