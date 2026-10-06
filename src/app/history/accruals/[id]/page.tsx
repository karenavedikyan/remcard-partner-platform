import { SessionGate } from "@/components/auth/SessionGate";
import { AccrualDetail } from "@/components/history/AccrualDetail";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type AccrualDetailPageProps = {
  params: { id: string };
};

export default async function AccrualDetailPage({ params }: AccrualDetailPageProps) {
  const user = await getSessionUser();
  if (!user || user.role !== "PRO") {
    return <SessionGate reason={user ? "role" : "session"} />;
  }

  return (
    <CabinetShell>
      <PageHeading eyebrow="RemCard PROF" title="Начисление" />
      <AccrualDetail user={user} accrualId={params.id} />
    </CabinetShell>
  );
}
