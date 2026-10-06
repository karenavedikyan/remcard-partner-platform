import { SessionGate } from "@/components/auth/SessionGate";
import { PurchaseDetail } from "@/components/history/PurchaseDetail";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type PurchaseDetailPageProps = {
  params: { id: string };
  searchParams?: { promo?: string };
};

export default async function PurchaseDetailPage({
  params,
  searchParams,
}: PurchaseDetailPageProps) {
  const user = await getSessionUser();
  if (!user || user.role !== "PRO") {
    return <SessionGate reason={user ? "role" : "session"} />;
  }

  return (
    <CabinetShell>
      <PageHeading eyebrow="RemCard PROF" title="Покупка" />
      <PurchaseDetail
        user={user}
        purchaseId={params.id}
        promoHint={searchParams?.promo}
      />
    </CabinetShell>
  );
}
