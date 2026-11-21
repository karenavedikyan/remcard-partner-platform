import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReceivingBulkPartialOutcome } from "./ReceivingBulkPartialOutcome";

describe("ReceivingBulkPartialOutcome", () => {
  it("renders a list with one item per appeal line", () => {
    const message = "№ 2408 — обновлено\n№ 2401 — не обновлено: конфликт";
    render(<ReceivingBulkPartialOutcome message={message} testId="bulk-outcome" />);
    const list = screen.getByTestId("ca-bulk-outcome-list");
    expect(list.tagName).toBe("UL");
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("№ 2408 — обновлено");
    expect(items[1]).toHaveTextContent("№ 2401 — не обновлено: конфликт");
  });

  it("keeps a single-line message in a paragraph", () => {
    render(<ReceivingBulkPartialOutcome message="Обновлено: 1, пропущено: 1." />);
    expect(screen.queryByTestId("ca-bulk-outcome-list")).not.toBeInTheDocument();
    expect(screen.getByText("Обновлено: 1, пропущено: 1.")).toBeInTheDocument();
  });
});