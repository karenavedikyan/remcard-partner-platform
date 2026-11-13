import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { QA_PRE_AUTH_CONSENTS } from "./pre-auth-consent-fixtures.ts";
import { partitionPendingByPreAuthSnapshot } from "./pre-auth-consent-handoff.ts";
import {
  clearPreAuthConsentSnapshot,
  createPreAuthAttemptId,
  loadPreAuthConsentSnapshot,
  savePreAuthConsentSnapshot,
} from "./pre-auth-consent.ts";

describe("partitionPendingByPreAuthSnapshot", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, "window", { configurable: true, value: globalThis });
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
      },
    });
    clearPreAuthConsentSnapshot("company");
  });

  it("matches only identical legal document ids and versions", () => {
    savePreAuthConsentSnapshot("company", QA_PRE_AUTH_CONSENTS.requirements, createPreAuthAttemptId());
    const snapshot = loadPreAuthConsentSnapshot("company");
    assert.ok(snapshot);
    const pending = QA_PRE_AUTH_CONSENTS.requirements.map((req, index) => ({
      kind: req.kind,
      legalDocumentId: index === 2 ? "changed-offer" : req.legalDocumentId,
      version: index === 2 ? "99" : req.version,
      url: req.documentUrl,
      status: "missing" as const,
    }));
    const parts = partitionPendingByPreAuthSnapshot(snapshot, pending);
    assert.equal(parts.matching.length, 2);
    assert.equal(parts.unmatchedPending.length, 1);
    assert.equal(parts.unmatchedPending[0]?.kind, "PUBLIC_OFFER_PRO");
  });
});
