import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOrganizationUpsertBody,
  buildProfilePatchBody,
  displayNameMatchesSaved,
  organizationNameMatchesSaved,
} from "./onboarding-save.ts";

describe("onboarding-save", () => {
  it("buildProfilePatchBody omits displayName for STORE", () => {
    const body = buildProfilePatchBody({
      partnerType: "STORE",
      city: "Краснодар",
      displayName: "Магазин Тест",
      organizationName: "Магазин Тест",
      allStages: false,
      selectedStages: [],
      storeCategories: ["doors"],
    });
    assert.equal(body.city, "Краснодар");
    assert.equal(body.partnerType, "STORE");
    assert.deepEqual(body.storeCategories, ["doors"]);
    assert.equal("displayName" in body, false);
  });

  it("buildOrganizationUpsertBody keeps org name separate from profile PATCH", () => {
    const body = buildOrganizationUpsertBody({
      partnerType: "STORE",
      city: "Краснодар",
      displayName: "Иван",
      organizationName: "Магазин Тест",
      allStages: false,
      selectedStages: [],
      storeCategories: ["doors"],
    });
    assert.deepEqual(body, {
      name: "Магазин Тест",
      partnerType: "STORE",
      storeCategories: ["doors"],
    });
  });

  it("buildProfilePatchBody sends stage ids for MASTER", () => {
    const body = buildProfilePatchBody({
      partnerType: "MASTER",
      city: "Краснодар",
      displayName: "",
      organizationName: "",
      allStages: false,
      selectedStages: ["L1-0"],
      storeCategories: [],
    });
    assert.deepEqual(body.specializations, ["L1-0"]);
    assert.equal("displayName" in body, false);
  });

  it("displayNameMatchesSaved compares trimmed values", () => {
    assert.equal(displayNameMatchesSaved("  Shop  ", "Shop"), true);
    assert.equal(displayNameMatchesSaved("Shop A", "Shop B"), false);
  });

  it("organizationNameMatchesSaved compares trimmed values", () => {
    assert.equal(organizationNameMatchesSaved("  Org  ", "Org"), true);
    assert.equal(organizationNameMatchesSaved("A", "B"), false);
  });
});
