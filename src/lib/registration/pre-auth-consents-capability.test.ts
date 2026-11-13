import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizePreAuthConsents, preAuthConsentsUnavailableMessage } from "./pre-auth-consents-capability.ts";

describe("normalizePreAuthConsents", () => {
  it("returns unavailable block with reason", () => {
    const block = normalizePreAuthConsents({
      contractVersion: "2026-11-13.pre-auth-consent.v1",
      available: false,
      requirements: [],
      reason: "NO_ACTIVE_DOCUMENT",
    });
    assert.equal(block?.available, false);
    assert.equal(block?.reason, "NO_ACTIVE_DOCUMENT");
    assert.match(preAuthConsentsUnavailableMessage(block), /временно недоступны/i);
  });

  it("requires complete trio of documents when available", () => {
    const block = normalizePreAuthConsents({
      contractVersion: "2026-11-13.pre-auth-consent.v1",
      available: true,
      requirements: [
        {
          kind: "PERSONAL_DATA",
          legalDocumentId: "pd",
          version: "1",
          documentUrl: "/privacy",
        },
        {
          kind: "TERMS",
          legalDocumentId: "terms",
          version: "1",
          documentUrl: "/terms",
        },
        {
          kind: "PUBLIC_OFFER_PRO",
          legalDocumentId: "offer",
          version: "1",
          documentUrl: "/legal/public-offer-pro",
        },
      ],
    });
    assert.equal(block?.available, true);
    assert.equal(block?.requirements.length, 3);
  });
});
