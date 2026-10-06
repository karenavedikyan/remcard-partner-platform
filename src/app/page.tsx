import { headers } from "next/headers";
import { SessionGate } from "@/components/auth/SessionGate";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { PageHeading } from "@/components/ui/PageHeading";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { countNeedsMyResponse } from "@/lib/partnership-rules";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { getSessionUser } from "@/lib/session";
import type { PartnershipListResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { reason?: string };
}) {
  const user = await getSessionUser();
  if (!user) {
    return <SessionGate reason={searchParams?.reason} />;
  }
  if (user.isBlocked) {
    return <SessionGate reason="blocked" />;
  }
  if (user.role !== "PRO") {
    return <SessionGate reason="role" />;
  }

  const cookieHeader = headers().get("cookie");
  const listResult = await fetchRemcardUpstream<PartnershipListResponse>("/api/partnership/list", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  const partnerships = listResult.ok ? listResult.data.partnerships : [];
  const incomingCount = countNeedsMyResponse(partnerships, user.id);

  return (
    <CabinetShell>
      <PageHeading
        eyebrow="RemCard PROF"
        title="Моя главная"
        description="Краткий обзор профиля и партнёрств без демонстрационных расчётов."
      />
      <HomeDashboard user={user} partnerships={partnerships} incomingCount={incomingCount} />
    </CabinetShell>
  );
}
