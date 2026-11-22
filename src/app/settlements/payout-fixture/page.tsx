import { notFound } from "next/navigation";
import { PageHeading } from "@/components/ui/PageHeading";
import { WalletPayoutRegisterShell } from "@/components/wallet-payout-register/WalletPayoutRegisterShell";
import type { WalletPayoutRegisterResponse } from "@/lib/wallet-payout-register/types";

/** Synthetic payout register layout preview — no API, non-production only. */
export default function PayoutFixturePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const data: WalletPayoutRegisterResponse = {
    incomingOnly: false,
    readOnly: false,
    canPayout: true,
    totals: { inKopecks: 890_000, outKopecks: 480_000 },
    partners: [
      {
        counterpartyId: "syn-1",
        counterpartyName: "Дом материалов",
        branchLabel: null,
        direction: "in",
        readyKopecks: 500_000,
        pending: { requestId: "syn-req-1", amountKopecks: 200_000, status: "waiting" },
        lastReceipt: null,
      },
      {
        counterpartyId: "syn-2",
        counterpartyName: "Плитка и стиль",
        branchLabel: null,
        direction: "in",
        readyKopecks: 240_000,
        pending: null,
        lastReceipt: null,
      },
      {
        counterpartyId: "syn-3",
        counterpartyName: "Свет и дом",
        branchLabel: null,
        direction: "in",
        readyKopecks: 150_000,
        pending: null,
        lastReceipt: null,
      },
    ],
    receipts: [],
  };

  return (
    <main
      className="pw"
      style={{
        boxSizing: "border-box",
        width: "100%",
        maxWidth: 1440,
        minWidth: 0,
        margin: "0 auto",
        padding: "32px clamp(16px, 4vw, 32px)",
      }}
      data-testid="payout-fixture-page"
    >
      <PageHeading eyebrow="КОМПАНИЯ" title="Кошелёк" description="Синтетический превью вкладки «Выплаты»." />
      <WalletPayoutRegisterShell
        data={data}
        presentation={{ ribbonLabel: "Компания", cardIdentifier: null }}
        onRefresh={() => undefined}
      />
    </main>
  );
}