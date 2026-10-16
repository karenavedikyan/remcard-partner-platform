import { SessionGate } from "@/components/auth/SessionGate";
import { AgentR03Gate } from "@/components/agent-r03/AgentR03Gate";
import { AgentCertificatesList } from "@/components/agent-r03/AgentCertificatesList";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { requireProPageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/certificates";

export default async function CertificatesPage() {
  const user = await requireProPageUser(RETURN_PATH);
  if (!user) {
    return <SessionGate reason="session" returnTo={RETURN_PATH} />;
  }

  return (
    <CabinetShell returnTo={RETURN_PATH}>
      <PageHeading
        eyebrow="АГЕНТ"
        title="Сертификаты"
        description="Рекомендуйте. Делитесь ссылками."
      />
      <AgentR03Gate>
        <AgentCertificatesList />
      </AgentR03Gate>
    </CabinetShell>
  );
}
