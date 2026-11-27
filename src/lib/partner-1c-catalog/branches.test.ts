import { describe, expect, it } from "vitest";
import {
  branchesForModelPanel,
  catalogBranchesFromNavigator,
  catalogBranchFromNavigator,
} from "./branches";
import meta3 from "./fixtures/cabinet-meta-branches-real.json";
import realDetail3 from "./fixtures/cabinet-model-detail-real-3branches.json";
import meta10 from "./fixtures/cabinet-meta-branches-real-10.json";
import type { NavigatorCabinetModelDetail } from "./navigator-types";
import { defaultPublicationState, rulePrice, branchPrice } from "./models";
import { buildPartnerModels } from "./models";
import { optovikFixtureProducts } from "./fixtures";

describe("catalog branches", () => {
  it("keeps meta order for panel", () => {
    const catalog = catalogBranchesFromNavigator(meta3);
    const dto = realDetail3 as NavigatorCabinetModelDetail;
    const panel = branchesForModelPanel(catalog, dto.branches);
    expect(panel.map((b) => b.id)).toEqual(meta3.map((b) => b.id));
  });

  it("appends detail-only branch after meta list", () => {
    const catalog = catalogBranchesFromNavigator(meta3);
    const onlyDetail = {
      branchId: "cm9xbranch000000000000099",
      name: "Туапсе · ул. Мира, 1",
      city: "Туапсе",
      address: "ул. Мира, 1",
      excluded: false,
      adjustPercent: 0,
      rulePrice: 1,
      customPrice: null,
      effectivePrice: 1,
      stockKind: "KNOWN",
      stockQuantity: 2,
    };
    const panel = branchesForModelPanel(catalog, [...(realDetail3 as NavigatorCabinetModelDetail).branches, onlyDetail]);
    expect(panel.at(-1)?.id).toBe(onlyDetail.branchId);
    expect(panel.length).toBe(4);
  });

  it("meta-only branch without detail stock uses rule price without crash", () => {
    const catalog = catalogBranchesFromNavigator(meta3);
    const m = buildPartnerModels(optovikFixtureProducts()).find((x) => x.id === "p004")!;
    const pub = defaultPublicationState(catalog.map((b) => b.id));
    const onlyMeta = catalog[0]!.id;
    expect(branchPrice(pub, m, onlyMeta)).toBe(rulePrice(pub, m, onlyMeta));
    expect(branchPrice(pub, m, onlyMeta)).toBe(m.price);
  });

  it("supports 0 and 1 branch organizations", () => {
    expect(catalogBranchesFromNavigator([])).toEqual([]);
    const one = catalogBranchFromNavigator(meta3[0]!);
    expect(catalogBranchesFromNavigator([meta3[0]!]).length).toBe(1);
    expect(one.id).toBe("cm9xbranch000000000000001");
  });

  it("supports 10 branches from API meta", () => {
    expect(catalogBranchesFromNavigator(meta10).length).toBe(10);
  });
});