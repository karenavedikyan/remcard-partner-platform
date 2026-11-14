import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReceivingAppealDetailView } from "./ReceivingAppealDetailView";

describe("P6.receiving purchase gross label", () => {
  it("labels paidAmountKopecks display as purchase before discount", () => {
    render(
      <ReceivingAppealDetailView
        status="ready"
        appeal={{
          id: "a1",
          clientName: "Клиент",
          interest: "Двери",
          stageId: "sys_paid",
          stageLabel: "Оплачено",
          certificateId: "CERT",
          updatedAt: "2026-01-01T00:00:00Z",
          receivingPartnerUserId: "u1",
          paidDisplayLabel: "1 000 ₽",
          paidAtDisplay: "01.01.2026, 12:00",
        }}
        history={[]}
        onBack={() => {}}
      />,
    );
    expect(screen.getByText("Сумма покупки до скидки")).toBeTruthy();
    expect(screen.queryByText("Оплата клиентом")).toBeNull();
    expect(screen.getByTestId("ca-receiving-purchase-paid").textContent).toContain("1 000 ₽");
  });
});