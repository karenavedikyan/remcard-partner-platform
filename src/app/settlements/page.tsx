import { SessionGate } from "@/components/auth/SessionGate";
import { SettlementsHub } from "@/components/settlements/SettlementsHub";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { requireProPageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/settlements";

export default async function SettlementsPage() {
  const user = await requireProPageUser(RETURN_PATH);
  if (!user) {
    return <SessionGate reason="session" returnTo={RETURN_PATH} />;
  }

  return (
    <CabinetShell returnTo={RETURN_PATH}>
      <PageHeading
        eyebrow="RemCard PROF"
        title="Взаиморасчёты"
        description="Открытые обязательства и завершённые выплаты между партнёрами — по данным сервера, без пересчёта."
      />
      <SettlementsHub />
    </CabinetShell>
  );
}
