import { SessionGate } from "@/components/auth/SessionGate";
import { RecommendationsDetailRouteBody } from "@/components/specialist-certificates/RecommendationsRouteBody";
import { requireProPageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type RecommendationDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecommendationDetailPage(props: RecommendationDetailPageProps) {
  const params = await props.params;
  const returnPath = `/recommendations/${params.id}`;
  const user = await requireProPageUser(returnPath);
  if (!user) {
    return <SessionGate reason="session" returnTo={returnPath} />;
  }

  return <RecommendationsDetailRouteBody certificateId={params.id} />;
}
