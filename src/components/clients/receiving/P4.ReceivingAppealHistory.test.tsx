import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ReceivingAppealHistory,
  projectReceivingHistory,
  publicHistoryLine,
} from "./ReceivingAppealHistory";

describe("P4.ReceivingAppealHistory (K2 projection)", () => {
  const internal = { at: "2026-11-10T10:00:00Z", text: "Служебная заметка команды" };
  const stage = { at: "2026-11-11T10:00:00Z", text: "Этап изменён: В работе" };
  const paid = { at: "2026-11-12T10:00:00Z", text: "Оплачено · 120 000 ₽" };

  it("filters private lines for referrer-public (raw projection)", () => {
    expect(publicHistoryLine(stage)).toBe("Этап: В работе");
    const projected = projectReceivingHistory([internal, stage, paid], "referrer-public");
    expect(projected.map((r) => r.text)).toEqual(["Оплачено", "Этап: В работе"]);
  });

  it("redacts legacy return suffixes in raw referrer-public", () => {
    const projected = projectReceivingHistory(
      [{ at: "2026-11-13T16:00:00Z", text: "Возврат: PRIVATE_SENTINEL" }],
      "referrer-public",
    );
    expect(projected).toEqual([{ at: "2026-11-13T16:00:00Z", text: "Возврат" }]);
  });

  it("k2-referrer-public passes canonical timeline without raw re-parse", () => {
    const k2 = [
      { at: "2026-11-09T10:00:00Z", text: "Этап: В работе" },
      { at: "2026-11-10T10:00:00Z", text: "Отказ: Нет наличия" },
      { at: "2026-11-12T10:00:00Z", text: "Оплачено" },
    ];
    expect(projectReceivingHistory(k2, "k2-referrer-public").map((r) => r.text)).toEqual([
      "Оплачено",
      "Отказ: Нет наличия",
      "Этап: В работе",
    ]);
  });

  it("k2-referrer-public drops PRIVATE_SENTINEL lines", () => {
    expect(
      projectReceivingHistory(
        [{ at: "2026-11-13T16:00:00Z", text: "Возврат: PRIVATE_SENTINEL" }],
        "k2-referrer-public",
      ),
    ).toEqual([]);
  });

  it("renders empty public state", () => {
    render(
      <ReceivingAppealHistory
        entries={[internal]}
        projection="referrer-public"
        emptyLabel="Публичных событий пока нет."
      />,
    );
    expect(screen.getByText("Публичных событий пока нет.")).toBeTruthy();
  });
});
