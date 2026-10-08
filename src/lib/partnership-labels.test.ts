import { describe, expect, it } from "vitest";
import { CATALOG_STATUS_LABELS, catalogStatusTone } from "./partnership-labels";

describe("CATALOG_STATUS_LABELS", () => {
  it("includes NEEDS_REVISION with partner-facing copy", () => {
    expect(CATALOG_STATUS_LABELS.NEEDS_REVISION).toMatch(/исправить/i);
    expect(catalogStatusTone("NEEDS_REVISION")).toBe("pending");
  });
});
