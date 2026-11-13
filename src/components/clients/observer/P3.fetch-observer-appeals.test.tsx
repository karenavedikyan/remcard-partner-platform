import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchObserverReferredAppeals,
  mapK8AppealStageKey,
  OBSERVER_APPEAL_FORBIDDEN_WIRE_FIELDS,
  resolveReceivingPrincipalId,
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

  it("maps null certificateId to empty string (P2 120d9a4a)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            appeals: [
              {
                id: "a-manual",
                clientDisplayName: "Без сертификата",
                receivingPartnerUserId: "u1",
                certificateId: null,
                stageKey: "sys_new",
                updatedAt: "2026-01-01T00:00:00.000Z",
                createdAt: "2026-01-01T00:00:00.000Z",
              },
            ],
            partners: [{ receivingPartnerUserId: "u1", displayName: "П", receivingOrganizationId: null, receivingBranchId: null }],
            personalMeta: {},
            page: 1,
            limit: 100,
            total: 1,
            hasMore: false,
            empty: false,
          }),
          { status: 200 },
        ),
      ),
    );
    const res = await fetchObserverReferredAppeals();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.appeals[0]?.certificateId).toBe("");
      expect(res.partners[0]?.receivingBranchId).toBe(null);
    }
  });

  it("prefers receivingPartnerUserId over branch for card key", () => {
    const id = resolveReceivingPrincipalId({
      receivingPartnerUserId: "user-rcv",
      receivingBranchId: "branch-x",
    });
    expect(id).toBe("user-rcv");
  });

  it("parses K2 3c6ccc19 envelope { appeals, partners, personalMeta, page… }", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            appeals: [
              {
                id: "a1",
                clientDisplayName: "Иван",
                receivingBranchId: "branch-9",
                stageKey: "sys_new",
                updatedAt: "2026-01-01T00:00:00.000Z",
                createdAt: "2026-01-01T00:00:00.000Z",
              },
            ],
            partners: [
              {
                receivingBranchId: "branch-9",
                displayName: "Магазин",
                city: "Краснодар",
                category: "Окна",
              },
            ],
            personalMeta: {
              a1: { alias: "Alias", tag: null, note: null, bucket: "active", version: 4 },
            },
            page: 1,
            limit: 100,
            total: 1,
            hasMore: false,
            empty: false,
          }),
          { status: 200 },
        ),
      ),
    );
    const res = await fetchObserverReferredAppeals();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.appeals[0]?.receivingPartnerId).toBe("branch-9");
      expect(res.partners[0]?.name).toBe("Магазин");
      expect(res.personalMeta.a1?.alias).toBe("Alias");
      expect(res.overlayVersions.a1).toBe(4);
    }
  });

  it("parses solo specialist list without branch (User principal only)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            appeals: [
              {
                id: "a1",
                clientDisplayName: "Иван",
                receivingPartnerUserId: "solo-user-1",
                stageKey: "sys_new",
                updatedAt: "2026-01-01T00:00:00.000Z",
                createdAt: "2026-01-01T00:00:00.000Z",
              },
            ],
            partners: [
              {
                receivingPartnerUserId: "solo-user-1",
                displayName: "Специалист Соло",
                city: "Сочи",
              },
            ],
            personalMeta: {},
            page: 1,
            limit: 100,
            total: 1,
            hasMore: false,
            empty: false,
          }),
          { status: 200 },
        ),
      ),
    );
    const res = await fetchObserverReferredAppeals();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.appeals[0]?.receivingPartnerId).toBe("solo-user-1");
      expect(res.partners[0]?.id).toBe("solo-user-1");
      expect(res.partners[0]?.name).toBe("Специалист Соло");
    }
  });

  it("parses K2 paginated list with receivingPartners and overlays", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            appeals: [
              {
                id: "a1",
                clientDisplayName: "Иван",
                receivingPartnerUserId: "p1",
                stageKey: "sys_new",
                updatedAt: "2026-01-01T00:00:00.000Z",
                createdAt: "2026-01-01T00:00:00.000Z",
                personalOverlay: { alias: "Мой Иван", bucket: "active", version: 2 },
              },
            ],
            partners: [{ receivingPartnerUserId: "p1", displayName: "Партнёр" }],
            personalMeta: {},
            page: 1,
            limit: 100,
            total: 1,
            hasMore: false,
            empty: false,
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
                receivingPartnerUserId: "user-rcv-1",
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
            receivingPartners: [{ receivingPartnerUserId: "user-rcv-1", displayName: "Филиал" }],
            personalOverlays: [{ appealId: "a1", alias: "V", bucket: "active", version: 2 }],
          }),
          { status: 200 },
        ),
      ),
    );
    const res = await fetchObserverReferredAppeals();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.appeals[0]?.stageId).toBe("sys_paid");
      expect(res.appeals[0]?.referralAt).toBe("2026-01-01T00:00:00.000Z");
      expect(res.personalMeta.a1?.alias).toBe("V");
      expect(mapK8AppealStageKey("sys_new")).toBe("sys_new");
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
