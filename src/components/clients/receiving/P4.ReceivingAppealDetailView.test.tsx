import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReceivingAppealDetailView } from "./ReceivingAppealDetailView";

const appeal = {
  id: "DEMO-REQ-1001",
  clientName: "Анна К.",
  clientContact: "+7 900 000-00-00",
  interest: "Кухня",
  stageId: "sys_new",
  stageLabel: "Новое обращение",
  certificateId: "CERT-1",
  referrerPartnerName: "Партнёр А",
  sourceLabel: "По сертификату",
  originKind: "CERTIFICATE" as const,
  discountPercent: 10,
  certValidUntilDisplay: "15.04.2027",
  privateNotes: "Перезвонить",
  updatedAt: "2026-11-10T14:22:00Z",
};

const baseActions = {
  expectedRevision: 2,
  workingStages: [{ id: "ws_custom", label: "Согласование" }],
  refusalReasons: ["Дорого"],
  onSavePrivateNotes: vi.fn(),
  onApplyStage: vi.fn(),
  markPaid: { supported: false as const, reason: "Только через этап «Оплачено» (K1 stage PATCH)." },
};

describe("P4.ReceivingAppealDetailView", () => {
  it("renders missing and error with retry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(
      <ReceivingAppealDetailView status="missing" appealId="ghost" onBack={() => undefined} />,
    );
    expect(screen.getByTestId("ca-receiving-appeal-missing")).toBeTruthy();
    rerender(
      <ReceivingAppealDetailView
        status="error"
        message="BLK-RECEIVING-APPEALS"
        onRetry={onRetry}
        onBack={() => undefined}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Повторить" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows ready card, notes save and stage apply callbacks", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onStage = vi.fn();
    render(
      <ReceivingAppealDetailView
        status="ready"
        appeal={appeal}
        history={[
          { at: "2026-11-10T12:00:00Z", text: "Создано обращение по сертификату" },
        ]}
        actions={{
          ...baseActions,
          onSavePrivateNotes: onSave,
          onApplyStage: onStage,
        }}
        onBack={() => undefined}
      />,
    );
    expect(screen.getByTestId("ca-receiving-appeal-id")).toHaveTextContent(appeal.id);
    expect(screen.getByTestId("ca-receiving-cert-meta")).toBeTruthy();
    await user.clear(screen.getByTestId("ca-receiving-notes-input"));
    await user.type(screen.getByTestId("ca-receiving-notes-input"), "Новая заметка");
    await user.click(screen.getByTestId("ca-receiving-notes-save"));
    expect(onSave).toHaveBeenCalledWith("Новая заметка");
    await user.selectOptions(screen.getByTestId("ca-receiving-stage-select"), "ws_custom");
    await user.click(screen.getByTestId("ca-receiving-stage-apply"));
    expect(onStage).toHaveBeenCalledWith({ stageKey: "ws_custom", refusedReason: null });
    expect(screen.getByTestId("ca-receiving-purchase-unsupported")).toHaveTextContent("Оплачено");
  });

  it("readOnly hides notes and shows readonly hint", () => {
    render(
      <ReceivingAppealDetailView
        status="ready"
        appeal={appeal}
        history={[]}
        readOnly
        onBack={() => undefined}
      />,
    );
    expect(screen.getByTestId("ca-receiving-appeal-readonly")).toBeTruthy();
    expect(screen.queryByTestId("ca-receiving-detail-notes")).toBeNull();
    expect(screen.queryByTestId("ca-receiving-detail-stage")).toBeNull();
  });
});
