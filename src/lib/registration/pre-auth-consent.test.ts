import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPreAuthConsentAck,
  loadPreAuthConsentAck,
  preAuthDocumentHref,
  savePreAuthConsentAck,
} from "./pre-auth-consent";

describe("registration pre-auth consent (local only)", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("starts unchecked in storage", () => {
    expect(loadPreAuthConsentAck("agent")).toBe(false);
  });

  it("persists acknowledgement per registration kind", () => {
    savePreAuthConsentAck("agent");
    expect(loadPreAuthConsentAck("agent")).toBe(true);
    expect(loadPreAuthConsentAck("specialist")).toBe(false);
    clearPreAuthConsentAck("agent");
    expect(loadPreAuthConsentAck("agent")).toBe(false);
  });

  it("uses canonical legal URLs", () => {
    const base = "https://remcard.ru";
    expect(preAuthDocumentHref(base, "PERSONAL_DATA")).toBe(`${base}/privacy`);
    expect(preAuthDocumentHref(base, "TERMS")).toBe(`${base}/terms`);
    expect(preAuthDocumentHref(base, "PUBLIC_OFFER_PRO")).toBe(`${base}/legal/public-offer-pro`);
  });
});
