import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReceivingBulkActions } from "./ReceivingBulkActions";

const base = {
  visibleCount: 5,
  allVisibleSelected: false,
  someVisibleSelected: true,
  onSelectAll: vi.fn(),
  onAction: vi.fn(),
};

describe("P5 ReceivingBulkActions", () => {
  it("blocked state disables mass actions but shows contract hint", () => {
    render(<ReceivingBulkActions {...base} bucket="active" selectedCount={2} contractState="blocked" />);
    expect(screen.getByText(/BLK-RECEIVING-APPEALS/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Редактировать" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "В архив" })).toHaveProperty("disabled", true);
  });

  it("ready active bucket fires prototype actions", async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(
      <ReceivingBulkActions
        {...base}
        bucket="active"
        selectedCount={1}
        contractState="ready"
        onAction={onAction}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Удалить" }));
    expect(onAction).toHaveBeenCalledWith("delete-ask");
  });

  it("trash bucket shows restore primary", () => {
    render(<ReceivingBulkActions {...base} bucket="trash" selectedCount={1} contractState="blocked" />);
    expect(screen.getByRole("button", { name: /Восстановить/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Удалить" })).toBeNull();
  });

  it("shows partial error alert", () => {
    render(
      <ReceivingBulkActions
        {...base}
        bucket="archive"
        selectedCount={2}
        partialError="2 из 5 не обновлены"
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain("2 из 5");
  });
});
