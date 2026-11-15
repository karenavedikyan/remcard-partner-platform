import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildOrderItems } from "@/lib/order-totals";
import {
  classifyStoreOrderPostResponse,
  clearStoreOrderAttempt,
  createStoreOrderAttempt,
  loadStoreOrderAttempt,
  markStoreOrderAttemptConflict,
  markStoreOrderAttemptUnknown,
  normalizeStoreOrderAttemptBody,
  prepareStoreOrderRetry,
  releaseStoreOrderAttemptForEdit,
  storeOrderAttemptBodiesEqual,
  STORE_ORDER_ATTEMPT_STORAGE_KEY,
} from "@/lib/store-order-attempt";

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
  vi.stubGlobal("crypto", {
    randomUUID: () => "550e8400-e29b-41d4-a716-446655440000",
  });
});

afterEach(() => {
  storage.clear();
  vi.unstubAllGlobals();
});

describe("store-order-attempt", () => {
  it("preserves individual terms verbatim through storage and unknown-result retry", () => {
    const body = {
      certificateCode: "RC-TEST",
      items: [
        {
          category: "doors",
          amount: 120000,
          rewardConfirmation: { days: 14, kind: "GOODS" as const, fulfilledAt: null },
        },
        {
          category: "flooring",
          amount: 57000,
          rewardConfirmation: { days: 0, kind: "SERVICE" as const, fulfilledAt: "ON_OPERATION" },
        },
      ],
    };
    const created = createStoreOrderAttempt({ userId: "user-1", body });
    assert.equal(created.ok, true);
    markStoreOrderAttemptUnknown("user-1");
    const retry = prepareStoreOrderRetry("user-1");
    assert.equal(retry.ok, true);
    if (!retry.ok) return;
    for (const item of body.items) {
      assert.deepEqual(
        retry.record.body.items.find((i) => i.category === item.category)?.rewardConfirmation,
        item.rewardConfirmation,
      );
    }
  });

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

describe("store-order-attempt discount transport", () => {
  it("normalize preserves explicit 0/6/12 discountPercent", () => {
    const normalized = normalizeStoreOrderAttemptBody({
      certificateCode: " RC ",
      items: [
        { category: "doors", amount: 1000, discountPercent: 0 },
        { category: "floor", amount: 2000, discountPercent: 6 },
        { category: "hvac", amount: 3000, discountPercent: 12 },
      ],
    });
    assert.deepEqual(normalized.items.map((i) => i.discountPercent), [0, 6, 12]);
  });

  it("bodiesEqual distinguishes 6% vs 8% on the same line", () => {
    const a = {
      certificateCode: "X",
      items: [{ category: "doors", amount: 1000, discountPercent: 6 }],
    };
    const b = {
      certificateCode: "X",
      items: [{ category: "doors", amount: 1000, discountPercent: 8 }],
    };
    expect(storeOrderAttemptBodiesEqual(a, b)).toBe(false);
  });

  it("buildOrderItems → createStoreOrderAttempt keeps discount on first POST body", () => {
    const categories = [
      { category: "doors", categoryLabel: "Двери", discountPercent: 7, issuerPercent: 3 },
    ];
    const items = buildOrderItems(categories, { doors: "10000" }, { doors: "6" });
    assert.equal(items[0]?.discountPercent, 6);
    const created = createStoreOrderAttempt({
      userId: "u1",
      body: { certificateCode: "PROMO", items },
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal(created.record.body.items[0]?.discountPercent, 6);
    const stored = JSON.parse(storage.get(STORE_ORDER_ATTEMPT_STORAGE_KEY) ?? "");
    assert.equal(stored.body.items[0].discountPercent, 6);
  });

  it("retry reuses stored body with unchanged discount", () => {
    const body = {
      certificateCode: "PROMO",
      items: [{ category: "doors", amount: 1000, discountPercent: 12 }],
    };
    createStoreOrderAttempt({ userId: "u1", body });
    markStoreOrderAttemptUnknown("u1");
    const retry = prepareStoreOrderRetry("u1");
    assert.equal(retry.ok, true);
    if (!retry.ok) return;
    assert.equal(retry.record.body.items[0]?.discountPercent, 12);
  });
});