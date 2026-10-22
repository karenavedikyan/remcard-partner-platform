import { headers } from "next/headers";
import { SessionGate } from "@/components/auth/SessionGate";
import { AgentReceivablesWallet } from "@/components/agent-r05/AgentReceivablesWallet";
import { SpecialistMasterWallet } from "@/components/specialist-wallet/SpecialistMasterWallet";
import { SettlementsHub } from "@/components/settlements/SettlementsHub";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { requireProPageUser } from "@/lib/session";
import type { AgentR05Status } from "@/lib/agent-r05/api";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/settlements";

export default async function SettlementsPage() {
  const user = await requireProPageUser(RETURN_PATH);
  if (!user) {
    return <SessionGate reason="session" returnTo={RETURN_PATH} />;
  }

  const cookieHeader = (await headers()).get("cookie");
  const r05Result = await fetchRemcardUpstream<AgentR05Status>("/api/pro/r05/status", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  const r05Eligible =
    r05Result.ok && r05Result.data.featureEnabled && r05Result.data.eligible;
  const masterWalletShell = user.partnerType === "MASTER" && !r05Eligible;

  return (
    <CabinetShell returnTo={RETURN_PATH}>
      <PageHeading
        eyebrow={r05Eligible ? "АГЕНТ" : masterWalletShell ? "СПЕЦИАЛИСТ" : "RemCard PROF"}
        title={r05Eligible || masterWalletShell ? "Кошелёк" : "Взаиморасчёты"}
        description={
          r05Eligible
            ? "Входящие обязательства партнёров и реквизиты для получения оплаты."
            : masterWalletShell
              ? "Взаиморасчёты с партнёрами в обоих направлениях и реквизиты для выплат."
              : "Открытые обязательства и завершённые выплаты между партнёрами."
        }
      />
      {r05Eligible ? (
        <AgentReceivablesWallet />
      ) : masterWalletShell ? (
        <SpecialistMasterWallet />
      ) : (
        <SettlementsHub />
      )}
    </CabinetShell>
  );
}
