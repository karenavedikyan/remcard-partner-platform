import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseStoreOrderIdempotencyKey } from "./store-order-idempotency-key.ts";
import { resolveStoreOrderIdempotencyKey } from "./remcard-proxy.ts";

describe("parseStoreOrderIdempotencyKey", () => {
  it("accepts UUID keys", () => {
    const parsed = parseStoreOrderIdempotencyKey("550e8400-e29b-41d4-a716-446655440000");
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.key, "550e8400-e29b-41d4-a716-446655440000");
    }
  });

  it("rejects empty and invalid keys", () => {
    assert.equal(parseStoreOrderIdempotencyKey(null).ok, false);
    assert.equal(parseStoreOrderIdempotencyKey("").ok, false);
    assert.equal(parseStoreOrderIdempotencyKey("bad key!").ok, false);
  });
});

describe("resolveStoreOrderIdempotencyKey", () => {
  it("requires key only for POST /api/store/order", () => {
    assert.deepEqual(
      resolveStoreOrderIdempotencyKey("POST", "/api/store/order/preview", null),
      { ok: true, key: null },
    );
    assert.equal(
      resolveStoreOrderIdempotencyKey("POST", "/api/store/order", null).ok,
      false,
    );
  });
});
