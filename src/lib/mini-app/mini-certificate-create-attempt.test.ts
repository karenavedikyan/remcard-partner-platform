import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError } from "@/lib/api-client";
import {
  beginMiniCertificateCreateAttempt,
  classifyMiniCertificateCreateFailure,
  clearMiniCertificateCreateAttempt,
  loadMiniCertificateCreateAttempt,
  markMiniCertificateCreateAttemptUnknown,
  prepareMiniCertificateCreateRetry,
} from "@/lib/mini-app/mini-certificate-create-attempt";

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

const scope = { actorUserId: "actor-1", platform: "telegram" as const, branchId: "br-1" };

const sampleBody = {
  partners: [
    {
      storeUserId: "store-1",
      storeName: "Alpha",
      partnershipId: "part-1",
      isSelfScan: false,
      categories: [
        { category: "doors", categoryLabel: "Двери", discountPercent: 5, issuerPercent: 5 },
      ],
    },
  ],
  maxUsages: 0,
  agentClientId: "client-1",
};

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

describe("mini-certificate-create-attempt", () => {
  it("persists attempt before POST and survives reload for retry", () => {
    const began = beginMiniCertificateCreateAttempt({ scope, body: sampleBody });
    assert.equal(began.ok, true);
    if (!began.ok) return;
    markMiniCertificateCreateAttemptUnknown(scope, began.record.idempotencyKey);
    const afterReload = loadMiniCertificateCreateAttempt(scope);
    assert.ok(afterReload);
    assert.equal(afterReload?.idempotencyKey, "550e8400-e29b-41d4-a716-446655440000");
    const retry = prepareMiniCertificateCreateRetry(scope);
    assert.equal(retry.ok, true);
    if (!retry.ok) return;
    expect(retry.record.body).toEqual(sampleBody);
  });

  it("blocks fresh attempt when unknown exists with same payload", () => {
    beginMiniCertificateCreateAttempt({ scope, body: sampleBody });
    markMiniCertificateCreateAttemptUnknown(scope, "550e8400-e29b-41d4-a716-446655440000");
    const again = beginMiniCertificateCreateAttempt({ scope, body: sampleBody });
    assert.equal(again.ok, false);
    if (again.ok) return;
    expect(again.reason).toBe("use_retry");
  });

  it("rejects fresh attempt when payload changed under open attempt", () => {
    beginMiniCertificateCreateAttempt({ scope, body: sampleBody });
    markMiniCertificateCreateAttemptUnknown(scope, "550e8400-e29b-41d4-a716-446655440000");
    const otherBody = {
      ...sampleBody,
      partners: [
        {
          ...sampleBody.partners[0],
          categories: [{ category: "win", categoryLabel: "Окна", discountPercent: 4, issuerPercent: 6 }],
        },
      ],
    };
    const again = beginMiniCertificateCreateAttempt({ scope, body: otherBody });
    assert.equal(again.ok, false);
    if (again.ok) return;
    expect(again.reason).toBe("body_mismatch");
  });

  it("isolates attempts per branch scope", () => {
    const beganA = beginMiniCertificateCreateAttempt({ scope, body: sampleBody });
    assert.equal(beganA.ok, true);
    vi.stubGlobal("crypto", { randomUUID: () => "660e8400-e29b-41d4-a716-446655440001" });
    const beganB = beginMiniCertificateCreateAttempt({
      scope: { ...scope, branchId: "br-2" },
      body: sampleBody,
    });
    assert.equal(beganB.ok, true);
    if (!beganA.ok || !beganB.ok) return;
    expect(beganA.record.idempotencyKey).not.toBe(beganB.record.idempotencyKey);
  });

  it("clears attempt after validation rejection path", () => {
    beginMiniCertificateCreateAttempt({ scope, body: sampleBody });
    clearMiniCertificateCreateAttempt(scope);
    expect(loadMiniCertificateCreateAttempt(scope)).toBeNull();
    const fresh = beginMiniCertificateCreateAttempt({ scope, body: sampleBody });
    assert.equal(fresh.ok, true);
  });

  it("treats 500 as uncertain on first POST", () => {
    const outcome = classifyMiniCertificateCreateFailure(new RemcardApiError(500, "boom"), false);
    expect(outcome.kind).toBe("uncertain");
  });

  it("fails closed when session storage is unavailable", () => {
    vi.stubGlobal("sessionStorage", undefined);
    const began = beginMiniCertificateCreateAttempt({ scope, body: sampleBody });
    assert.equal(began.ok, false);
    if (began.ok) return;
    expect(began.reason).toBe("storage");
  });
});