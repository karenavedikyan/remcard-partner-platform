import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReceivingAppealDetailView } from "./ReceivingAppealDetailView";

const appeal = {
  id: "DEMO-REQ-1001",
  clientName: "Анна К.",
  clientContact: "+7 900 000-00-00",
  interest: "Кухня",
  stageId: "new",
  stageLabel: "Новое обращение",
  certificateId: "CERT-1",
  referrerPartnerName: "Партнёр А",
  sourceLabel: "Сертификат",
  updatedAt: "2026-11-10T14:22:00Z",
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

  it("shows ready card and full history", () => {
    render(
      <ReceivingAppealDetailView
        status="ready"
        appeal={appeal}
        history={[
          { at: "2026-11-10T12:00:00Z", text: "Создано обращение по сертификату" },
          { at: "2026-11-11T12:00:00Z", text: "Служебная заметка", author: "staff" },
        ]}
        onBack={() => undefined}
      />,
    );
    expect(screen.getByTestId("ca-receiving-appeal-id")).toHaveTextContent(appeal.id);
    expect(screen.getByText("Служебная заметка")).toBeTruthy();
  });

  it("readOnly flags observer-safe mode", () => {
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
  });
});
