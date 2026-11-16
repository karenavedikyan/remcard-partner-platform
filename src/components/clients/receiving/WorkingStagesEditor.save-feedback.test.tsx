import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();

vi.mock("@/lib/clients-parity/receiving-appeals-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/clients-parity/receiving-appeals-api")>();
  return {
    ...actual,
    isReceivingWorkingStagesPostReady: () => true,
    postReceivingWorkingStagesMutation: (...args: unknown[]) => post(...args),
  };
});

import { WorkingStagesEditor } from "./WorkingStagesEditor";

function settings(over: Record<string, unknown> = {}) {
  return {
    receivingPartnerUserId: "me",
    workingStages: [{ id: "ws_measure", label: "Замер" }],
    refusalReasons: ["Дорого"],
    archivedStages: [],
    manualChannels: [],
    version: 1,
    ...over,
  } as never;
}

function editFirstStage() {
  fireEvent.change(screen.getByLabelText("Этап 1"), { target: { value: "Замер на объекте" } });
}

beforeEach(() => {
  vi.useFakeTimers();
  post.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("WorkingStagesEditor — save feedback", () => {
  it("without changes «Сохранить» and «Отменить изменения» are disabled; any change enables them", () => {
    render(<WorkingStagesEditor settings={settings()} />);
    expect(screen.getByTestId("ca-settings-save")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Отменить изменения" })).toBeDisabled();
    editFirstStage();
    expect(screen.getByTestId("ca-settings-save")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Отменить изменения" })).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Этап 1"), { target: { value: "Замер" } });
    expect(screen.getByTestId("ca-settings-save")).toBeDisabled();
  });

  it("shows «Сохранение…» while pending, then a green «Сохранено» with a check for 2 s, then «Сохранить»", async () => {
    let resolve!: (v: unknown) => void;
    post.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<WorkingStagesEditor settings={settings()} />);
    editFirstStage();
    const save = screen.getByTestId("ca-settings-save");
    fireEvent.click(save);
    expect(save).toHaveTextContent("Сохранение…");
    expect(save).toBeDisabled();
    expect(save).not.toHaveClass("is-saved");

    await act(async () => {
      resolve({
        ok: true,
        snapshot: { settings: settings({ workingStages: [{ id: "ws_measure", label: "Замер на объекте" }] }), version: 2 },
      });
    });
    expect(save).toHaveTextContent("Сохранено");
    expect(save).toHaveClass("is-saved");
    expect(screen.getByTestId("ca-settings-saved-icon")).toBeInTheDocument();
    expect(screen.getByTestId("ca-settings-save-status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByTestId("ca-settings-save-status")).toHaveTextContent("Настройки сохранены");
    expect(screen.getByLabelText("Этап 1")).toHaveValue("Замер на объекте");

    act(() => void vi.advanceTimersByTime(1900));
    expect(save).toHaveTextContent("Сохранено");
    act(() => void vi.advanceTimersByTime(150));
    expect(save).toHaveTextContent("Сохранить");
    expect(save).not.toHaveTextContent("Сохранено");
    expect(save).not.toHaveClass("is-saved");
    expect(screen.queryByTestId("ca-settings-saved-icon")).toBeNull();
    expect(screen.getByTestId("ca-settings-save-status")).toHaveTextContent("");
    expect(screen.getByTestId("ca-receiving-working-stages-editor")).toBeInTheDocument();
  });

  it("on a server error there is no «Сохранено», the button stays «Сохранить» and an alert is shown", async () => {
    post.mockResolvedValue({ ok: false, code: "SERVER", message: "Не удалось сохранить настройки." });
    render(<WorkingStagesEditor settings={settings()} />);
    editFirstStage();
    const save = screen.getByTestId("ca-settings-save");
    await act(async () => void fireEvent.click(save));
    expect(screen.queryByText("Сохранено")).toBeNull();
    expect(screen.queryByTestId("ca-settings-saved-icon")).toBeNull();
    expect(save).toHaveTextContent("Сохранить");
    expect(save).toBeEnabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось сохранить настройки.");
    act(() => void vi.advanceTimersByTime(3000));
    expect(save).toHaveTextContent("Сохранить");
  });

  it("editing during the success state returns the button to «Сохранить»", async () => {
    post.mockResolvedValue({
      ok: true,
      snapshot: { settings: settings({ workingStages: [{ id: "ws_measure", label: "Замер на объекте" }] }), version: 2 },
    });
    render(<WorkingStagesEditor settings={settings()} />);
    editFirstStage();
    await act(async () => void fireEvent.click(screen.getByTestId("ca-settings-save")));
    expect(screen.getByTestId("ca-settings-save")).toHaveTextContent("Сохранено");
    fireEvent.change(screen.getByLabelText("Этап 1"), { target: { value: "Другое" } });
    expect(screen.getByTestId("ca-settings-save")).toHaveTextContent("Сохранить");
    expect(screen.getByTestId("ca-settings-save")).toBeEnabled();
  });
});
