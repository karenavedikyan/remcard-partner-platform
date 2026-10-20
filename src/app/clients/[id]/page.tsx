import { SessionGate } from "@/components/auth/SessionGate";
import { AgentClientDetail } from "@/components/agent-r03/AgentClientDetail";
import { OwnerClientsGate } from "@/components/clients/OwnerClientsGate";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { requireProPageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function ClientDetailPage(props: PageProps) {
  const params = await props.params;
  const returnPath = `/clients/${params.id}`;
  const user = await requireProPageUser(returnPath);
  if (!user) {
    return <SessionGate reason="session" returnTo={returnPath} />;
  }

  return (
    <CabinetShell returnTo="/clients">
      <OwnerClientsGate>
        {(mode) => (
          <>
            <PageHeading eyebrow="Клиент" title="Карточка клиента" />
            <AgentClientDetail clientId={params.id} accessMode={mode} />
          </>
        )}
      </OwnerClientsGate>
    </CabinetShell>
  );
}
