import { describe, expect, it } from "vitest";
import { filterStageOptionsForDirectPatch } from "./receiving-detail-actions-contract";

describe("P6.receiving detail direct stage patch filter", () => {
  it("excludes financial/system paid stage from direct patch dropdown", () => {
    const options = [
      { id: "ws_measure", label: "Замер" },
      { id: "sys_paid", label: "Оплачено" },
      { id: "sys_shipped", label: "Отгружено" },
    ];
    const filtered = filterStageOptionsForDirectPatch(options);
    expect(filtered.map((o) => o.id)).toEqual(["ws_measure", "sys_shipped"]);
    expect(filtered.some((o) => o.id === "sys_paid")).toBe(false);
  });
});