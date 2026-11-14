import { describe, expect, it } from "vitest";
import { formatAppealHistoryTimelineText } from "./appeal-history-stage-text";

describe("P6.appeal history stage text", () => {
  it("maps exact Статус: sys_shipped to Russian label", () => {
    expect(formatAppealHistoryTimelineText("Статус: sys_shipped")).toBe("Статус: Отгружено");
  });

  it("uses neutral fallback for unknown ws_* in status line", () => {
    expect(formatAppealHistoryTimelineText("Статус: ws_draft_1")).toBe("Статус: Свой этап");
  });

  it("leaves unrelated history text unchanged", () => {
    expect(formatAppealHistoryTimelineText("Создано обращение по сертификату")).toBe(
      "Создано обращение по сертификату",
    );
  });
});