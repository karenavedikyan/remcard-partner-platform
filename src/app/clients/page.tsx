import { SessionGate } from "@/components/auth/SessionGate";
import { AgentClientsList } from "@/components/agent-r03/AgentClientsList";
import { OwnerClientsGate } from "@/components/clients/OwnerClientsGate";
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
      <OwnerClientsGate>
        {(mode) => (
          <>
            <PageHeading
              eyebrow={mode === "specialist" ? "Специалист" : "АГЕНТ"}
              title="Клиенты"
              description="Клиенты, с которыми вы работаете в кабинете."
            />
            <AgentClientsList />
          </>
        )}
      </OwnerClientsGate>
    </CabinetShell>
  );
}
