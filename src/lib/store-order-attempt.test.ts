import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  beginStoreOrderAttempt,
  clearStoreOrderAttempt,
  loadStoreOrderAttempt,
  markStoreOrderAttemptUnknown,
  STORE_ORDER_ATTEMPT_STORAGE_KEY,
} from "./store-order-attempt.ts";

const storage = new Map<string, string>();

function installSessionStorage() {
  (globalThis as typeof globalThis & { sessionStorage: Storage }).sessionStorage = {
    get length() {
      return storage.size;
    },
    clear: () => storage.clear(),
    getItem: (key: string) => storage.get(key) ?? null,
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    removeItem: (key: string) => {
      storage.delete(key);
    },
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  } as Storage;
}

beforeEach(() => {
  storage.clear();
  installSessionStorage();
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: {
      randomUUID: () => "550e8400-e29b-41d4-a716-446655440000",
    },
  });
});

afterEach(() => {
  storage.clear();
});

describe("store-order-attempt", () => {
  it("persists attempt before POST and reuses key on retry", () => {
    const body = {
      certificateCode: "RC-TEST",
      items: [{ category: "doors", amount: 1000 }],
    };

    const first = beginStoreOrderAttempt({ userId: "user-1", body });
    assert.equal(first.ok, true);
    if (!first.ok) return;

    const unknown = markStoreOrderAttemptUnknown("user-1");
    assert.equal(unknown?.status, "unknown");

    const retry = beginStoreOrderAttempt({ userId: "user-1", body, existing: unknown });
    assert.equal(retry.ok, true);
    if (!retry.ok) return;
    assert.equal(retry.record.idempotencyKey, "550e8400-e29b-41d4-a716-446655440000");
  });

  it("does not expose foreign-user attempts", () => {
    const body = {
      certificateCode: "RC-TEST",
      items: [{ category: "doors", amount: 500 }],
    };
    beginStoreOrderAttempt({ userId: "user-1", body });
    assert.equal(loadStoreOrderAttempt("user-2"), null);
  });

  it("treats in_flight after reload as unknown", () => {
    storage.set(
      STORE_ORDER_ATTEMPT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        userId: "user-1",
        idempotencyKey: "key-1",
        body: { certificateCode: "RC-X", items: [{ category: "doors", amount: 100 }] },
        status: "in_flight",
      }),
    );

    const loaded = loadStoreOrderAttempt("user-1");
    assert.equal(loaded?.status, "unknown");
  });

  it("clears attempt on new purchase", () => {
    beginStoreOrderAttempt({
      userId: "user-1",
      body: { certificateCode: "RC-X", items: [{ category: "doors", amount: 100 }] },
    });
    clearStoreOrderAttempt();
    assert.equal(loadStoreOrderAttempt("user-1"), null);
  });
});
