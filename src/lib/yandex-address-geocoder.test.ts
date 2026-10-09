import { describe, expect, it } from "vitest";
import { buildBranchGeocodeQuery } from "@/lib/yandex-address-geocoder";

describe("buildBranchGeocodeQuery", () => {
  it("combines city and address", () => {
    expect(buildBranchGeocodeQuery("Краснодар", "ул. Красная, 1")).toBe(
      "Краснодар, ул. Красная, 1",
    );
  });
});
