import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  classifyStoreOrderPostResponse,
  clearStoreOrderAttempt,
  createStoreOrderAttempt,
  loadStoreOrderAttempt,
  markStoreOrderAttemptConflict,
  markStoreOrderAttemptUnknown,
  prepareStoreOrderRetry,
  releaseStoreOrderAttemptForEdit,
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
  it("createStoreOrderAttempt persists before POST", () => {
    const body = {
      certificateCode: "RC-TEST",
      items: [{ category: "doors", amount: 1000 }],
    };

    const first = createStoreOrderAttempt({ userId: "user-1", body });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.record.idempotencyKey, "550e8400-e29b-41d4-a716-446655440000");
  });

  it("prepareStoreOrderRetry reuses stored key+body", () => {
    const body = {
      certificateCode: "RC-TEST",
      items: [{ category: "doors", amount: 1000 }],
    };

    createStoreOrderAttempt({ userId: "user-1", body });
    markStoreOrderAttemptUnknown("user-1");

    const retry = prepareStoreOrderRetry("user-1");
    assert.equal(retry.ok, true);
    if (!retry.ok) return;
    assert.equal(retry.record.idempotencyKey, "550e8400-e29b-41d4-a716-446655440000");
    assert.equal(retry.record.body.items[0].amount, 1000);
  });

  it("does not overwrite attempt when form amount changes 1000 → 2000", () => {
    createStoreOrderAttempt({
      userId: "user-1",
      body: { certificateCode: "RC-TEST", items: [{ category: "doors", amount: 1000 }] },
    });
    markStoreOrderAttemptUnknown("user-1");

    const mismatch = createStoreOrderAttempt({
      userId: "user-1",
      body: { certificateCode: "RC-TEST", items: [{ category: "doors", amount: 2000 }] },
    });
    assert.equal(mismatch.ok, false);
    if (mismatch.ok) return;
    assert.equal(mismatch.reason, "body_mismatch");
    assert.equal(loadStoreOrderAttempt("user-1")?.body.items[0].amount, 1000);
  });

  it("persists conflict after 409 and blocks retry", () => {
    createStoreOrderAttempt({
      userId: "user-1",
      body: { certificateCode: "RC-X", items: [{ category: "doors", amount: 100 }] },
    });
    markStoreOrderAttemptConflict("user-1");

    assert.equal(loadStoreOrderAttempt("user-1")?.status, "conflict");
    assert.deepEqual(prepareStoreOrderRetry("user-1"), { ok: false, reason: "conflict" });
  });

  it("does not expose foreign-user attempts", () => {
    createStoreOrderAttempt({
      userId: "user-1",
      body: { certificateCode: "RC-TEST", items: [{ category: "doors", amount: 500 }] },
    });
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

  it("releaseStoreOrderAttemptForEdit clears after validation failure", () => {
    createStoreOrderAttempt({
      userId: "user-1",
      body: { certificateCode: "RC-X", items: [{ category: "doors", amount: 100 }] },
    });
    releaseStoreOrderAttemptForEdit();
    assert.equal(loadStoreOrderAttempt("user-1"), null);
  });

  it("status 0 is uncertain on first POST and unknown_persist on retry", () => {
    assert.equal(
      classifyStoreOrderPostResponse({ status: 0, payload: null, wasRetry: false }).kind,
      "uncertain",
    );
    assert.equal(
      classifyStoreOrderPostResponse({ status: 0, payload: null, wasRetry: true }).kind,
      "unknown_persist",
    );
  });

  it("classifyStoreOrderPostResponse distinguishes first 400 vs retry 400", () => {
    assert.equal(
      classifyStoreOrderPostResponse({
        status: 400,
        payload: { error: "bad" },
        wasRetry: false,
      }).kind,
      "validation_failed",
    );
    assert.equal(
      classifyStoreOrderPostResponse({
        status: 400,
        payload: { error: "bad" },
        wasRetry: true,
      }).kind,
      "unknown_persist",
    );
  });

  it("clears attempt on new purchase", () => {
    createStoreOrderAttempt({
      userId: "user-1",
      body: { certificateCode: "RC-X", items: [{ category: "doors", amount: 100 }] },
    });
    clearStoreOrderAttempt();
    assert.equal(loadStoreOrderAttempt("user-1"), null);
  });
});
