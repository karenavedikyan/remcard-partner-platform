import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReceivingBulkEditPanel } from "./ReceivingBulkEditPanel";
import { ReceivingBulkConfirmPanel } from "./ReceivingBulkConfirmPanel";
import { buildReceivingBulkPatchIntents, aggregateReceivingPatchResults } from "./receiving-bulk-handoff";

describe("P5 receiving bulk panels + PATCH intents (prototype)", () => {
  it("edit panel blocked; intents per-id for P6 PATCH transport", async () => {
    render(
      <ReceivingBulkEditPanel
        count={2}
        stageOptions={[{ id: "ws_measure", label: "Замер" }]}
        stageBlocked={false}
        contractState="ready"
        onCancel={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: /Групповое изменение/ })).toBeTruthy();

    const { intents, validationError } = buildReceivingBulkPatchIntents(
      ["a1", "a2"],
      { stageId: "ws_measure", serviceNote: "н", appendNote: true },
      { stageBlocked: false, revisions: { a1: 3 } },
    );
    expect(validationError).toBeUndefined();
    expect(intents[0]).toEqual({
      appealId: "a1",
      body: { expectedRevision: 3, stageId: "ws_measure", serviceNote: "н", serviceNoteAppend: true },
    });

    const partial = aggregateReceivingPatchResults([
      { appealId: "a1", ok: true },
      { appealId: "a2", ok: false, reason: "stage_locked" },
    ]);
    expect(partial.ok && partial.kind === "partial").toBe(true);

    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole("combobox"), "ws_measure");
    const onApply = vi.fn();
    render(
      <ReceivingBulkConfirmPanel
        kind="archive"
        count={2}
        contractState="ready"
        onCancel={vi.fn()}
        onConfirm={onApply}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    expect(onApply).toHaveBeenCalled();
  });
});
