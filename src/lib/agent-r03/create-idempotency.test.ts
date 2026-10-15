import { describe, expect, it } from "vitest";
import { hashAgentCreatePayload, resolveCreateIdempotencySession } from "./create-idempotency";

describe("create-idempotency session", () => {
  it("reuses key for same payload hash", () => {
    const body = { partners: [{ storeUserId: "a", storeName: "S", categories: [] }] };
    const hash = hashAgentCreatePayload(body as never);
    const first = resolveCreateIdempotencySession(null, hash);
    const second = resolveCreateIdempotencySession(first, hash);
    expect(second.key).toBe(first.key);
  });

  it("issues new key when payload hash changes", () => {
    const h1 = hashAgentCreatePayload({ partners: [] } as never);
    const h2 = hashAgentCreatePayload({ partners: [{ storeUserId: "x" }] } as never);
    const first = resolveCreateIdempotencySession(null, h1);
    const second = resolveCreateIdempotencySession(first, h2);
    expect(second.key).not.toBe(first.key);
  });
});
