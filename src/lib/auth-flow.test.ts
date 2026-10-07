import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSessionRecoveryLoginHref,
  isAuthFlowComplete,
  mapAccessDeniedMessage,
  mapVerifyCodeError,
  resolveAuthFlowFromReadiness,
  resolveDestinationAfterAuth,
  resolveStepFromReadiness,
  sanitizeReturnTo,
  sessionRetryMessage,
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
    assert.equal(resolveStepFromReadiness(ready, true), "loading_readiness");
    assert.equal(resolveStepFromReadiness(null, false), "code");
    assert.equal(resolveStepFromReadiness(null, true), "session_retry");
  });
});

describe("isAuthFlowComplete", () => {
  it("detects ready cabinet access", () => {
    assert.equal(isAuthFlowComplete(ready), true);
    assert.equal(isAuthFlowComplete(needsConsents), false);
  });
});

describe("resolveAuthFlowFromReadiness", () => {
  it("shows login consents before profile onboarding for new CLIENT", () => {
    const client: CabinetReadiness = {
      nextStep: "consents",
      missingConsents: [
        {
          kind: "TERMS",
          legalDocumentId: "d1",
          version: "1",
          url: "/terms",
          status: "missing",
        },
        {
          kind: "PUBLIC_OFFER_PRO",
          legalDocumentId: "d2",
          version: "1",
          url: "/legal/public-offer-pro",
          status: "missing",
        },
      ],
      needsProfileOnboarding: true,
      canAccessCabinet: false,
      isEmployee: false,
      isAdmin: false,
    };
    assert.equal(resolveAuthFlowFromReadiness(client), "consents");
  });

  it("routes OWNER+PRO with cabinet access to complete", () => {
    const ownerPro: CabinetReadiness = {
      nextStep: "ready",
      missingConsents: [],
      needsProfileOnboarding: false,
      canAccessCabinet: true,
      isEmployee: false,
      isAdmin: true,
    };
    assert.equal(resolveAuthFlowFromReadiness(ownerPro), "complete");
    assert.equal(isAuthFlowComplete(ownerPro), true);
  });

  it("routes empty consents with denied access to access_denied", () => {
    const denied: CabinetReadiness = {
      nextStep: "ready",
      missingConsents: [],
      needsProfileOnboarding: false,
      canAccessCabinet: false,
      isEmployee: false,
      isAdmin: true,
    };
    assert.equal(resolveAuthFlowFromReadiness(denied), "access_denied");
    assert.match(mapAccessDeniedMessage(denied), /PRO/i);
  });

  it("routes to onboarding only after login consents are satisfied", () => {
    const profileOnly: CabinetReadiness = {
      nextStep: "profile",
      missingConsents: [
        {
          kind: "PUBLIC_OFFER_PRO",
          legalDocumentId: "d2",
          version: "1",
          url: "/legal/public-offer-pro",
          status: "missing",
        },
      ],
      needsProfileOnboarding: true,
      canAccessCabinet: false,
      isEmployee: false,
      isAdmin: false,
    };
    assert.equal(resolveAuthFlowFromReadiness(profileOnly), "onboarding");
  });
});

describe("resolveDestinationAfterAuth", () => {
  it("routes ready PRO to returnTo", () => {
    assert.equal(resolveDestinationAfterAuth(ready, "/scanner"), "/scanner");
  });

  it("routes OWNER+PRO with cabinet access to returnTo despite isAdmin", () => {
    const ownerPro: CabinetReadiness = {
      ...ready,
      isAdmin: true,
    };
    assert.equal(resolveDestinationAfterAuth(ownerPro, "/scanner"), "/scanner");
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

  it("routes unsupported context to role notice instead of login loop", () => {
    const blocked: CabinetReadiness = {
      ...ready,
      canAccessCabinet: false,
      needsProfileOnboarding: false,
    };
    assert.equal(resolveDestinationAfterAuth(blocked, "/scanner"), "/?reason=role");
  });

  it("routes employee without cabinet flag to returnTo", () => {
    const employee: CabinetReadiness = {
      ...ready,
      canAccessCabinet: false,
      isEmployee: true,
    };
    assert.equal(resolveDestinationAfterAuth(employee, "/scanner"), "/scanner");
  });
});

describe("mapVerifyCodeError", () => {
  it("maps auth failures to user-facing messages", () => {
    assert.match(mapVerifyCodeError(401, { error: "x" }), /неверный/i);
    assert.match(mapVerifyCodeError(429, { retryAfter: 30 }), /30/);
    assert.match(mapVerifyCodeError(0, null), /соединение/i);
  });
});

describe("buildSessionRecoveryLoginHref", () => {
  it("passes safe final destination without onboarding wrapper", () => {
    assert.equal(
      buildSessionRecoveryLoginHref("/scanner"),
      "/login?reason=session&returnTo=%2Fscanner",
    );
    assert.equal(
      buildSessionRecoveryLoginHref("/history/purchases/abc"),
      "/login?reason=session&returnTo=%2Fhistory%2Fpurchases%2Fabc",
    );
  });

  it("rejects external and loop-prone returnTo values", () => {
    assert.equal(buildSessionRecoveryLoginHref("https://evil.test"), "/login?reason=session");
    assert.equal(
      buildSessionRecoveryLoginHref("/onboarding?returnTo=%2Fscanner"),
      "/login?reason=session",
    );
    assert.equal(buildSessionRecoveryLoginHref("/login"), "/login?reason=session");
  });
});

describe("sessionRetryMessage", () => {
  it("does not mention invalid code after session established", () => {
    assert.doesNotMatch(sessionRetryMessage("network"), /неверный/i);
    assert.doesNotMatch(sessionRetryMessage("server"), /неверный/i);
    assert.match(sessionRetryMessage("session_lost"), /войдите/i);
  });
});
