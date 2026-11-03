import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ScannerNewPartnerEmpty } from "./ScannerNewPartnerEmpty";

describe("ScannerNewPartnerEmpty", () => {
  it("renders prototype scanner copy without demo link", () => {
    render(<ScannerNewPartnerEmpty onOpenScanner={() => {}} />);
    expect(screen.getByTestId("empty-state")).toHaveAttribute("data-es-page", "scanner");
    expect(screen.getByText("Как это работает")).toBeInTheDocument();
    expect(screen.getByText("Проверка сертификата — 10 секунд")).toBeInTheDocument();
    expect(screen.getByText("Отсканируйте QR")).toBeInTheDocument();
    expect(screen.queryByText("Посмотреть на примере")).not.toBeInTheDocument();
  });

  it("CTA invokes open scanner handler", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<ScannerNewPartnerEmpty onOpenScanner={onOpen} />);
    await user.click(screen.getByTestId("es-action-scan"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
