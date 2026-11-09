import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScannerReferringPartnerBlock } from "./ScannerReferringPartnerBlock";

describe("ScannerReferringPartnerBlock", () => {
  it("renders type, name, city and public contact links", () => {
    render(
      <ScannerReferringPartnerBlock
        referringPartner={{
          partnerType: "MASTER",
          typeLabel: "Мастер",
          displayName: "Агент Публичный",
          city: "Краснодар",
          contacts: [
            {
              kind: "telegram",
              label: "Telegram",
              value: "@agent",
              href: "https://t.me/agent",
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("Клиент от партнёра")).toBeInTheDocument();
    expect(screen.getByText("Мастер")).toBeInTheDocument();
    expect(screen.getByText("Агент Публичный")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /telegram/i })).toHaveAttribute(
      "href",
      "https://t.me/agent",
    );
  });

  it("shows unavailable copy when partner absent (old backend or null)", () => {
    render(<ScannerReferringPartnerBlock referringPartner={undefined} />);
    expect(screen.getByTestId("scanner-referrer-unavailable")).toBeInTheDocument();
  });

  it("does not invent contacts when list empty", () => {
    render(
      <ScannerReferringPartnerBlock
        referringPartner={{
          partnerType: "STORE",
          typeLabel: "Магазин",
          displayName: "ООО «Двери»",
          city: null,
          contacts: [],
        }}
      />,
    );
    expect(screen.getByText(/публичные контакты не указаны/i)).toBeInTheDocument();
  });
});
