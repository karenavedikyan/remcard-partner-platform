import { describe, expect, it } from "vitest";
import {
  adaptNavigatorCabinetModelDetail,
  fixtureNavigatorCabinetModelDetailSample,
} from "./navigator-model-detail";
import { optovikFixtureProducts } from "./fixtures";

describe("navigator cabinet model detail adapter", () => {
  const sample = fixtureNavigatorCabinetModelDetailSample();

  it("maps API variants into model skus for owner", () => {
    const model = adaptNavigatorCabinetModelDetail(sample, { manage: true });
    expect(model.id).toBe("p004");
    expect(model.cost).toBe(6520);
    expect(model.skus.length).toBe(2);
    expect(model.skus[0]?.price).toBe(11670);
    expect(model.skus[0]?.art).toBe("TN-MONA58-200080");
    expect(model.skus.every((s) => s.props.Цвет)).toBe(true);
  });

  it("strips owner economics for staff", () => {
    const model = adaptNavigatorCabinetModelDetail(sample, { manage: false });
    expect(model.cost).toBeNull();
    expect(model.skus.length).toBe(2);
  });

  it("does not read fixture skus when API variants are provided", () => {
    const fx = optovikFixtureProducts().find((p) => p.id === "p004");
    const model = adaptNavigatorCabinetModelDetail(sample, { manage: true });
    const fixtureSkuCount = fx ? optovikFixtureProducts().length : 0;
    void fixtureSkuCount;
    expect(model.skus.length).toBe(sample.variants.length);
    expect(model.skus[0]?.guid).toBe("var-p004-0");
  });
});