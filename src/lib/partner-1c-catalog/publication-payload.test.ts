import { describe, expect, it } from "vitest";
import {
  collectBranchPricePayloads,
  collectBranchRulePayloads,
  partnerProductsBranchPricesBody,
  partnerProductsBranchRulesBody,
  partnerProductsPublicationBody,
} from "./publication-payload";
import { defaultPublicationState } from "./models";

describe("partner-products API payloads use branchId", () => {
  const branchId = "cm9xbranch000000000000002";

  it("publication body", () => {
    expect(partnerProductsPublicationBody("p004", branchId, true)).toEqual({
      modelId: "p004",
      branches: [{ branchId, excluded: true }],
    });
  });

  it("branch-prices body", () => {
    expect(partnerProductsBranchPricesBody("p004", branchId, 15000)).toEqual({
      modelId: "p004",
      branches: [{ branchId, customPrice: 15000 }],
    });
  });

  it("branch-rules body", () => {
    expect(partnerProductsBranchRulesBody(branchId, 5)).toEqual({
      branches: [{ branchId, adjustPercent: 5 }],
    });
  });

  it("collects payloads from publication state", () => {
    const pub = defaultPublicationState([branchId, "cm9xbranch000000000000001"]);
    pub.branchPct[branchId] = 7;
    pub.branchPrice.set("p004", { [branchId]: 12000 });
    const off = new Set(["cm9xbranch000000000000001"]);
    pub.branchOff.set("p004", off);

    expect(collectBranchRulePayloads(pub)).toEqual([
      { branches: [{ branchId, adjustPercent: 7 }] },
    ]);
    expect(collectBranchPricePayloads(pub, "p004")).toEqual([
      { modelId: "p004", branches: [{ branchId, customPrice: 12000 }] },
    ]);
    expect(partnerProductsPublicationBody("p004", "cm9xbranch000000000000001", true).branches[0]?.branchId).toBe(
      "cm9xbranch000000000000001",
    );
  });
});