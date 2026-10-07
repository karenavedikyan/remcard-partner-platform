import { SessionGate } from "@/components/auth/SessionGate";
import { AccrualDetail } from "@/components/history/AccrualDetail";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { accrualDetailHref, parseAccrualType } from "@/lib/accrual-type";
import { requireProPageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type AccrualDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ type?: string }>;
};

export default async function AccrualDetailPage(props: AccrualDetailPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const accrualType = parseAccrualType(searchParams?.type);
  const returnPath = accrualDetailHref(params.id, accrualType);
  const user = await requireProPageUser(returnPath);
  if (!user) {
    return <SessionGate reason="session" returnTo={returnPath} />;
  }

  return (
    <CabinetShell returnTo={returnPath}>
      <PageHeading eyebrow="RemCard PROF" title="Начисление" />
      <AccrualDetail user={user} accrualId={params.id} accrualType={accrualType} />
    </CabinetShell>
  );
}
