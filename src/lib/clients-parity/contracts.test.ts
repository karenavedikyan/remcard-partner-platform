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
  CLIENTS_PARALLEL_FILE_OWNERSHIP,
  CLIENTS_PURCHASE_READ_SEMANTICS,
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
import { CLIENTS_APPEAL_SYSTEM_STAGE } from "./types";

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
    const notReady = CLIENTS_CANONICAL_ROUTES.filter((r) => r.status !== "READY");
    expect(notReady.length).toBe(CLIENTS_CANONICAL_ROUTES.length);
    expect(routesForBlocker("BLK-OBSERVER-REFERRED").length).toBeGreaterThanOrEqual(4);
    expect(CLIENTS_K8_UNRESOLVED_GAPS.length).toBeGreaterThanOrEqual(10);
    expect(CLIENTS_K8_OPEN_GAPS.map((g) => g.id)).not.toContain("GAP-P5-518f6dd8");
    expect(CLIENTS_NAVIGATOR_ACTUAL_HTTP.p5CorrectCommit).toMatch(/^a7b111d2/);
    expect(CLIENTS_PARALLEL_FILE_OWNERSHIP.p2Exclusive).toContain(
      "src/lib/clients-parity/contracts.ts",
    );
    expect(CLIENTS_K8_OPEN_GAPS.map((g) => g.id)).toContain("GAP-K8-N");
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
