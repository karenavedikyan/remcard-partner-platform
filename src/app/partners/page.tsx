import { headers } from "next/headers";
import { SessionGate } from "@/components/auth/SessionGate";
import { AgentPartnersHub } from "@/components/partners/AgentPartnersHub";
import { PartnersHub } from "@/components/partners/PartnersHub";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { requireProPageUser } from "@/lib/session";
import type { ProProfileResponse } from "@/lib/types";
import { partnersPageReturnPath } from "@/lib/partners-return-path";
import type { AgentR04Status } from "@/lib/agent-r04/api";

export const dynamic = "force-dynamic";

export default async function PartnersPage(props: {
  searchParams?: Promise<{ terms?: string; partnershipId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const returnPath = partnersPageReturnPath(searchParams);

  const user = await requireProPageUser(returnPath);
  if (!user) {
    return <SessionGate reason="session" returnTo={returnPath} />;
  }

  const cookieHeader = (await headers()).get("cookie");
  const profileResult = await fetchRemcardUpstream<ProProfileResponse>("/api/pro/profile", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!profileResult.ok) {
    return (
      <SessionGate
        reason={profileResult.status === 401 ? "session" : undefined}
        returnTo={returnPath}
      />
    );
  }

  const r04Result = await fetchRemcardUpstream<AgentR04Status>("/api/pro/r04/status", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  const r04Eligible =
    r04Result.ok && r04Result.data.featureEnabled && r04Result.data.eligible;

  return (
    <CabinetShell returnTo={returnPath}>
      <PageHeading
        eyebrow={r04Eligible ? "АГЕНТ" : "Партнёрская сеть"}
        title={r04Eligible ? "Партнёры" : "Мои партнёры"}
        description={
          r04Eligible
            ? "Действующие партнёры, поиск в RemCard и согласование условий."
            : "Список партнёров, поиск по каталогу, приглашения и согласование условий."
        }
      />
      {r04Eligible ? (
        <AgentPartnersHub meId={user.id} initialProfile={profileResult.data} />
      ) : (
        <PartnersHub meId={user.id} initialProfile={profileResult.data} />
      )}
    </CabinetShell>
  );
}
