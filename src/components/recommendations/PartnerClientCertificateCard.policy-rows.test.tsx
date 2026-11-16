import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PartnerClientCertificateCard } from "./PartnerClientCertificateCard";
import { buildIssuedCertificatePreview } from "@/lib/certificate-issued-preview";
import type { StoreCertificate } from "@/lib/certificate-types";

vi.mock("qrcode", () => ({
  default: { toDataURL: () => Promise.resolve("data:image/png;base64,qr") },
}));

type Policy = NonNullable<StoreCertificate["partners"][number]["recipientPolicy"]>;

function policy(over: Partial<Policy> = {}): Policy {
  return {
    validityDays: 14,
    purchaseLimit: 1,
    minimumPurchaseAmount: null,
    promotionsCompatible: false,
    exclusionsText: null,
    policySource: "general",
    validUntil: "2026-12-01T20:59:59.999Z",
    consumedUses: 0,
    remainingPurchases: 1,
    ...over,
  } as Policy;
}

function certificate(
  partners: Array<{ id: string; policy: Policy }>,
  over: Partial<StoreCertificate> = {},
): StoreCertificate {
  return {
    id: "1",
    promoCode: "RC-U-AJMR",
    qrCode: "q",
    status: "ACTIVE",
    validUntil: null,
    maxUsages: 0,
    usageCount: 0,
    createdAt: "2026-11-01T00:00:00.000Z",
    certificateUrl: "https://remcard.ru/certificate/q",
    partners: partners.map((p) => ({
      id: `p-${p.id}`,
      storeUserId: p.id,
      storeName: `Партнёр ${p.id}`,
      partnershipId: null,
      isSelfScan: false,
      categories: [],
      recipientPolicy: p.policy,
    })),
    ...over,
  } as StoreCertificate;
}

function renderCard(cert: StoreCertificate, presentation: "default" | "scanner" = "default") {
  const preview = buildIssuedCertificatePreview(cert, "RC-U-AJMR", "https://remcard.ru/certificate/q");
  if (preview.kind !== "policy-dark") throw new Error("expected policy preview");
  return render(
    <PartnerClientCertificateCard model={preview.model} policyRows={preview.rows} presentation={presentation} />,
  );
}

