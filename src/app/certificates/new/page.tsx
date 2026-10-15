import { SessionGate } from "@/components/auth/SessionGate";
import { AgentR03Gate } from "@/components/agent-r03/AgentR03Gate";
import { CertificateCreateForm } from "@/components/recommendations/CertificateCreateForm";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { requireProPageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/certificates/new";

export default async function NewCertificatePage(props: {
  searchParams?: Promise<{ clientId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const user = await requireProPageUser(RETURN_PATH);
  if (!user) {
    return <SessionGate reason="session" returnTo={RETURN_PATH} />;
  }

  return (
    <CabinetShell returnTo="/certificates">
      <PageHeading
        eyebrow="Сертификат"
        title="Новый сертификат"
        description="Условия и партнёры проверяются на сервере."
      />
      <AgentR03Gate>
        <CertificateCreateForm
          agentR03
          agentClientId={searchParams?.clientId?.trim() || undefined}
          successHrefBase="/certificates"
        />
      </AgentR03Gate>
    </CabinetShell>
  );
}
