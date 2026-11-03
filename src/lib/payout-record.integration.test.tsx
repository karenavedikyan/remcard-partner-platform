import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError } from "./api-client";
import {
  fetchBonusPayoutActions,
  isLikelyUnknownPayoutNetworkOutcome,
  recordBonusPayoutFact,
  resetPayoutAttemptIdempotencyKeysForTests,
} from "./payout-record";

describe("payout-record remcardFetch integration (fetch mock only)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    resetPayoutAttemptIdempotencyKeysForTests();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("recordBonusPayoutFact POSTs pay with Idempotency-Key and body", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          bonus: { id: "bonus-1", status: "PAID" },
          payoutRecordId: "pr-1",
          replay: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await recordBonusPayoutFact({
      bonusId: "bonus-1",
      payoutMethod: "CASH",
      payoutNote: "  note  ",
      idempotencyKey: "prof-i-d.bonus-1.test-key",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/remcard/api/bonus/bonus-1/pay");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "Idempotency-Key": "prof-i-d.bonus-1.test-key",
    });
    expect(JSON.parse(String(init.body))).toEqual({
      payoutMethod: "CASH",
      payoutNote: "note",
    });
  });

  it("fetchBonusPayoutActions GETs payout-actions", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          payoutActions: { canRecordCash: true, canRecordTransfer: false },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const actions = await fetchBonusPayoutActions("bonus-2", "bonus");
    expect(actions).toEqual({ canRecordCash: true, canRecordTransfer: false });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/remcard/api/bonus/bonus-2/payout-actions");
    expect(init.method).toBe("GET");
  });

  it("maps fetch network failure to unknown outcome via RemcardApiError(0)", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    let caught: unknown;
    try {
      await recordBonusPayoutFact({
        bonusId: "bonus-3",
        payoutMethod: "TRANSFER",
        idempotencyKey: "key-3",
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(RemcardApiError);
    expect((caught as RemcardApiError).status).toBe(0);
    expect(isLikelyUnknownPayoutNetworkOutcome(caught)).toBe(true);
  });

  it("treats HTTP 504 as unknown outcome and 409 as definite failure", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Gateway timeout" }), {
        status: 504,
        statusText: "Gateway Timeout",
        headers: { "Content-Type": "application/json" },
      }),
    );
    try {
      await recordBonusPayoutFact({
        bonusId: "bonus-4",
        payoutMethod: "CASH",
        idempotencyKey: "key-4",
      });
    } catch (error504) {
      expect(error504).toBeInstanceOf(RemcardApiError);
      expect(isLikelyUnknownPayoutNetworkOutcome(error504)).toBe(true);
    }

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Conflict" }), {
        status: 409,
        statusText: "Conflict",
        headers: { "Content-Type": "application/json" },
      }),
    );
    try {
      await recordBonusPayoutFact({
        bonusId: "bonus-4",
        payoutMethod: "CASH",
        idempotencyKey: "key-4",
      });
    } catch (error409) {
      expect(error409).toBeInstanceOf(RemcardApiError);
      expect(isLikelyUnknownPayoutNetworkOutcome(error409)).toBe(false);
    }
  });
});
