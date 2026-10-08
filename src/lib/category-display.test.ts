import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canonicalCategoryLabel,
  displayCategoryLabel,
  displayCategoryLabelFromStored,
  UNKNOWN_CATEGORY_DISPLAY_LABEL,
} from "./category-display.ts";
import { STORE_CATEGORY_CHIP_KEYS, STORE_CATEGORY_LABELS } from "./store-categories.ts";

describe("category display resolver", () => {
  it("maps store chips to Russian labels", () => {
    assert.equal(canonicalCategoryLabel("doors"), "Двери");
    assert.equal(canonicalCategoryLabel("flooring"), "Напольные покрытия");
    assert.equal(canonicalCategoryLabel("handles"), "Фурнитура и замки");
  });

  it("covers every STORE_CATEGORY_CHIP_KEYS entry", () => {
    for (const key of STORE_CATEGORY_CHIP_KEYS) {
      const label = canonicalCategoryLabel(key);
      assert.notEqual(label, key);
      assert.equal(label, STORE_CATEGORY_LABELS[key]);
      assert.match(label, /[а-яА-ЯёЁ]/);
    }
  });

  it("keeps general partnership label", () => {
    assert.equal(canonicalCategoryLabel("general"), "Общие условия");
    assert.equal(displayCategoryLabel("general", "general"), "Общие условия");
  });

  it("prefers canonical Russian when API label equals raw key", () => {
    assert.equal(displayCategoryLabel("flooring", "flooring"), "Напольные покрытия");
    assert.equal(displayCategoryLabel("doors", "doors"), "Двери");
  });

  it("preserves substantive saved Russian labels", () => {
    assert.equal(displayCategoryLabel("doors", "Двери и комплектующие"), "Двери и комплектующие");
  });

  it("does not expose unknown tech codes", () => {
    assert.equal(canonicalCategoryLabel("unknown_xyz"), UNKNOWN_CATEGORY_DISPLAY_LABEL);
    assert.equal(displayCategoryLabel("unknown_xyz", "unknown_xyz"), UNKNOWN_CATEGORY_DISPLAY_LABEL);
    assert.equal(displayCategoryLabelFromStored("flooring"), "Напольные покрытия");
  });

  it("resolves legacy all alias to general label", () => {
    assert.equal(canonicalCategoryLabel("all"), "Общие условия");
  });
});
