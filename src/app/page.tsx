import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SessionGate } from "@/components/auth/SessionGate";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { PageHeading } from "@/components/ui/PageHeading";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { countNeedsMyResponse } from "@/lib/partnership-rules";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import type { CabinetReadiness } from "@/lib/cabinet-readiness";
import { hasPendingLoginConsents } from "@/lib/cabinet-readiness";
import { getSessionUser } from "@/lib/session";
import type { PartnershipListResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage(
  props: {
    searchParams?: Promise<{ reason?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const user = await getSessionUser();
  if (!user) {
    return <SessionGate reason={searchParams?.reason} />;
  }
  if (user.isBlocked) {
    return <SessionGate reason="blocked" />;
  }
  const cookieHeader = (await headers()).get("cookie");
  const readinessResult = await fetchRemcardUpstream<CabinetReadiness>(
    "/api/account/cabinet-readiness",
    { headers: cookieHeader ? { cookie: cookieHeader } : undefined },
  );
  if (readinessResult.ok) {
    const readiness = readinessResult.data;
    if (hasPendingLoginConsents(readiness)) {
      redirect("/login?step=consents&returnTo=%2F");
    }
    if (readiness.needsProfileOnboarding) {
      redirect("/onboarding?returnTo=%2F");
    }
    if (readiness.canAccessCabinet || readiness.isEmployee) {
      // OWNER+PRO and regular partners enter here; isAdmin stays true for identity only.
    } else if (readiness.isAdmin) {
      return <SessionGate reason="role" />;
    } else {
      redirect("/onboarding?returnTo=%2F");
    }
  } else if (user.role !== "PRO") {
    redirect("/onboarding");
  }

  const listResult = await fetchRemcardUpstream<PartnershipListResponse>("/api/partnership/list", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  const partnerships = listResult.ok ? listResult.data.partnerships : [];
  const incomingCount = countNeedsMyResponse(partnerships, user.id);

  return (
    <CabinetShell returnTo="/">
      <PageHeading
        eyebrow="RemCard PROF"
        title="Моя главная"
        description="Краткий обзор профиля и партнёрств без демонстрационных расчётов."
      />
      <HomeDashboard user={user} partnerships={partnerships} incomingCount={incomingCount} />
    </CabinetShell>
  );
}
