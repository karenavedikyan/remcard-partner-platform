import { SessionGate } from "@/components/auth/SessionGate";
import { AccrualDetail } from "@/components/history/AccrualDetail";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { requireProPageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type AccrualDetailPageProps = {
  params: { id: string };
};

export default async function AccrualDetailPage({ params }: AccrualDetailPageProps) {
  const returnPath = `/history/accruals/${params.id}`;
  const user = await requireProPageUser(returnPath);
  if (!user) {
    return <SessionGate reason="session" returnTo={returnPath} />;
  }

  return (
    <CabinetShell returnTo={returnPath}>
      <PageHeading eyebrow="RemCard PROF" title="Начисление" />
      <AccrualDetail user={user} accrualId={params.id} />
    </CabinetShell>
  );
}
