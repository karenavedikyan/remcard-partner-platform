import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CertificatePurchases } from "./CertificatePurchases";
import { CertificatePurchaseLink } from "./CertificatePurchaseLink";
import { AgentCertificateCard } from "./AgentCertificateCard";
import { AgentR03MobileCertRow } from "./AgentR03MobileCertRow";
import { cert, meta } from "../../../scripts/reward-lifecycle-qa/purchase-fixtures";
import { resetBodyScrollLockForTests } from "@/lib/dialog-focus";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn().mockResolvedValue({
    actorId: "qa",
    permissions: { recipient: true },
    reward: null,
  }),
}));

describe("certificate purchase disclosure", () => {
  it.each(["AGENT", "SPECIALIST", "STORE", "COMPANY"])(
    "%s links list/card/mobile to details, never selection or sharing",
    async (kind) => {
      const base = kind === "AGENT" ? "/certificates" : "/recommendations";
      const expected = `${base}/${cert.id}#certificate-purchases`;
      const props = {
        cert: meta,
        selected: false,
        onSelectChange: () => {},
        actions: [],
        detailBasePath: base,
      };
      render(
        <>
          <CertificatePurchaseLink cert={meta} detailBasePath={base} />
          <AgentCertificateCard {...props} archived={false} />
          <AgentR03MobileCertRow {...props} />
        </>,
      );
      const links = screen.getAllByRole("link", { name: "Есть покупки · Подробнее" });
      expect(links).toHaveLength(3);
      for (const link of links) expect(link).toHaveAttribute("href", expected);
      expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    },
  );

  it("lists purchases with receipt entry and full purchase links", async () => {
    resetBodyScrollLockForTests();
    render(
      <CertificatePurchases
        orders={cert.orders}
        hasPurchases
        promoCode={cert.promoCode}
        clientName="Синтетический клиент"
      />,
    );
    expect(screen.getByRole("heading", { name: "Покупки по сертификату (2)" })).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Начисление · Подробнее" })).toHaveLength(2);
    for (const [index, link] of screen
      .getAllByRole("link", { name: "Полная карточка покупки" })
      .entries()) {
      expect(link).toHaveAttribute(
        "href",
        `/history/purchases/${cert.orders![index].id}?promo=RC-QA-ONLY`,
      );
    }
    await userEvent.click(screen.getAllByRole("button", { name: "Начисление · Подробнее" })[0]!);
    expect(await screen.findByTestId("purchase-accrual-receipt-dialog")).toBeVisible();
  });

  it("distinguishes absent data, no purchases and usage-only mismatch", () => {
    const { rerender } = render(<CertificatePurchases hasPurchases promoCode="RC-QA" />);
    expect(screen.getByText(/Список покупок недоступен/)).toBeVisible();
    rerender(<CertificatePurchases orders={[]} hasPurchases={false} promoCode="RC-QA" />);
    expect(screen.getByText(/покупок пока нет/)).toBeVisible();
    rerender(<CertificatePurchases orders={[]} hasPurchases promoCode="RC-QA" />);
    expect(screen.getByText(/Подробности требуют сверки/)).toBeVisible();
  });

  it("does not offer a purchase badge link when no purchases exist", () => {
    render(<CertificatePurchaseLink cert={{ ...meta, hasOrders: false }} />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("keeps archived/inactive purchases accessible and suppresses self-scan reward preview", () => {
    render(
      <>
        <CertificatePurchaseLink cert={{ ...meta, status: "CANCELLED", archivedInWorkspace: true }} />
        <CertificatePurchases
          orders={[{ ...cert.orders![0], isSelfScan: true }]}
          hasPurchases
          promoCode="RC-QA"
        />
      </>,
    );
    expect(screen.getByRole("link", { name: /Подробнее/ })).toBeVisible();
    expect(screen.queryByText(/\+6\s?000/)).toBeNull();
  });
});
