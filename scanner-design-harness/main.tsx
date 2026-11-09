import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "../src/app/globals.css";
import { PurchaseReviewModal } from "@/components/scanner/PurchaseReviewModal";
import { ScannerReferringPartnerBlock } from "@/components/scanner/ScannerReferringPartnerBlock";
import { PartnerClientCertificateCard } from "@/components/recommendations/PartnerClientCertificateCard";
import { defaultRewardDraft } from "@/lib/reward-confirmation";
import { computeOrderTotals } from "@/lib/order-totals";
import type { OrderPreviewAllowed } from "@/lib/order-types";
import type { StoreCertificateClientCardModel } from "@/lib/storeCertificateClientCardModel";

const preview: OrderPreviewAllowed = {
  allowed: true,
  certificate: {
    id: "harness-cert",
    promoCode: "А-RC-HARNESS-01",
    status: "ACTIVE",
    validUntil: "2031-06-01T00:00:00.000Z",
    usageCount: 0,
    maxUsages: 3,
    userAlias: null,
    issuer: { label: "PROF", name: "Организация-эмитент" },
  },
  partner: { id: "store-1", storeName: "Магазин приёма", isSelfScan: false },
  availableCategories: [
    { category: "doors", categoryLabel: "Двери", discountPercent: 10, issuerPercent: 4 },
    { category: "floor", categoryLabel: "Пол", discountPercent: 7, issuerPercent: 2 },
  ],
  referringPartner: {
    partnerType: "MASTER",
    typeLabel: "Мастер",
    displayName: "Иван Рекомендатель",
    city: "Краснодар",
    contacts: [
      {
        kind: "telegram",
        label: "Telegram",
        value: "@ivan",
        href: "https://t.me/ivan",
      },
    ],
  },
};

const amounts = { doors: "10750", floor: "5750" };
const totals = computeOrderTotals(preview.availableCategories, amounts);

const cardModel: StoreCertificateClientCardModel = {
  active: true,
  state: "active",
  title: "Сертификат",
  pctTextValue: "до 10%",
  pctSubtitleText: "на покупку",
  visibleCode: preview.certificate.promoCode,
  certificateUrl: "https://example.invalid/harness",
  termTextValue: "до 01.06.2031",
  statusLabelText: "Активен",
  stampText: null,
};

function HarnessApp() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  return (
    <div data-theme={theme} id="scanner-design-harness">
      <header className="harness-toolbar">
        <button type="button" onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}>
          Тема: {theme}
        </button>
      </header>
      <div className="harness-canvas">
        <PartnerClientCertificateCard model={cardModel} presentation="scanner" />
        <ScannerReferringPartnerBlock referringPartner={preview.referringPartner} />
        <PurchaseReviewModal
          open
          preview={preview}
          amountDrafts={amounts}
          rewardDrafts={{ doors: defaultRewardDraft, floor: { ...defaultRewardDraft, days: "30" } }}
          totals={totals}
          branchLabel="Центральный филиал"
          submitting={false}
          onClose={() => undefined}
          onConfirm={() => undefined}
        />
      </div>
    </div>
  );
}

const shell = (
  <>
    <style>{`
      #scanner-design-harness { min-height: 100vh; background: var(--bg); color: var(--ink); font-family: var(--font-sans, system-ui, sans-serif); }
      .harness-toolbar { padding: 12px 16px; border-bottom: 1px solid var(--line); }
      .harness-toolbar button { min-height: 44px; padding: 0 16px; font-weight: 700; }
      .harness-canvas { max-width: 720px; margin: 0 auto; padding: 24px 16px 120px; display: grid; gap: 16px; position: relative; }
      @media (max-width: 420px) { .harness-canvas { padding: 16px 12px 96px; max-width: 390px; } }
    `}</style>
    <HarnessApp />
  </>
);

createRoot(document.getElementById("root")!).render(<StrictMode>{shell}</StrictMode>);
