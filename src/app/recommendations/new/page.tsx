import { Suspense } from "react";
import { SessionGate } from "@/components/auth/SessionGate";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { RecommendationsCreateRouteBody } from "@/components/specialist-certificates/RecommendationsRouteBody";
import { requireProPageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/recommendations/new";

export default async function NewRecommendationPage() {
  const user = await requireProPageUser(RETURN_PATH);
  if (!user) {
    return <SessionGate reason="session" returnTo={RETURN_PATH} />;
  }

  return (
    <CabinetShell returnTo={RETURN_PATH}>
      <Suspense fallback={<p>Загрузка формы…</p>}>
        <RecommendationsCreateRouteBody />
      </Suspense>
    </CabinetShell>
  );
}
