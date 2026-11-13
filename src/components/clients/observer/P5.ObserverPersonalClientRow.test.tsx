import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObserverPersonalClientRow } from "./ObserverPersonalClientRow";
import { P5_APPEAL, P5_META } from "../../../../audit/remcard-parallel-20261113/P5/fixtures";

describe("P5 ObserverPersonalClientRow", () => {
  it("select toggles and displays alias/tag/note", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <ObserverPersonalClientRow
        appeal={P5_APPEAL}
        meta={P5_META}
        selected={false}
        onSelect={onSelect}
        onEdit={vi.fn()}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText("Для меня")).toBeTruthy();
    expect(screen.getByText("важно")).toBeTruthy();
    expect(screen.getByText("Перезвонить")).toBeTruthy();
    const row = screen.getByTestId("ca-observer-client-row");
    expect(row.getAttribute("data-selected")).toBe("false");
    await user.click(screen.getByRole("checkbox", { name: /Выбрать: Для меня/ }));
    expect(onSelect).toHaveBeenCalledWith(true);
  });

  it("hides edit when showEdit is false", () => {
    render(
      <ObserverPersonalClientRow
        appeal={P5_APPEAL}
        selected={false}
        onSelect={vi.fn()}
        showEdit={false}
      />,
    );
    expect(screen.queryByRole("button", { name: "Изменить" })).toBeNull();
  });

  it("grouped layout uses alternate edit label and status labels", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(
      <ObserverPersonalClientRow
        appeal={P5_APPEAL}
        meta={P5_META}
        selected
        grouped
        onSelect={vi.fn()}
        onEdit={onEdit}
      />,
    );
    expect(screen.getByText("Статус у партнёра")).toBeTruthy();
    expect(screen.getByText(/Моя метка: важно/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Изменить для себя" }));
    expect(onEdit).toHaveBeenCalled();
  });
});
