import { SessionGate } from "@/components/auth/SessionGate";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { RecommendationsList } from "@/components/recommendations/RecommendationsList";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "PRO") {
    return <SessionGate reason={user ? "role" : "session"} />;
  }

  return (
    <CabinetShell>
      <PageHeading
        eyebrow="RemCard PROF"
        title="Мои рекомендации"
        description="Документы со скидкой, которые вы создали для клиентов."
      />
      <RecommendationsList />
    </CabinetShell>
  );
}
