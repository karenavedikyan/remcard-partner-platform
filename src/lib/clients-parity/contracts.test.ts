import { describe, expect, it } from "vitest";
import {
  blockerForRequirement,
  CLIENTS_CANONICAL_ROUTES,
  CLIENTS_CONTRACT_BLOCKERS,
  CLIENTS_DECISIONS,
  CLIENTS_K8_OPEN_GAPS,
  CLIENTS_K8_SOURCE_OF_TRUTH,
  CLIENTS_K8_UNRESOLVED_GAPS,
  CLIENTS_LIST_RESPONSE_CONTRACT,
  CLIENTS_NAVIGATOR_FIXED_ASSEMBLY,
  CLIENTS_PARALLEL_FILE_OWNERSHIP,
  CLIENTS_PURCHASE_READ_SEMANTICS,
  CLIENTS_RECEIVING_HTTP_CONTRACT,
  CLIENTS_OBSERVER_DETAIL_HTTP_CONTRACT,
  CLIENTS_OBSERVER_PUBLIC_TIMELINE,
  CLIENTS_OBSERVER_REFERRER_LIST_SCOPE,
  RECEIVING_APPEAL_K1_TO_UI_MAP,
  RECEIVING_K1_P6_LIST_WIRE_CONTRACT,
  RECEIVING_MANUAL_POST_UI_TO_K1_MAP,
  CLIENTS_NAVIGATOR_ACTUAL_HTTP,
  CLIENTS_PARTNER_SETTINGS_SCOPE,
  CLIENTS_SECTION_OWNERS,
  CLIENTS_RECEIVING_IDENTITY,
  OBSERVER_APPEAL_ADAPTER_MAP,
  OBSERVER_PARTNER_META_ADAPTER_MAP,
  OBSERVER_P5_TO_K5_BATCH_ACTION,
  routesForBlocker,
} from "./contracts";
import { fetchObserverReferredAppeals } from "./fetch-observer-appeals";
import {
  CLIENTS_APPEAL_SYSTEM_STAGE,
  mapReceivingAppealWireToUiRow,
  mapReceivingUiManualCreateToK1Post,
  normalizeK1ReceivingListHttp,
} from "./types";

