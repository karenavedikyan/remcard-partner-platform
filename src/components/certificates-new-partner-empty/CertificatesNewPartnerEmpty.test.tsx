import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CertificatesNewPartnerEmpty } from "./CertificatesNewPartnerEmpty";
import { shouldShowCertificatesNewPartnerEmpty } from "./shouldShowCertificatesNewPartnerEmpty";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("shouldShowCertificatesNewPartnerEmpty", () => {
  const base = {
    loadState: "loaded" as const,
    error: "",
    itemsLength: 0,
    knownListCounts: { activeCount: 0, archivedCount: 0, totalCount: 0 } as const,
    archived: false,
    filtersActive: false,
  };

  it("shows only for loaded zero workspace without filters", () => {
    expect(shouldShowCertificatesNewPartnerEmpty(base)).toBe(true);
  });

  it("rejects loading, errors, archive tab, filters, and unknown totals", () => {
    expect(shouldShowCertificatesNewPartnerEmpty({ ...base, loadState: "loading" })).toBe(false);
    expect(shouldShowCertificatesNewPartnerEmpty({ ...base, error: "network" })).toBe(false);
    expect(shouldShowCertificatesNewPartnerEmpty({ ...base, archived: true })).toBe(false);
    expect(shouldShowCertificatesNewPartnerEmpty({ ...base, filtersActive: true })).toBe(false);
    expect(shouldShowCertificatesNewPartnerEmpty({ ...base, knownListCounts: null })).toBe(false);
    expect(shouldShowCertificatesNewPartnerEmpty({ ...base, itemsLength: 1 })).toBe(false);
  });
});

describe("CertificatesNewPartnerEmpty", () => {
  it("renders agent copy with create link and partners link", () => {
    render(<CertificatesNewPartnerEmpty role="agent" createHref="/certificates/new" />);
    expect(screen.getByTestId("empty-state")).toHaveAttribute("data-es-page", "certificates");
    expect(screen.getByRole("heading", { name: "Первый сертификат — за минуту" })).toBeVisible();
    expect(screen.getByTestId("es-создать-сертификат")).toHaveAttribute("href", "/certificates/new");
    expect(screen.getByTestId("es-найти-партнёра")).toHaveAttribute("href", "/partners");
    expect(screen.queryByText("Посмотреть на примере")).not.toBeInTheDocument();
  });

  it("store seller copy uses scanner link and create button", () => {
    render(<CertificatesNewPartnerEmpty role="store" onCreateCertificate={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Сертификаты ваших клиентов" })).toBeVisible();
    expect(screen.getByTestId("es-проверить-сертификат")).toHaveAttribute("href", "/scanner");
    expect(screen.getByTestId("es-создать-сертификат").tagName).toBe("BUTTON");
  });

  it("create callback on click", async () => {
    const onCreate = vi.fn();
    const user = userEvent.setup();
    render(<CertificatesNewPartnerEmpty role="specialist" onCreateCertificate={onCreate} />);
    await user.click(screen.getByTestId("es-создать-сертификат"));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
