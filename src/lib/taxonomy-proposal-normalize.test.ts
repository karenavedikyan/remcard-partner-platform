import { describe, expect, it } from "vitest";
import { normalizeTaxonomyProposalKey } from "./taxonomy-proposal-normalize";

describe("taxonomy-proposal-normalize", () => {
  it("normalizes like backend", () => {
    expect(normalizeTaxonomyProposalKey("  Ёлка   test ")).toBe("елка test");
  });
});
