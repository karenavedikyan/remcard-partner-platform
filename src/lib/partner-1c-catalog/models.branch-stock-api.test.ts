import { describe, expect, it } from "vitest";
import { optovikFixtureProducts } from "./fixtures";
import { buildPartnerModels } from "./models";
import {
  adaptNavigatorCabinetModelDetail,
  fixtureNavigatorCabinetModelDetailShuffledBranches,
  fixtureNavigatorCabinetModelDetailWithApiBranches,
} from "./navigator-model-detail";
import { formatBranchStockLabel, branchStock, branchApiStockAt, usesBranchStockFromApi } from "./models";
import { defaultPublicationState, presentIn } from "./models";

describe("branch stock from navigator detail branches[]", () => {
  const pub = defaultPublicationState();

  it("KNOWN with quantity > 0 shows counted stock", () => {
    const dto = fixtureNavigatorCabinetModelDetailWithApiBranches("known");
    const model = adaptNavigatorCabinetModelDetail(dto, { manage: true });
    expect(usesBranchStockFromApi(model)).toBe(true);
    expect(branchStock(model, 0)).toBe(20);
    expect(formatBranchStockLabel(model, true, 0)).toBe("в наличии 20 шт");
  });

  it("ZERO shows out of stock", () => {
    const model = adaptNavigatorCabinetModelDetail(
      fixtureNavigatorCabinetModelDetailWithApiBranches("known"),
      { manage: true },
    );
    expect(branchStock(model, 2)).toBe(0);
    expect(formatBranchStockLabel(model, true, 2)).toBe("нет в наличии");
  });

  it("UNKNOWN shows «нет данных»", () => {
    const model = adaptNavigatorCabinetModelDetail(
      fixtureNavigatorCabinetModelDetailWithApiBranches("known"),
      { manage: true },
    );
    expect(formatBranchStockLabel(model, true, 3)).toBe("нет данных");
  });

  it("missing stock fields in API show «нет данных»", () => {
    const dto = fixtureNavigatorCabinetModelDetailWithApiBranches("known");
    dto.branches = dto.branches!.map((b) =>
      b.branchId.endsWith("-5")
        ? { ...b, stockKind: undefined, stockQuantity: undefined }
        : b,
    );
    const model = adaptNavigatorCabinetModelDetail(dto, { manage: true });
    expect(branchApiStockAt(model, 5)?.stockKind).toBeNull();
    expect(formatBranchStockLabel(model, true, 5)).toBe("нет данных");
  });

  it("excluded branch keeps «товар здесь не представлен»", () => {
    const model = adaptNavigatorCabinetModelDetail(
      fixtureNavigatorCabinetModelDetailWithApiBranches("known"),
      { manage: true },
    );
    expect(formatBranchStockLabel(model, true, 4)).toBe("товар здесь не представлен");
  });

  it("maps by branchId when API order differs from cabinet list", () => {
    const model = adaptNavigatorCabinetModelDetail(fixtureNavigatorCabinetModelDetailShuffledBranches(), {
      manage: true,
    });
    expect(branchStock(model, 0)).toBe(20);
    expect(branchStock(model, 5)).toBe(13);
    expect(formatBranchStockLabel(model, true, 5)).toBe("в наличии 13 шт");
  });

  it("does not derive branch numbers from fixture sku split", () => {
    const model = adaptNavigatorCabinetModelDetail(
      fixtureNavigatorCabinetModelDetailWithApiBranches("unknown"),
      { manage: true },
    );
    expect(formatBranchStockLabel(model, true, 0)).toBe("нет данных");
    expect(branchStock(model, 0)).toBeNull();
  });

  it("staff adapter keeps purchase hidden but retains branch stocks", () => {
    const model = adaptNavigatorCabinetModelDetail(
      fixtureNavigatorCabinetModelDetailWithApiBranches("known"),
      { manage: false },
    );
    expect(model.cost).toBeNull();
    expect(formatBranchStockLabel(model, true, 0)).toBe("в наличии 20 шт");
  });
});

describe("fixture-only branch stock", () => {
  it("still uses demo split without branchStocksFromApi", () => {
    const m = buildPartnerModels(optovikFixtureProducts()).find((x) => x.id === "p004")!;
    expect(usesBranchStockFromApi(m)).toBe(false);
    expect(branchStock(m, 0)).toBeGreaterThan(0);
  });
});

describe("Partner1cModelDetail labels with API stock", () => {
  it("off-branch uses excluded copy with publication toggle", () => {
    const model = adaptNavigatorCabinetModelDetail(
      fixtureNavigatorCabinetModelDetailWithApiBranches("known"),
      { manage: true },
    );
    let pub = defaultPublicationState();
    const off = new Set(pub.branchOff.get(model.id) ?? []);
    off.add(1);
    pub = { ...pub, branchOff: new Map([[model.id, off]]) };
    const here = presentIn(pub, model).includes(1);
    expect(here).toBe(false);
    expect(formatBranchStockLabel(model, here, 1)).toBe("товар здесь не представлен");
  });
});