describe("clients parity contracts", () => {
  it("maps C07 to receiving blocker", () => {
    expect(blockerForRequirement("C07")?.id).toBe("BLK-RECEIVING-APPEALS");
  });

  it("fetch observer returns blocked", async () => {
    const res = await fetchObserverReferredAppeals();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.blockerId).toBe("BLK-OBSERVER-REFERRED");
      expect(res.missingRoutes.length).toBeGreaterThan(0);
    }
  });

  it("has three contract blockers", () => {
    expect(CLIENTS_CONTRACT_BLOCKERS).toHaveLength(3);
  });

  it("inventory routes stay NOT_IMPLEMENTED until K1/K2/K5 HTTP lands", () => {
    expect(CLIENTS_K8_SOURCE_OF_TRUTH.status).toBe("DRAFT_K8_CANDIDATE");
    expect(CLIENTS_K8_SOURCE_OF_TRUTH.schemaCoreCommitSha).toMatch(/^6f09c23e/);
    expect(CLIENTS_LIST_RESPONSE_CONTRACT.k2HttpObserverActual.shape).toContain("appeals");
    expect(CLIENTS_PURCHASE_READ_SEMANTICS.blockerId).toBe("BLK-CLIENTS-PURCHASE-READ");
    expect(CLIENTS_NAVIGATOR_FIXED_ASSEMBLY.k1).toMatch(/^83f279e8/);
    expect(CLIENTS_RECEIVING_HTTP_CONTRACT.stagePatchPath).toContain("/stage");
    expect(CLIENTS_LIST_RESPONSE_CONTRACT.k1HttpReceivingActual.shape).toContain("appeals");
    expect(CLIENTS_PURCHASE_READ_SEMANTICS.status).toBe("PARTIAL_K8_1894569a_K2_DIVERGES");
    const ready = CLIENTS_CANONICAL_ROUTES.filter((r) => r.status === "READY");
    expect(ready).toHaveLength(0);
    expect(routesForBlocker("BLK-OBSERVER-REFERRED").length).toBeGreaterThanOrEqual(4);
    expect(CLIENTS_K8_UNRESOLVED_GAPS.length).toBeGreaterThanOrEqual(10);
    expect(CLIENTS_K8_OPEN_GAPS.map((g) => g.id)).not.toContain("GAP-P5-518f6dd8");
    expect(CLIENTS_NAVIGATOR_ACTUAL_HTTP.p5CorrectCommit).toMatch(/^a7b111d2/);
    expect(CLIENTS_PARALLEL_FILE_OWNERSHIP.p2Exclusive).toContain(
      "src/lib/clients-parity/contracts.ts",
    );
    expect(CLIENTS_K8_UNRESOLVED_GAPS.map((g) => g.id)).toContain("GAP-K8-N");
    expect(CLIENTS_K8_OPEN_GAPS.map((g) => g.id)).toContain("GAP-K1-HTTP-ACCESS");
    expect(CLIENTS_OBSERVER_REFERRER_LIST_SCOPE.explicitNonFilters[0]).toContain("deletedAt");
    expect(CLIENTS_OBSERVER_PUBLIC_TIMELINE.wireFields).toEqual(["at", "text"]);
    expect(CLIENTS_OBSERVER_DETAIL_HTTP_CONTRACT.route).toContain("referred-appeals");
    expect(CLIENTS_NAVIGATOR_ACTUAL_HTTP.observerDetail.response200).toContain("timeline");
    expect(RECEIVING_APPEAL_K1_TO_UI_MAP.clientDisplayName).toBe("clientName");
    expect(RECEIVING_MANUAL_POST_UI_TO_K1_MAP.clientName).toBe("clientDisplayName");
    expect(RECEIVING_K1_P6_LIST_WIRE_CONTRACT.separateLoads.kpis).toContain("NOT on list");
    const ui = mapReceivingAppealWireToUiRow({
      id: "a1",
      clientDisplayName: "Иван",
      certificateId: "c1",
      receivingPartnerUserId: "u1",
      receivingOrganizationId: null,
      receivingBranchId: null,
      referrerProUserId: "r1",
      originKind: "MANUAL",
      manualSourceKey: "phone",
      stageKey: "sys_new",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(ui.clientName).toBe("Иван");
    expect(ui.stageId).toBe("sys_new");
    expect(ui.manualEntry).toBe(true);
    expect(mapReceivingUiManualCreateToK1Post({ clientName: "X", manualChannel: "phone" })).toEqual({
      clientDisplayName: "X",
      manualSourceKey: "phone",
      interest: null,
      clientCity: null,
      clientContact: null,
    });
    const list = normalizeK1ReceivingListHttp({
      appeals: [],
      nextCursor: null,
      tab: "incoming",
      readOnly: true,
    });
    expect(list.access.mutationsAllowed).toBe(false);
    expect(CLIENTS_LIST_RESPONSE_CONTRACT.k8LibReceiving.forbiddenAliases).toContain("appeals");
    expect(CLIENTS_LIST_RESPONSE_CONTRACT.partnerP3Normalized.shape).toContain("appeals");
    expect(CLIENTS_NAVIGATOR_ACTUAL_HTTP.personalMetaPatch.path).toContain("personal-meta");
    expect(CLIENTS_SECTION_OWNERS.partnerProxyAllowlist).toBe("P1");
    expect(OBSERVER_P5_TO_K5_BATCH_ACTION["set-tag"]).toBe("setTag");
    expect(CLIENTS_PARTNER_SETTINGS_SCOPE.p2Decision).toContain("receivingPartnerUserId");
    expect(OBSERVER_APPEAL_ADAPTER_MAP.receivingPartnerUserId).toBe("receivingPartnerId");
    expect(CLIENTS_RECEIVING_IDENTITY.trustedColumn).toBe("receivingPartnerUserId");
    expect(OBSERVER_PARTNER_META_ADAPTER_MAP.receivingPartnerUserId).toBe("id");
    expect(CLIENTS_DECISIONS).toHaveLength(7);
  });

  it("system stage ids match frozen prototype", () => {
    expect(CLIENTS_APPEAL_SYSTEM_STAGE.NEW).toBe("sys_new");
    expect(CLIENTS_APPEAL_SYSTEM_STAGE.PAID).toBe("sys_paid");
  });
});
