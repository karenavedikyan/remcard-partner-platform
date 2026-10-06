import { SessionGate } from "@/components/auth/SessionGate";
import { HistoryHub } from "@/components/history/HistoryHub";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type HistoryPageProps = {
  searchParams?: { promo?: string; search?: string };
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const user = await getSessionUser();
  if (!user || user.role !== "PRO") {
    return <SessionGate reason={user ? "role" : "session"} />;
  }

  const initialPromoCode = searchParams?.promo ?? searchParams?.search ?? "";

  return (
    <CabinetShell>
      <PageHeading
        eyebrow="RemCard PROF"
        title="История"
        description="Покупки и начисления по данным сервера — без пересчёта по текущим условиям."
      />
      <HistoryHub user={user} initialPromoCode={initialPromoCode} />
    </CabinetShell>
  );
}
