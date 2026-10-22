import { notFound } from "next/navigation";
import { PageHeading } from "@/components/ui/PageHeading";
import { SpecialistMasterWallet } from "@/components/specialist-wallet/SpecialistMasterWallet";
import { SpecialistSettlementsWorkspace } from "@/components/specialist-wallet/SpecialistSettlementsWorkspace";
import { masterWalletFixtureData } from "@/lib/specialist-settlements/fixture-data";

/** Local wallet layout preview (NODE_ENV !== production). */
export default function SettlementsDevFixturePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const fixture = masterWalletFixtureData();

  return (
    <main
      style={{
        boxSizing: "border-box",
        width: "100%",
        maxWidth: 1200,
        minWidth: 0,
        margin: "0 auto",
        padding: "32px clamp(16px, 4vw, 32px)",
      }}
      data-testid="settlements-dev-fixture"
    >
      <PageHeading eyebrow="СПЕЦИАЛИСТ" title="Кошелёк" description="Dev-fixture превью." />
      <div className="specialist-wallet-dev-fixture">
        <SpecialistMasterWallet
          settlementsSlot={<SpecialistSettlementsWorkspace previewData={fixture} />}
        />
      </div>
    </main>
  );
}
