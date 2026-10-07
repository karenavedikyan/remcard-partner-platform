import { SessionGate } from "@/components/auth/SessionGate";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { RecommendationsList } from "@/components/recommendations/RecommendationsList";
import { requireProPageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/recommendations";

export default async function RecommendationsPage() {
  const user = await requireProPageUser(RETURN_PATH);
  if (!user) {
    return <SessionGate reason="session" returnTo={RETURN_PATH} />;
  }

  return (
    <CabinetShell returnTo={RETURN_PATH}>
      <PageHeading
        eyebrow="RemCard PROF"
        title="Мои рекомендации"
        description="Документы со скидкой, которые вы создали для клиентов."
      />
      <RecommendationsList />
    </CabinetShell>
  );
}
