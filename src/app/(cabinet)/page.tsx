import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SessionGate } from "@/components/auth/SessionGate";
import { PartnerWelcome } from "@/components/registration/PartnerWelcome";
import { fetchRegistrationCapabilitiesServer } from "@/lib/registration/capabilities-server";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { PageHeading } from "@/components/ui/PageHeading";
import { countNeedsMyResponse } from "@/lib/partnership-rules";
import { hasPendingLoginConsents } from "@/lib/cabinet-readiness";
import {
  fetchCabinetUiPreferencesServerCached,
  fetchPartnershipListServerCached,
  getCabinetReadinessServerCached,
} from "@/lib/cabinet-upstream-cache";
import { getSessionUser, isProfCabinetAllowed } from "@/lib/session";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import { resolveActiveAgentRootRedirect, isActiveAgentCabinetContext, enrichCabinetUiPreferencesForShell } from "@/lib/agent-nav/root-destination";
import { fetchSpecialistR06GateServer } from "@/lib/specialist-r06/serverGate";
import { shouldRenderSpecialistHome } from "@/lib/specialist-home/gate";
import { SpecialistHomeDashboard } from "@/components/home/SpecialistHomeDashboard";
import {
  businessOwnerHomePartnerType,
  shouldRenderBusinessOwnerHome,
} from "@/lib/business-home/gate";
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
  // Staff access is independent of partner PRO onboarding and consents.
  // Use the effective authenticated user, including delegated test sessions.
  if (user.staffRole === "OWNER" || user.staffRole === "ADMIN") {
    redirect("/admin/overview");
  }
  const cookieKey = cookieHeader ?? "";
  const readiness = await getCabinetReadinessServerCached(cookieKey);
  if (!readiness) {
    return <SessionGate returnTo="/" />;
  }
  if (hasPendingLoginConsents(readiness)) {
    redirect("/login?step=consents&returnTo=%2F");
  }
  if (readiness.needsProfileOnboarding) {
    redirect("/onboarding?returnTo=%2F");
  }
  if (!readiness.canAccessCabinet) {
    return <SessionGate returnTo="/" />;
  }

  const prefsResult = await fetchCabinetUiPreferencesServerCached(cookieKey);
  const prefsData = prefsResult.ok ? prefsResult.data : null;
  const agentRoot = resolveActiveAgentRootRedirect(prefsData, { prefsLoadOk: prefsResult.ok });
  if (agentRoot) {
    redirect(agentRoot);
  }

  if (!isProfCabinetAllowed(readiness, user)) {
    redirect("/?reason=role");
  }

  const enrichedPrefs = prefsData ? enrichCabinetUiPreferencesForShell(prefsData) : null;
  const isAgentCabinet = Boolean(enrichedPrefs && isActiveAgentCabinetContext(enrichedPrefs));
  const specialistR06Gate = await fetchSpecialistR06GateServer(cookieHeader);
  const specialistHome = shouldRenderSpecialistHome(user, specialistR06Gate, { isAgentCabinet });

  if (specialistHome) {
    return (
      <>
        <PageHeading
          eyebrow="Специалист"
          title="Ваш кабинет"
          description="Начните с того, что нужно вам сегодня."
        />
        <SpecialistHomeDashboard
          needsProfileCompletion={readiness.needsProfileCompletion}
          catalogStatus={readiness.catalogStatus ?? user.catalogStatus}
        />
      </>
    );
  }

  const businessOwnerHome = shouldRenderBusinessOwnerHome(user);
  const businessPartnerType = businessOwnerHome ? businessOwnerHomePartnerType(user) : null;

  if (businessOwnerHome && businessPartnerType) {
    const eyebrow = businessPartnerType === "STORE" ? "Магазин" : "Компания";
    return (
      <>
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
      </>
    );
  }

  const listResult = await fetchPartnershipListServerCached(cookieKey);

  const partnerships = listResult.ok ? listResult.data.partnerships : [];
  const incomingCount = countNeedsMyResponse(partnerships, user.id);

  return (
    <>
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
    </>
  );
}
