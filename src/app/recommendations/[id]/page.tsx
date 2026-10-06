import { SessionGate } from "@/components/auth/SessionGate";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { CertificateDetail } from "@/components/recommendations/CertificateDetail";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type RecommendationDetailPageProps = {
  params: { id: string };
};

export default async function RecommendationDetailPage({ params }: RecommendationDetailPageProps) {
  const user = await getSessionUser();
  if (!user || user.role !== "PRO") {
    return <SessionGate reason={user ? "role" : "session"} />;
  }

  return (
    <CabinetShell>
      <PageHeading
        eyebrow="Рекомендация"
        title="Документ для клиента"
        description="QR, код, ссылка и PDF из существующего backend RemCard."
      />
      <CertificateDetail certificateId={params.id} />
    </CabinetShell>
  );
}
