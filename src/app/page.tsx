import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SessionGate } from "@/components/auth/SessionGate";
import { PartnerWelcome } from "@/components/registration/PartnerWelcome";
import { fetchRegistrationCapabilitiesServer } from "@/lib/registration/capabilities-server";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { PageHeading } from "@/components/ui/PageHeading";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { countNeedsMyResponse } from "@/lib/partnership-rules";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import type { CabinetReadiness } from "@/lib/cabinet-readiness";
import { hasPendingLoginConsents } from "@/lib/cabinet-readiness";
import { getSessionUser } from "@/lib/session";
import type { PartnershipListResponse } from "@/lib/types";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import { resolveActiveAgentRootRedirect, isActiveAgentCabinetContext, enrichCabinetUiPreferencesForShell } from "@/lib/agent-nav/root-destination";
import { fetchSpecialistR06GateServer } from "@/lib/specialist-r06/serverGate";
import { shouldRenderSpecialistHome } from "@/lib/specialist-home/gate";
import {
  businessOwnerHomePartnerType,
  shouldRenderBusinessOwnerHome,
} from "@/lib/business-home/gate";
import { SpecialistHomeDashboard } from "@/components/home/SpecialistHomeDashboard";
import { BusinessOwnerHomeDashboard } from "@/components/home/BusinessOwnerHomeDashboard";

export const dynamic = "force-dynamic";

export default async function HomePage(
  props: {
    searchParams?: Promise<{ reason?: string; invite?: string; returnTo?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const cookieHeader = (await headers()).get("cookie");
  const user = await getSessionUser();
  if (!user) {
    const registrationCaps = await fetchRegistrationCapabilitiesServer(cookieHeader);
    if (registrationCaps.welcomeEnabled && registrationCaps.agentRegistrationPathEnabled) {
      return (
        <PartnerWelcome
          inviteToken={searchParams?.invite ?? null}
          returnTo={searchParams?.returnTo ?? null}
        />
      );
    }
    return <SessionGate reason={searchParams?.reason} />;
  }
  if (user.isBlocked) {
    return <SessionGate reason="blocked" />;
  }
  const readinessResult = await fetchRemcardUpstream<CabinetReadiness>(
    "/api/account/cabinet-readiness",
    { headers: cookieHeader ? { cookie: cookieHeader } : undefined },
  );

  if (!readinessResult.ok) {
    return <SessionGate returnTo="/" />;
  }

  const readiness = readinessResult.data;
  if (hasPendingLoginConsents(readiness)) {
    redirect("/login?step=consents&returnTo=%2F");
  }
  if (readiness.needsProfileOnboarding) {
    redirect("/onboarding?returnTo=%2F");
  }
  if (!readiness.canAccessCabinet) {
    return <SessionGate returnTo="/" />;
  }

  const prefsResult = await fetchRemcardUpstream<CabinetUiPreferencesResponse>(
    "/api/pro/cabinet-ui-preferences",
    { headers: cookieHeader ? { cookie: cookieHeader } : undefined },
  );
  const prefsData = prefsResult.ok ? prefsResult.data : null;
  const agentRoot = resolveActiveAgentRootRedirect(prefsData, { prefsLoadOk: prefsResult.ok });
  if (agentRoot) {
    redirect(agentRoot);
  }

  const enrichedPrefs = prefsData ? enrichCabinetUiPreferencesForShell(prefsData) : null;
  const isAgentCabinet = Boolean(enrichedPrefs && isActiveAgentCabinetContext(enrichedPrefs));
  const specialistR06Gate = await fetchSpecialistR06GateServer(cookieHeader);
  const specialistHome = shouldRenderSpecialistHome(user, specialistR06Gate, { isAgentCabinet });

  if (specialistHome) {
    return (
      <CabinetShell returnTo="/">
        <PageHeading
          eyebrow="Специалист"
          title="Ваш кабинет"
          description="Начните с того, что нужно вам сегодня."
        />
        <SpecialistHomeDashboard
          needsProfileCompletion={readiness.needsProfileCompletion}
          catalogStatus={readiness.catalogStatus ?? user.catalogStatus}
        />
      </CabinetShell>
    );
  }

  const businessOwnerHome = shouldRenderBusinessOwnerHome(user);
  const businessPartnerType = businessOwnerHome ? businessOwnerHomePartnerType(user) : null;

  if (businessOwnerHome && businessPartnerType) {
    const eyebrow = businessPartnerType === "STORE" ? "Магазин" : "Компания";
    return (
      <CabinetShell returnTo="/">
        <PageHeading
          eyebrow={eyebrow}
          title="Ваш кабинет"
          description="Начните с того, что нужно вам сегодня."
        />
        <BusinessOwnerHomeDashboard
          partnerType={businessPartnerType}
          needsProfileCompletion={readiness.needsProfileCompletion}
          catalogStatus={readiness.catalogStatus ?? user.catalogStatus}
        />
      </CabinetShell>
    );
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
        description="Обзор партнёрств и быстрые переходы к основным разделам кабинета."
      />
      <HomeDashboard
        user={user}
        partnerships={partnerships}
        incomingCount={incomingCount}
        needsProfileCompletion={readiness.needsProfileCompletion}
        catalogStatus={readiness.catalogStatus ?? user.catalogStatus}
      />
    </CabinetShell>
  );
}
