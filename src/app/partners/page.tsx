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
import { resolvePartnersHubPresentation } from "@/lib/partners-hub-presentation";
import type { SpecialistR06Status } from "@/lib/specialist-r06/types";

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

  const upstreamHeaders = cookieHeader ? { cookie: cookieHeader } : undefined;
  const [r04Result, r06Result] = await Promise.all([
    fetchRemcardUpstream<AgentR04Status>("/api/pro/r04/status", { headers: upstreamHeaders }),
    fetchRemcardUpstream<SpecialistR06Status>("/api/pro/r06/status", { headers: upstreamHeaders }),
  ]);

  const presentation = resolvePartnersHubPresentation({
    r04: r04Result.ok ? r04Result.data : null,
    r06: r06Result.ok ? r06Result.data : null,
  });

  return (
    <CabinetShell returnTo={returnPath}>
      <PageHeading
        eyebrow={presentation.heading.eyebrow}
        title={presentation.heading.title}
        description={presentation.heading.description}
      />
      {presentation.shell === "shared-r04" ? (
        <AgentPartnersHub
          meId={user.id}
          initialProfile={profileResult.data}
          defaultSearchRole={presentation.defaultSearchRole}
          presentationAudience={presentation.audience}
        />
      ) : (
        <PartnersHub meId={user.id} initialProfile={profileResult.data} />
      )}
    </CabinetShell>
  );
}
