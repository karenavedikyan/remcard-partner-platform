import { describe, expect, it } from "vitest";
import { rowActionIcon } from "@/components/agent-r03/RowActionIcons";
import { partnershipActionIconId } from "./partnership-action-icons";

describe("partnership action icons", () => {
  it("maps partnership kinds to known SVG icons", () => {
    for (const kind of ["accept", "reject", "pause", "resume", "cancel", "details", "more"] as const) {
      const id = partnershipActionIconId(kind);
      expect(rowActionIcon(id)).not.toBeNull();
    }
  });
});
