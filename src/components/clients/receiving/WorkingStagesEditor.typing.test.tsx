import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

function reasonInputs(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLInputElement>("input.reason-label"));
}

beforeEach(() => post.mockReset());

describe("WorkingStagesEditor — typing keeps focus", () => {
  it("a new reason accepts a whole phrase typed char by char", async () => {
    const user = userEvent.setup();
    const { container } = render(<WorkingStagesEditor settings={settings()} />);
    await user.click(screen.getByTestId("ca-settings-add-reason"));
    const rows = reasonInputs(container);
    expect(rows).toHaveLength(2);
    const input = rows[1]!;
    await user.click(input);
    await user.keyboard("Слишком дорого");
    const after = reasonInputs(container)[1]!;
    expect(after).toBe(input);
    expect(after).toHaveFocus();
    expect(after).toHaveValue("Слишком дорого");
    expect(post).not.toHaveBeenCalled();
  });

  it("renaming a saved reason keeps focus and sends the saved previous label on blur", async () => {
    const user = userEvent.setup();
    post.mockResolvedValue({ ok: true, snapshot: { settings: settings({ refusalReasons: ["Дорого и долго"] }), version: 2 } });
    const { container } = render(<WorkingStagesEditor settings={settings()} />);
    const input = reasonInputs(container)[0]!;
    await user.click(input);
    await user.keyboard(" и долго");
    expect(reasonInputs(container)[0]).toBe(input);
    expect(input).toHaveFocus();
    expect(input).toHaveValue("Дорого и долго");
    await user.tab();
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0]![0]).toMatchObject({
      kind: "renameRefusalReason",
      previousLabel: "Дорого",
      label: "Дорого и долго",
    });
  });

  it("removing a new unsaved row is local: no request; removing a saved row sends its saved name", async () => {
    const user = userEvent.setup();
    post.mockResolvedValue({ ok: true, snapshot: { settings: settings({ refusalReasons: [] }), version: 2 } });
    const { container } = render(<WorkingStagesEditor settings={settings()} />);
    await user.click(screen.getByTestId("ca-settings-add-reason"));
    expect(reasonInputs(container)).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Убрать причину: 2" }));
    expect(reasonInputs(container)).toHaveLength(1);
    expect(post).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Убрать причину: Дорого" }));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0]![0]).toMatchObject({ kind: "removeRefusalReason", label: "Дорого" });
  });

  it("blurring a new unsaved reason does not call the server (it is saved with «Сохранить»)", async () => {
    const user = userEvent.setup();
    const { container } = render(<WorkingStagesEditor settings={settings()} />);
    await user.click(screen.getByTestId("ca-settings-add-reason"));
    await user.click(reasonInputs(container)[1]!);
    await user.keyboard("Передумал");
    await user.tab();
    expect(post).not.toHaveBeenCalled();
    expect(reasonInputs(container)[1]).toHaveValue("Передумал");
  });

  it("a new stage keeps focus while typing (stable id key)", async () => {
    const user = userEvent.setup();
    const { container } = render(<WorkingStagesEditor settings={settings()} />);
    await user.click(screen.getByTestId("ca-settings-add-stage"));
    const stages = Array.from(container.querySelectorAll<HTMLInputElement>("input.stage-label"));
    expect(stages).toHaveLength(2);
    const input = stages[1]!;
    await user.click(input);
    await user.keyboard("Подбор материалов");
    const after = Array.from(container.querySelectorAll<HTMLInputElement>("input.stage-label"))[1]!;
    expect(after).toBe(input);
    expect(after).toHaveFocus();
    expect(after).toHaveValue("Подбор материалов");
  });

  it("an existing stage keeps focus while typing", async () => {
    const user = userEvent.setup();
    const { container } = render(<WorkingStagesEditor settings={settings()} />);
    const input = container.querySelector<HTMLInputElement>("input.stage-label")!;
    await user.click(input);
    await user.keyboard(" 2");
    expect(container.querySelector("input.stage-label")).toBe(input);
    expect(input).toHaveFocus();
    expect(input).toHaveValue("Замер 2");
  });
});
