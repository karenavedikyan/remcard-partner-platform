import { SessionGate } from "@/components/auth/SessionGate";
import { PurchaseDetail } from "@/components/history/PurchaseDetail";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { requireProPageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type PurchaseDetailPageProps = {
  params: { id: string };
  searchParams?: { promo?: string };
};

export default async function PurchaseDetailPage({
  params,
  searchParams,
}: PurchaseDetailPageProps) {
  const returnPath = `/history/purchases/${params.id}`;
  const user = await requireProPageUser(returnPath);
  if (!user) {
    return <SessionGate reason="session" returnTo={returnPath} />;
  }

  return (
    <CabinetShell returnTo={returnPath}>
      <PageHeading eyebrow="RemCard PROF" title="Покупка" />
      <PurchaseDetail
        user={user}
        purchaseId={params.id}
        promoHint={searchParams?.promo}
      />
    </CabinetShell>
  );
}
