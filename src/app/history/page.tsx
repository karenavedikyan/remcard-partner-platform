import { SessionGate } from "@/components/auth/SessionGate";
import { HistoryHub } from "@/components/history/HistoryHub";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { requireProPageUser } from "@/lib/session";
import { historyActorScopeKey } from "@/lib/settlements-fetch-scope";

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
  const historyScopeKey = historyActorScopeKey(user.id, user.role);

  return (
    <CabinetShell returnTo={RETURN_PATH}>
      <PageHeading
        eyebrow="RemCard PROF"
        title="История"
        description="Покупки и начисления по данным сервера — без пересчёта по текущим условиям."
      />
      <HistoryHub
        key={historyScopeKey}
        user={user}
        scopeKey={historyScopeKey}
        initialPromoCode={initialPromoCode}
      />
    </CabinetShell>
  );
}
