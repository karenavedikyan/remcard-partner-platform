import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchObserverReferredAppeals,
  mapK8AppealStageKey,
  OBSERVER_APPEAL_FORBIDDEN_WIRE_FIELDS,
} from "@/lib/clients-parity/fetch-observer-appeals";

describe("P3 fetchObserverReferredAppeals", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps BFF path block to BLOCKED_CONTRACT", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "Path not allowed" }), { status: 403 }),
      ),
    );
    const res = await fetchObserverReferredAppeals();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("BLOCKED_CONTRACT");
      expect(res.blockerId).toBe("BLK-OBSERVER-REFERRED");
    }
  });

  it("parses K2 paginated list with receivingPartners and overlays", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            items: [
              {
                id: "a1",
                clientDisplayName: "Иван",
                receivingBranchId: "p1",
                stageKey: "sys_new",
                updatedAt: "2026-01-01T00:00:00.000Z",
                createdAt: "2026-01-01T00:00:00.000Z",
                personalOverlay: { alias: "Мой Иван", bucket: "active", version: 2 },
              },
            ],
            page: 1,
            limit: 100,
            total: 1,
            hasMore: false,
            receivingPartners: [{ branchId: "p1", displayName: "Партнёр" }],
          }),
          { status: 200 },
        ),
      ),
    );
    const res = await fetchObserverReferredAppeals();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.appeals).toHaveLength(1);
      expect(res.partners[0]?.name).toBe("Партнёр");
      expect(res.personalMeta.a1?.alias).toBe("Мой Иван");
      expect(res.overlayVersions.a1).toBe(2);
    }
  });

  it("maps K8 observer wire appeals and overlays", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            items: [
              {
                id: "a1",
                clientDisplayName: "Иван",
                receivingBranchId: "branch-1",
                referrerProUserId: "user-me",
                stageKey: "sys_paid",
                updatedAt: "2026-01-02T00:00:00.000Z",
                createdAt: "2026-01-01T00:00:00.000Z",
                privateNotes: "secret",
                clientContact: "+7999",
                paidAmountKopecks: 100,
              },
            ],
            page: 1,
            limit: 100,
            total: 1,
            hasMore: false,
            receivingPartners: [{ branchId: "branch-1", displayName: "Филиал" }],
            personalOverlays: [{ appealId: "a1", alias: "V", bucket: "active", version: 2 }],
          }),
          { status: 200 },
        ),
      ),
    );
    const res = await fetchObserverReferredAppeals();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.appeals[0]?.stageId).toBe("paid");
      expect(res.appeals[0]?.referralAt).toBe("2026-01-01T00:00:00.000Z");
      expect(res.personalMeta.a1?.alias).toBe("V");
      expect(mapK8AppealStageKey("sys_new")).toBe("new");
      expect(OBSERVER_APPEAL_FORBIDDEN_WIRE_FIELDS).toContain("privateNotes");
    }
  });

  it("marks network failure retryable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const res = await fetchObserverReferredAppeals();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("NETWORK");
      expect(res.retryable).toBe(true);
    }
  });
});
