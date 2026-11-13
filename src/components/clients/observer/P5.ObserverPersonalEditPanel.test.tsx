import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObserverPersonalEditPanel } from "./ObserverPersonalEditPanel";

describe("P5 ObserverPersonalEditPanel", () => {
  it("single mode shows alias/tag/note and save stays disabled", async () => {
    const onAttemptSave = vi.fn();
    render(
      <ObserverPersonalEditPanel
        mode="single"
        count={1}
        initial={{ alias: "Имя", tag: "метка", note: "заметка" }}
        onCancel={vi.fn()}
        onAttemptSave={onAttemptSave}
      />,
    );
    expect(screen.getByLabelText("Имя для себя")).toBeTruthy();
    const save = screen.getByRole("button", { name: /Сохранить \(недоступно\)/ });
    expect(save).toHaveProperty("disabled", true);
    expect(save.getAttribute("title")).toBe("BLOCKED_PERSISTENCE");

    const user = userEvent.setup();
    await user.click(save);
    expect(onAttemptSave).not.toHaveBeenCalled();
  });

  it("bulk mode omits alias/note fields", () => {
    render(
      <ObserverPersonalEditPanel
        mode="bulk"
        count={4}
        onCancel={vi.fn()}
        onAttemptSave={vi.fn()}
      />,
    );
    expect(screen.getByText(/Метка для 4 записей/)).toBeTruthy();
    expect(screen.queryByLabelText("Имя для себя")).toBeNull();
    expect(screen.queryByLabelText("Личная заметка")).toBeNull();
    expect(screen.getByLabelText("Общая метка")).toBeTruthy();
  });

  it("cancel calls handler without submit", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ObserverPersonalEditPanel
        mode="single"
        count={1}
        onCancel={onCancel}
        onAttemptSave={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText("Имя для себя"), "Черновик");
    await user.click(screen.getByRole("button", { name: "Отмена" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("resets draft when initial changes (reopen)", () => {
    const { rerender } = render(
      <ObserverPersonalEditPanel
        mode="single"
        count={1}
        initial={{ alias: "", tag: "", note: "" }}
        onCancel={vi.fn()}
        onAttemptSave={vi.fn()}
      />,
    );
    const alias = screen.getByLabelText("Имя для себя") as HTMLInputElement;
    expect(alias.value).toBe("");

    rerender(
      <ObserverPersonalEditPanel
        mode="single"
        count={1}
        initial={{ alias: "Свежее", tag: "t", note: "n" }}
        onCancel={vi.fn()}
        onAttemptSave={vi.fn()}
      />,
    );
    expect((screen.getByLabelText("Имя для себя") as HTMLInputElement).value).toBe("Свежее");
  });

  it("ready mode submits trimmed draft via onSave", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <ObserverPersonalEditPanel
        mode="single"
        count={1}
        persistenceStatus="ready"
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );
    await user.type(screen.getByLabelText("Имя для себя"), "  Алиас  ");
    await user.click(screen.getByRole("button", { name: "Сохранить для себя" }));
    expect(onSave).toHaveBeenCalledWith({ alias: "Алиас", tag: "", note: "" });
  });
});
