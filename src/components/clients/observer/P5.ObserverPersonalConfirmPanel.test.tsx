import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObserverPersonalConfirmPanel } from "./ObserverPersonalConfirmPanel";

describe("P5 ObserverPersonalConfirmPanel", () => {
  it.each([
    ["archived", "Перенести в архив?", "В архив"],
    ["trash", "Удалить только из своего списка?", "Удалить у себя"],
    ["restore", "Восстановить в активный список?", "Восстановить"],
  ] as const)("kind %s shows copy and count", (kind, title, confirmLabel) => {
    render(
      <ObserverPersonalConfirmPanel kind={kind} count={2} onCancel={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    expect(screen.getByText(/Выбрано записей: 2/)).toBeTruthy();
    expect(screen.getByRole("button", { name: confirmLabel })).toBeTruthy();
    expect(screen.getByText(/BLOCKED_PERSISTENCE/)).toBeTruthy();
  });

  it("confirm and cancel invoke callbacks without implying persistence", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ObserverPersonalConfirmPanel kind="trash" count={1} onCancel={onCancel} onConfirm={onConfirm} />,
    );
    const confirm = screen.getByRole("button", { name: "Удалить у себя" });
    expect(confirm.getAttribute("title")).toBe("BLOCKED_PERSISTENCE");
    await user.click(confirm);
    await user.click(screen.getByRole("button", { name: "Отмена" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
