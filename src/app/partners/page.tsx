import { SessionGate } from "@/components/auth/SessionGate";
import { PartnersHub } from "@/components/partners/PartnersHub";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "PRO") {
    return <SessionGate reason={user ? "role" : "session"} />;
  }

  return (
    <CabinetShell>
      <PageHeading
        eyebrow="Партнёрская сеть"
        title="Мои партнёры"
        description="Список отношений, поиск и приглашения через существующие маршруты backend."
      />
      <PartnersHub meId={user.id} />
    </CabinetShell>
  );
}
