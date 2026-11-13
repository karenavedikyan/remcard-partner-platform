import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { blockerForRequirement, CLIENTS_CONTRACT_BLOCKERS } from "./contracts";
import { fetchObserverReferredAppeals } from "./fetch-observer-appeals";

const CANONICAL_RECEIVING = JSON.parse(
  readFileSync(join(import.meta.dirname, "canonical-receiving-principal.json"), "utf8"),
) as {
  receivingPrincipal: {
    receivingPartnerUserId: { required: boolean };
    receivingBranchId: { required: boolean; nullable: boolean };
  };
  uiViewModelAlias: { field: string; means: string; not: string };
};

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

  it("pins receiving principal as User.id not Branch.id", () => {
    expect(CANONICAL_RECEIVING.receivingPrincipal.receivingPartnerUserId.required).toBe(true);
    expect(CANONICAL_RECEIVING.receivingPrincipal.receivingBranchId.required).toBe(false);
    expect(CANONICAL_RECEIVING.receivingPrincipal.receivingBranchId.nullable).toBe(true);
    expect(CANONICAL_RECEIVING.uiViewModelAlias.means).toBe("receivingPartnerUserId");
    expect(CANONICAL_RECEIVING.uiViewModelAlias.not).toBe("Branch.id");
  });
});
