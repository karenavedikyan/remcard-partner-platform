import { SessionGate } from "@/components/auth/SessionGate";
import { ClientsListWorkspace } from "@/components/clients/ClientsListWorkspace";
import { CabinetShell } from "@/components/layout/CabinetShell";
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
      <ClientsListWorkspace />
    </CabinetShell>
  );
}
