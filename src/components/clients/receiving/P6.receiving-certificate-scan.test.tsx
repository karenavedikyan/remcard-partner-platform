import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReceivingCertificateScan } from "./ReceivingCertificateScan";

describe("P6.receiving certificate scan affordance", () => {
  it("disables submit until certificate-entry proxy is ready", () => {
    render(
      <ReceivingCertificateScan
        disabled
        persistBlockedMessage="Сканирование недоступно"
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Проверить и продолжить/i })).toBeDisabled();
  });

  it("extracts code from certificate URL before submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ReceivingCertificateScan onSubmit={onSubmit} />);
    await user.type(
      screen.getByTestId("ca-receiving-scan-code"),
      "https://remcard.ru/certificate/RC-FROM-URL",
    );
    await user.click(screen.getByRole("button", { name: /Проверить и продолжить/i }));
    expect(onSubmit).toHaveBeenCalledWith({ promoCode: "RC-FROM-URL" });
  });
});
