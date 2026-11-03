import { SessionGate } from "@/components/auth/SessionGate";
import { RecommendationsListRouteBody } from "@/components/specialist-certificates/RecommendationsRouteBody";
import { requireProPageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/recommendations";

export default async function RecommendationsPage() {
  const user = await requireProPageUser(RETURN_PATH);
  if (!user) {
    return <SessionGate reason="session" returnTo={RETURN_PATH} />;
  }

  return <RecommendationsListRouteBody />;
}
