import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CertificatePurchases } from "./CertificatePurchases";
import { CertificatePurchaseLink } from "./CertificatePurchaseLink";
import { AgentCertificateCard } from "./AgentCertificateCard";
import { AgentR03MobileCertRow } from "./AgentR03MobileCertRow";
import { cert, meta } from "../../../scripts/reward-lifecycle-qa/purchase-fixtures";

describe("certificate purchase disclosure", () => {
  it.each(["AGENT", "SPECIALIST", "STORE", "COMPANY"])("%s links list/card/mobile to details, never selection or sharing", async kind => {
    const base = kind === "AGENT" ? "/certificates" : "/recommendations";
    const expected = `${base}/${cert.id}#certificate-purchases`;
    const props = { cert: meta, selected: false, onSelectChange: () => {}, actions: [], detailBasePath: base };
    render(<><CertificatePurchaseLink cert={meta} detailBasePath={base} />
      <AgentCertificateCard {...props} archived={false} /><AgentR03MobileCertRow {...props} /></>);
    const links = screen.getAllByRole("link", { name: "Есть покупки · Подробнее" });
    expect(links).toHaveLength(3);
    for (const link of links) expect(link).toHaveAttribute("href", expected);
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });
  it("renders all snapshots, independent totals, historical sum fallback and full purchase links", async () => {
    render(<CertificatePurchases orders={cert.orders} hasPurchases promoCode={cert.promoCode} clientName="Синтетический клиент" />);
    expect(screen.getByRole("heading", { name: "Покупки по сертификату (2)" })).toBeVisible();
    const purchases = screen.getAllByRole("article");
    await userEvent.click(within(purchases[0]).getByText("Подробности покупки"));
    expect(within(purchases[0]).getByText("Двери")).toBeVisible();
    expect(within(purchases[0]).getByText(/Вознаграждение: 5%/)).toHaveTextContent("6 000 ₽");
    await userEvent.click(within(purchases[1]).getByText("Подробности покупки"));
    expect(within(purchases[1]).getByText(/Вознаграждение: 10%/)).toHaveTextContent("5 700 ₽");
    expect(within(purchases[1]).getByText(/Статус покупки:/)).toHaveTextContent("Отмен");
    expect(screen.getAllByText(/не означает подтверждение или получение/)).toHaveLength(2);
    for (const [index, link] of screen.getAllByRole("link", { name: "Открыть полную карточку покупки" }).entries()) {
      expect(link).toHaveAttribute("href", `/history/purchases/${cert.orders![index].id}?promo=RC-QA-ONLY`);
    }
  });
  it("opens a single purchase immediately, including zero modern rate instead of historical fallback", () => {
    const order = { ...cert.orders![0], items: [{ ...cert.orders![0].items[0], issuerPercent: 0, issuerAmount: 0, agentBonusPercent: 10, agentBonusAmount: 12000 }] };
    render(<CertificatePurchases orders={[order]} hasPurchases promoCode={cert.promoCode} />);
    expect(screen.getByText("Подробности покупки").parentElement).toHaveAttribute("open");
    expect(screen.getByText("Вознаграждение: 0% (0 ₽)")).toBeVisible();
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
  it("keeps archived/inactive purchases accessible and suppresses self-scan reward", () => {
    render(<><CertificatePurchaseLink cert={{ ...meta, status: "CANCELLED", archivedInWorkspace: true }} />
      <CertificatePurchases orders={[{ ...cert.orders![0], isSelfScan: true }]} hasPurchases promoCode="RC-QA" /></>);
    expect(screen.getByRole("link", { name: /Подробнее/ })).toBeVisible();
    expect(screen.getByText(/Самосканирование/)).toBeVisible();
    expect(screen.queryByText(/Сохранённая сумма вознаграждения/)).toBeNull();
  });
});
