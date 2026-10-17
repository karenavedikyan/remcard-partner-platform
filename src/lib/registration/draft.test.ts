import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearRegistrationDraft,
  loadRegistrationDraft,
  mergeRegistrationDraftFields,
  REGISTRATION_DRAFT_TTL_MS,
} from "./draft.ts";

describe("registration draft", () => {
  it("exposes TTL", () => {
    assert.ok(REGISTRATION_DRAFT_TTL_MS > 0);
  });

  it("round-trips in sessionStorage when available", () => {
    if (typeof globalThis.sessionStorage === "undefined") {
      return;
    }
    clearRegistrationDraft("agent");
    mergeRegistrationDraftFields("agent", { displayName: "Алекс", city: "Москва" });
    const loaded = loadRegistrationDraft("agent");
    assert.equal(loaded?.fields.displayName, "Алекс");
    assert.equal(loaded?.fields.city, "Москва");
    clearRegistrationDraft("agent");
    assert.equal(loadRegistrationDraft("agent"), null);
  });
});
