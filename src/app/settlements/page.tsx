import { headers } from "next/headers";
import { SessionGate } from "@/components/auth/SessionGate";
import { AgentReceivablesHub } from "@/components/agent-r05/AgentReceivablesHub";
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

  return (
    <CabinetShell returnTo={RETURN_PATH}>
      <PageHeading
        eyebrow={r05Eligible ? "АГЕНТ" : "RemCard PROF"}
        title={r05Eligible ? "Кошелёк" : "Взаиморасчёты"}
        description={
          r05Eligible
            ? "Входящие обязательства партнёров. Просмотр без выплат и сверок."
            : "Открытые обязательства и завершённые выплаты между партнёрами."
        }
      />
      {r05Eligible ? <AgentReceivablesHub /> : <SettlementsHub />}
    </CabinetShell>
  );
}
