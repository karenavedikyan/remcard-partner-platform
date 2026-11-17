import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReceivingAppealScannerBanner } from "./ReceivingAppealScannerPanels";

type Ready = Extract<
  Parameters<typeof ReceivingAppealScannerBanner>[0]["context"],
  { status: "ready" }
>;

function ready(overrides: Partial<Ready>): Ready {
  return {
    status: "ready",
    appealId: "appeal-1",
    clientLabel: "Иван",
    certificateId: null,
    purchaseOrderId: null,
    orderAlreadyLinked: false,
    ...overrides,
  } as Ready;
}

describe("B5: scanner banner does not leak technical order ids", () => {
  it("shows a plain linked-order sentence and a «Открыть покупку» link, never the raw id", () => {
    const { container } = render(
      <ReceivingAppealScannerBanner
        appealId="appeal-1"
        context={ready({ purchaseOrderId: "cmwju2vprx0001abcd", orderAlreadyLinked: true })}
      />,
    );
    expect(container.textContent).not.toContain("cmwju2vpr");
    expect(container.textContent).not.toContain("Заказ уже привязан");
    const link = screen.getByRole("link", { name: "Открыть покупку" });
    expect(link.getAttribute("href")).toContain("cmwju2vprx0001abcd");
  });

  it("shows no order line at all when nothing is linked", () => {
    render(<ReceivingAppealScannerBanner appealId="appeal-1" context={ready({})} />);
    expect(screen.queryByRole("link", { name: "Открыть покупку" })).not.toBeInTheDocument();
  });
});
