import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchObserverReferredAppealDetail,
  observerReferredAppealDetailPath,
} from "@/lib/clients-parity/fetch-observer-appeal-detail";

describe("P3 fetchObserverReferredAppealDetail (K2 c49d71dc)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GETs encoded detail path", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const url = typeof input === "string" ? input : input.url;
      expect(url).toContain(observerReferredAppealDetailPath("appeal-1"));
      return new Response(
        JSON.stringify({
          appeal: {
            id: "appeal-1",
            clientDisplayName: "Клиент",
            receivingPartnerUserId: "u-rcv",
            updatedAt: "2026-01-02T00:00:00.000Z",
            stageKey: "sys_new",
            certificateId: null,
          },
          receivingPartner: { receivingPartnerUserId: "u-rcv", displayName: "Партнёр" },
          timeline: [{ at: "2026-01-01T00:00:00.000Z", text: "Направлено" }],
          purchase: { amountKopecks: 150000, note: "чек" },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchObserverReferredAppealDetail("appeal-1");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.appeal.id).toBe("appeal-1");
      expect(res.timeline).toEqual([{ at: "2026-01-01T00:00:00.000Z", text: "Направлено" }]);
      expect(res.purchase).toEqual({ amountKopecks: 150000, note: "чек" });
    }
  });

  it("maps 404 to NOT_FOUND", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "missing" }), { status: 404 })),
    );
    const res = await fetchObserverReferredAppealDetail("gone");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("NOT_FOUND");
  });

  it("maps proxy path block to BLOCKED_CONTRACT only when path blocked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "Path not allowed" }), { status: 403 }),
      ),
    );
    const res = await fetchObserverReferredAppealDetail("a1");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("BLOCKED_CONTRACT");
  });
});
