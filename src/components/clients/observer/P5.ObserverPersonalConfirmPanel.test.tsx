import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObserverPersonalConfirmPanel } from "./ObserverPersonalConfirmPanel";

describe("P5 ObserverPersonalConfirmPanel", () => {
  it.each([
    ["archived", "Перенести в архив?", "В архив (недоступно)"],
    ["trash", "Удалить только из своего списка?", "Удалить у себя (недоступно)"],
    ["restore", "Восстановить в активный список?", "Восстановить (недоступно)"],
  ] as const)("kind %s blocked copy", (kind, title, confirmLabel) => {
    render(
      <ObserverPersonalConfirmPanel kind={kind} count={2} onCancel={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    expect(screen.getByText(/Выбрано записей: 2/)).toBeTruthy();
    const confirm = screen.getByRole("button", { name: confirmLabel });
    expect(confirm).toHaveProperty("disabled", true);
    expect(confirm.getAttribute("title")).toBe("BLOCKED_PERSISTENCE");
    expect(screen.getByText(/personal-meta/)).toBeTruthy();
  });

  it("blocked confirm does not call onConfirm", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ObserverPersonalConfirmPanel kind="trash" count={1} onCancel={vi.fn()} onConfirm={onConfirm} />,
    );
    await user.click(screen.getByRole("button", { name: "Удалить у себя (недоступно)" }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("ready confirm invokes onConfirm", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ObserverPersonalConfirmPanel
        kind="archived"
        count={3}
        persistenceStatus="ready"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    await user.click(screen.getByRole("button", { name: "В архив" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("shows partial error when provided", () => {
    render(
      <ObserverPersonalConfirmPanel
        kind="restore"
        count={2}
        persistenceStatus="error"
        partialError="Не удалось: 1 из 2 (server)"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain("1 из 2");
  });
});
