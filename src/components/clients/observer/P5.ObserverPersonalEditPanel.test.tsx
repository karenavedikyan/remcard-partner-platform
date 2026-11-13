import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObserverPersonalEditPanel } from "./ObserverPersonalEditPanel";
import { buildObserverEditTargetKey } from "./observer-personal-edit-target";

const target = buildObserverEditTargetKey("single", ["appeal-1"]);

describe("P5 ObserverPersonalEditPanel", () => {
  it("single mode shows alias/tag/note and save stays disabled", async () => {
    const onAttemptSave = vi.fn();
    render(
      <ObserverPersonalEditPanel
        editTargetKey={target}
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
        editTargetKey={buildObserverEditTargetKey("bulk", ["a", "b"])}
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
        editTargetKey={target}
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

  it("reinitializes on draftSeed bump (reopen)", () => {
    const { rerender } = render(
      <ObserverPersonalEditPanel
        editTargetKey={target}
        mode="single"
        count={1}
        draftSeed={0}
        initial={{ alias: "", tag: "", note: "" }}
        onCancel={vi.fn()}
        onAttemptSave={vi.fn()}
      />,
    );
    rerender(
      <ObserverPersonalEditPanel
        editTargetKey={target}
        mode="single"
        count={1}
        draftSeed={1}
        initial={{ alias: "Свежее", tag: "t", note: "n" }}
        onCancel={vi.fn()}
        onAttemptSave={vi.fn()}
      />,
    );
    expect((screen.getByLabelText("Имя для себя") as HTMLInputElement).value).toBe("Свежее");
  });

  it("preserves user draft when initial changes under same target during error", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ObserverPersonalEditPanel
        editTargetKey={target}
        mode="single"
        count={1}
        draftSeed={0}
        persistenceStatus="error"
        saveError="409"
        onCancel={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText("Имя для себя"), "Удержанный черновик");

    rerender(
      <ObserverPersonalEditPanel
        editTargetKey={target}
        mode="single"
        count={1}
        draftSeed={0}
        persistenceStatus="error"
        initial={{ alias: "С сервера", tag: "", note: "" }}
        saveError="409"
        onCancel={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect((screen.getByLabelText("Имя для себя") as HTMLInputElement).value).toBe("Удержанный черновик");
  });

  it("error retry emits onSave once with same draft", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <ObserverPersonalEditPanel
        editTargetKey={target}
        mode="single"
        count={1}
        persistenceStatus="error"
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );
    await user.type(screen.getByLabelText("Имя для себя"), "Повтор");
    await user.click(screen.getByRole("button", { name: "Повторить сохранение" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ alias: "Повтор", tag: "", note: "" });
  });

  it("pending never calls onSave; target switch reinitializes without save", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <ObserverPersonalEditPanel
        editTargetKey={target}
        mode="single"
        count={1}
        persistenceStatus="pending"
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );
    await user.type(screen.getByLabelText("Имя для себя"), "Во время запроса");
    const save = screen.getByRole("button", { name: "Сохранение…" });
    expect(save).toHaveProperty("disabled", true);
    await user.click(save);
    expect(onSave).not.toHaveBeenCalled();

    rerender(
      <ObserverPersonalEditPanel
        editTargetKey={buildObserverEditTargetKey("single", ["appeal-2"])}
        mode="single"
        count={1}
        draftSeed={0}
        persistenceStatus="pending"
        initial={{ alias: "Другой", tag: "", note: "" }}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );
    expect((screen.getByLabelText("Имя для себя") as HTMLInputElement).value).toBe("Другой");
    await user.click(screen.getByRole("button", { name: "Сохранение…" }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("ready mode submits trimmed draft via onSave", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <ObserverPersonalEditPanel
        editTargetKey={target}
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
