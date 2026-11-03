import { SessionGate } from "@/components/auth/SessionGate";
import { AgentR03Gate } from "@/components/agent-r03/AgentR03Gate";
import { AgentCertificateDetail } from "@/components/agent-r03/AgentCertificateDetail";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { requireProPageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function CertificateDetailPage(props: PageProps) {
  const params = await props.params;
  const returnPath = `/certificates/${params.id}`;
  const user = await requireProPageUser(returnPath);
  if (!user) {
    return <SessionGate reason="session" returnTo={returnPath} />;
  }

  return (
    <CabinetShell returnTo="/certificates">
      <PageHeading
        eyebrow="Сертификат"
        title="Сертификат Ремкард"
        description="Публичная ссылка, QR и PDF."
      />
      <AgentR03Gate>
        <AgentCertificateDetail certificateId={params.id} />
      </AgentR03Gate>
    </CabinetShell>
  );
}
