import { SessionGate } from "@/components/auth/SessionGate";
import { HistoryHub } from "@/components/history/HistoryHub";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { requireProPageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/history";

type HistoryPageProps = {
  searchParams?: Promise<{ search?: string }>;
};

export default async function HistoryPage(props: HistoryPageProps) {
  const searchParams = await props.searchParams;
  const user = await requireProPageUser(RETURN_PATH);
  if (!user) {
    return <SessionGate reason="session" returnTo={RETURN_PATH} />;
  }

  const initialPromoCode = searchParams?.search ?? "";

  return (
    <CabinetShell returnTo={RETURN_PATH}>
      <PageHeading
        eyebrow="RemCard PROF"
        title="История"
        description="Покупки и начисления по данным сервера — без пересчёта по текущим условиям."
      />
      <HistoryHub user={user} initialPromoCode={initialPromoCode} />
    </CabinetShell>
  );
}