describe("PartnerClientCertificateCard with frozen policy rows", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-16T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the branded red card structure: wordmark, pill, percent, QR tile, code, term/status", () => {
    renderCard(certificate([{ id: "a", policy: policy() }]));
    const card = screen.getByTestId("client-certificate-card");
    expect(card).toHaveTextContent("remcard.");
    expect(card).toHaveTextContent("Скидочный сертификат");
    expect(screen.getByTestId("client-certificate-card-qr")).toBeInTheDocument();
    expect(screen.getByTestId("certificate-code")).toHaveTextContent("RC-U-AJMR");
    expect(screen.getByTestId("issued-policy-status-summary")).toHaveTextContent("1 партнёр активен");
    expect(card.getAttribute("class")).not.toMatch(/Scanner/);
  });

  it("public code never breaks inside a token: no-break styling, wrapping tile instead of narrow code column", () => {
    renderCard(certificate([{ id: "a", policy: policy() }]), "scanner");
    const code = screen.getByTestId("certificate-code");
    expect(code).toHaveTextContent("RC-U-AJMR");
    expect(code.getAttribute("class")).toMatch(/codeValue/);
    const css = readFileSync(path.join(__dirname, "PartnerClientCertificateCard.module.css"), "utf8");
    const rule = (selector: string) =>
      css.match(new RegExp(`\\n${selector.replace(".", "\\.")}\\s*\\{([^}]+)\\}`))?.[1] ?? "";
    const codeValue = rule(".codeValue");
    expect(codeValue).toMatch(/white-space:\s*nowrap/);
    expect(codeValue).toMatch(/word-break:\s*keep-all/);
    expect(codeValue).not.toMatch(/break-all|text-overflow|overflow:\s*hidden/);
    expect(rule(".qrTile")).toMatch(/flex-wrap:\s*wrap/);
    expect(rule(".codeCol")).toMatch(/min-width:\s*min-content/);
  });

  it("scanner presentation keeps the scanner pill modifier", () => {
    renderCard(certificate([{ id: "a", policy: policy() }]), "scanner");
    expect(screen.getByTestId("client-certificate-card").getAttribute("class")).toMatch(/cardScanner/);
  });

  it("shows exact expiry, purchase count, remaining and restrictions for each recipient independently", () => {
    renderCard(
      certificate([
        { id: "a", policy: policy({ validUntil: "2026-12-01T20:59:59.999Z" }) },
        {
          id: "b",
          policy: policy({
            policySource: "individual",
            validityDays: 30,
            purchaseLimit: 3,
            consumedUses: 1,
            remainingPurchases: 2,
            validUntil: "2026-12-20T20:59:59.999Z",
            minimumPurchaseAmount: 1500,
            promotionsCompatible: true,
            exclusionsText: "акции",
          }),
        },
      ]),
    );
    const a = screen.getByTestId("issued-policy-row-a");
    const b = screen.getByTestId("issued-policy-row-b");
    expect(a).toHaveAttribute("data-row-state", "active");
    expect(a).toHaveTextContent(/14 дней/);
    expect(a).toHaveTextContent(/Разовый/);
    expect(a).toHaveTextContent(/до 1 декабря 2026/);
    expect(a).toHaveTextContent("осталось 1 · использовано 0");
    expect(b).toHaveTextContent(/30 дней/);
    expect(b).toHaveTextContent(/3 покупки/);
    expect(b).toHaveTextContent(/до 20 декабря 2026/);
    expect(b).toHaveTextContent("осталось 2 · использовано 1");
    expect(b).toHaveTextContent("Активен · индивид.");
    expect(within(b).getByTestId("issued-policy-restrictions-b")).toHaveTextContent(
      /Суммируется со скидками.*Покупка от.*акции/,
    );
    expect(screen.getByTestId("issued-policy-status-summary")).toHaveTextContent("2 партнёра активны");
    expect(screen.getByTestId("client-certificate-card").textContent).not.toMatch(/Бессрочн/);
  });

  it("per-recipient expired and depleted rows are tagged while the card state follows the active recipient", () => {
    renderCard(
      certificate([
        { id: "a", policy: policy({ validUntil: "2026-11-01T20:59:59.999Z" }) },
        { id: "b", policy: policy({ consumedUses: 1, remainingPurchases: 0 }) },
        { id: "c", policy: policy() },
      ]),
    );
    expect(screen.getByTestId("issued-policy-row-a")).toHaveAttribute("data-row-state", "expired");
    expect(screen.getByTestId("issued-policy-row-b")).toHaveAttribute("data-row-state", "depleted");
    expect(screen.getByTestId("issued-policy-row-c")).toHaveAttribute("data-row-state", "active");
    expect(screen.getByTestId("issued-policy-status-summary")).toHaveTextContent("1 из 3 активны");
    expect(screen.getByTestId("client-certificate-card-qr").className).not.toMatch(/Inactive/);
  });

  it("whole certificate expiry/exhaustion: stamp and inactive QR", () => {
    const { unmount } = renderCard(
      certificate([{ id: "a", policy: policy({ validUntil: "2026-11-01T20:59:59.999Z" }) }]),
    );
    expect(screen.getByText("Истёк", { selector: "span[class*=stamp]" })).toBeInTheDocument();
    expect(screen.getByTestId("client-certificate-card-qr").className).toMatch(/Inactive/);
    unmount();
    renderCard(certificate([{ id: "a", policy: policy({ consumedUses: 1, remainingPurchases: 0 }) }]));
    expect(screen.getByText("Использован", { selector: "span[class*=stamp]" })).toBeInTheDocument();
  });

  it("cancelled certificate marks every recipient «Отозван» even with a live snapshot", () => {
    renderCard(certificate([{ id: "a", policy: policy() }, { id: "b", policy: policy() }], { status: "CANCELLED" }));
    expect(screen.getByTestId("issued-policy-row-a")).toHaveAttribute("data-row-state", "cancelled");
    expect(screen.getByTestId("issued-policy-row-b")).toHaveAttribute("data-row-state", "cancelled");
    expect(screen.getByTestId("issued-policy-status-summary")).toHaveTextContent("Сертификат отозван");
  });

  it("unknown whole-certificate status degrades to «Недоступен»", () => {
    renderCard(certificate([{ id: "a", policy: policy() }], { status: "WEIRD" as StoreCertificate["status"] }));
    expect(screen.getByTestId("issued-policy-row-a")).toHaveAttribute("data-row-state", "unavailable");
    expect(screen.getByTestId("issued-policy-status-summary")).toHaveTextContent("Недоступен");
  });
});
