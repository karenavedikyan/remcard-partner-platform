import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  clearPreAuthConsentAck,
  loadPreAuthConsentAck,
  preAuthDocumentHref,
  savePreAuthConsentAck,
} from "./pre-auth-consent.ts";

describe("registration pre-auth consent (local only)", () => {
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

  it("starts unchecked in storage", () => {
    assert.equal(loadPreAuthConsentAck("agent"), false);
  });

  it("persists acknowledgement per registration kind", () => {
    savePreAuthConsentAck("agent");
    assert.equal(loadPreAuthConsentAck("agent"), true);
    assert.equal(loadPreAuthConsentAck("specialist"), false);
    clearPreAuthConsentAck("agent");
    assert.equal(loadPreAuthConsentAck("agent"), false);
  });

  it("uses canonical legal URLs", () => {
    const base = "https://remcard.ru";
    assert.equal(preAuthDocumentHref(base, "PERSONAL_DATA"), `${base}/privacy`);
    assert.equal(preAuthDocumentHref(base, "TERMS"), `${base}/terms`);
    assert.equal(preAuthDocumentHref(base, "PUBLIC_OFFER_PRO"), `${base}/legal/public-offer-pro`);
  });
});
