import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  clearAllRegistrationDrafts,
  loadRegistrationDraft,
  mergeRegistrationDraftFields,
  REGISTRATION_DRAFT_TTL_MS,
  saveRegistrationDraft,
} from "./draft.ts";

class MemorySession implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key() {
    return null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

describe("registration draft", () => {
  beforeEach(() => {
    clearAllRegistrationDrafts();
    (globalThis as { sessionStorage?: Storage }).sessionStorage = new MemorySession();
  });

  it("exposes TTL", () => {
    assert.ok(REGISTRATION_DRAFT_TTL_MS > 0);
  });

  it("round-trips in sessionStorage", () => {
    mergeRegistrationDraftFields("agent", { displayName: "Алекс", city: "Москва" });
    const loaded = loadRegistrationDraft("agent");
    assert.equal(loaded?.fields.displayName, "Алекс");
    assert.equal(loaded?.fields.city, "Москва");
    clearAllRegistrationDrafts();
    assert.equal(loadRegistrationDraft("agent"), null);
  });

  it("does not apply draft to a different bound owner", () => {
    saveRegistrationDraft("agent", { displayName: "A" }, "user-1");
    assert.equal(loadRegistrationDraft("agent", "user-2"), null);
    assert.equal(loadRegistrationDraft("agent", "user-1")?.fields.displayName, "A");
  });
});
