import { SessionGate } from "@/components/auth/SessionGate";
import { AgentR03Gate } from "@/components/agent-r03/AgentR03Gate";
import { AgentClientsList } from "@/components/agent-r03/AgentClientsList";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { requireProPageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/clients";

export default async function ClientsPage() {
  const user = await requireProPageUser(RETURN_PATH);
  if (!user) {
    return <SessionGate reason="session" returnTo={RETURN_PATH} />;
  }

  return (
    <CabinetShell returnTo={RETURN_PATH}>
      <PageHeading
        eyebrow="RemCard PROF"
        title="Клиенты"
        description="Карточки клиентов и связанные сертификаты агента."
      />
      <AgentR03Gate>
        <AgentClientsList />
      </AgentR03Gate>
    </CabinetShell>
  );
}
