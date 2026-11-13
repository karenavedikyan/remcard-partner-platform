import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { QA_PRE_AUTH_CONSENTS } from "./pre-auth-consent-fixtures.ts";
import {
  clearPreAuthConsentSnapshot,
  createPreAuthAttemptId,
  isPreAuthMessengerGateReady,
  loadPreAuthConsentAck,
  loadPreAuthConsentSnapshot,
  preAuthDocumentHref,
  savePreAuthConsentSnapshot,
} from "./pre-auth-consent.ts";

describe("registration pre-auth consent snapshot", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        clear: () => store.clear(),
      },
    });
  });

  it("rejects legacy boolean acknowledgement", () => {
    sessionStorage.setItem("remcard.registration.preAuthConsent.v1:agent", "1");
    assert.equal(loadPreAuthConsentAck("agent"), false);
    assert.equal(sessionStorage.getItem("remcard.registration.preAuthConsent.v1:agent"), null);
  });

  it("persists versioned snapshot per registration kind", () => {
    const attempt = createPreAuthAttemptId();
    assert.equal(
      savePreAuthConsentSnapshot("agent", QA_PRE_AUTH_CONSENTS.requirements, attempt),
      true,
    );
    assert.equal(isPreAuthMessengerGateReady("agent", QA_PRE_AUTH_CONSENTS), true);
    assert.equal(isPreAuthMessengerGateReady("specialist", QA_PRE_AUTH_CONSENTS), false);
    clearPreAuthConsentSnapshot("agent");
    assert.equal(loadPreAuthConsentSnapshot("agent"), null);
  });

  it("uses requirement document URLs when present", () => {
    const req = QA_PRE_AUTH_CONSENTS.requirements[0];
    assert.equal(preAuthDocumentHref("https://remcard.ru", "PERSONAL_DATA", req), "https://remcard.ru/privacy");
  });
});
