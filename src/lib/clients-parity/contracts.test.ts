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
  CLIENTS_PARTNER_SETTINGS_SCOPE,
  OBSERVER_APPEAL_ADAPTER_MAP,
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
    expect(CLIENTS_K8_SOURCE_OF_TRUTH.schemaCoreCommitSha).toMatch(/^e11f7e59/);
    expect(CLIENTS_CANONICAL_ROUTES.every((r) => r.status === "NOT_IMPLEMENTED")).toBe(true);
    expect(routesForBlocker("BLK-OBSERVER-REFERRED")).toHaveLength(3);
    expect(CLIENTS_K8_UNRESOLVED_GAPS).toHaveLength(8);
    expect(CLIENTS_K8_OPEN_GAPS.map((g) => g.id)).toEqual([
      "GAP-K8-E",
      "GAP-K8-F",
      "GAP-K8-G",
      "GAP-K8-H",
    ]);
    expect(CLIENTS_LIST_RESPONSE_CONTRACT.k8LibReceiving.forbiddenAliases).toContain("appeals");
    expect(CLIENTS_LIST_RESPONSE_CONTRACT.partnerP3Normalized.shape).toContain("appeals");
    expect(CLIENTS_PARTNER_SETTINGS_SCOPE.p2Decision).toContain("UNRESOLVED");
    expect(OBSERVER_APPEAL_ADAPTER_MAP.receivingBranchId).toBe("receivingPartnerId");
    expect(CLIENTS_DECISIONS).toHaveLength(7);
  });

  it("system stage ids match frozen prototype", () => {
    expect(CLIENTS_APPEAL_SYSTEM_STAGE.NEW).toBe("sys_new");
    expect(CLIENTS_APPEAL_SYSTEM_STAGE.PAID).toBe("sys_paid");
  });
});
