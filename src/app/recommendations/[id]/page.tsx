import { SessionGate } from "@/components/auth/SessionGate";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { CertificateDetail } from "@/components/recommendations/CertificateDetail";
import { requireProPageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type RecommendationDetailPageProps = {
  params: { id: string };
};

export default async function RecommendationDetailPage({ params }: RecommendationDetailPageProps) {
  const returnPath = `/recommendations/${params.id}`;
  const user = await requireProPageUser(returnPath);
  if (!user) {
    return <SessionGate reason="session" returnTo={returnPath} />;
  }

  return (
    <CabinetShell returnTo={returnPath}>
      <PageHeading
        eyebrow="Рекомендация"
        title="Документ для клиента"
        description="QR, код, ссылка и PDF из существующего backend RemCard."
      />
      <CertificateDetail certificateId={params.id} />
    </CabinetShell>
  );
}
