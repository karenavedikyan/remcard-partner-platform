import { headers } from "next/headers";
import { SessionGate } from "@/components/auth/SessionGate";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { sanitizeReturnTo } from "@/lib/auth-flow";
import {
  isModerationDeepLink,
  resolveProfileSectionFromQuery,
  type ProfileSectionId,
} from "@/lib/profile-sections";
import {
  fetchAgentProfileGateServer,
  isPureAgentCompactProfile,
} from "@/lib/agent-profile/serverGate";
import { fetchSpecialistR06GateServer } from "@/lib/specialist-r06/serverGate";
import { fetchCabinetPresentationServer } from "@/lib/cabinet-presentation/server";
import { resolveCabinetPresentationBlock } from "@/lib/cabinet-presentation/access-block";
import { CabinetPresentationBlockView } from "@/components/layout/CabinetPresentationBlock";
import { resolveOrgStaffWorkplaceProfile } from "@/lib/business-profile/workplace-profile";
import { ProfileOrgStaffWorkplace } from "@/components/profile/ProfileOrgStaffWorkplace";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import type { CabinetReadiness } from "@/lib/cabinet-readiness";
import { deriveProfileCabinetAccess } from "@/lib/profile-cabinet-access";
import { requireProPageUser } from "@/lib/session";
import type { ProProfileResponse } from "@/lib/types";
import { parseProfileFocusFromQuery } from "@/lib/recommendation-profile-focus";
import pureAgentStyles from "./pureAgentProfilePage.module.css";
export const dynamic = "force-dynamic";

const RETURN_PATH = "/profile";

export default async function ProfilePage(props: {
  searchParams?: Promise<{
    section?: string;
    returnTo?: string;
    moderation?: string;
    branchId?: string;
    focus?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const safeReturnTo = sanitizeReturnTo(searchParams?.returnTo) ?? RETURN_PATH;
  const focusField = parseProfileFocusFromQuery(searchParams?.focus);
  const moderationSection = isModerationDeepLink({
    section: searchParams?.section,
    moderation: searchParams?.moderation,
  });
  const focusBranchId = searchParams?.branchId?.trim() || undefined;

  const user = await requireProPageUser(safeReturnTo);
  if (!user) {
    return <SessionGate reason="session" returnTo={safeReturnTo} />;
  }

  const cookieHeader = (await headers()).get("cookie");
  const profileResult = await fetchRemcardUpstream<ProProfileResponse>("/api/pro/profile", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!profileResult.ok) {
    return (
      <SessionGate
        reason={profileResult.status === 401 ? "session" : undefined}
        returnTo={safeReturnTo}
      />
    );
  }

  const { presentation } = await fetchCabinetPresentationServer({ user, cookieHeader });

  const readinessResult = await fetchRemcardUpstream<CabinetReadiness>(
    "/api/account/cabinet-readiness",
    { headers: cookieHeader ? { cookie: cookieHeader } : undefined },
  );
  const profilePresentationBlock =
    readinessResult.ok
      ? resolveCabinetPresentationBlock({
          isEmployee: readinessResult.data.isEmployee,
          presentation,
          returnTo: safeReturnTo,
        })
      : { blocked: false as const };
  if (profilePresentationBlock.blocked) {
    return <CabinetPresentationBlockView block={profilePresentationBlock} />;
  }

  const cabinetAccess = deriveProfileCabinetAccess({
    profile: profileResult.data,
    proContext: presentation.proContext,
    contextReady: presentation.contextReady,
  });

  const orgStaffWorkplace = resolveOrgStaffWorkplaceProfile(presentation);

  const initialAgentR02Gate = orgStaffWorkplace
    ? null
    : await fetchAgentProfileGateServer(cookieHeader);
  const initialSpecialistR06Gate = orgStaffWorkplace
    ? null
    : await fetchSpecialistR06GateServer(cookieHeader);
  const pureAgentCompact = orgStaffWorkplace
    ? false
    : isPureAgentCompactProfile(
        profileResult.data.user.partnerActivities,
        initialAgentR02Gate,
      );

  const section: ProfileSectionId = resolveProfileSectionFromQuery(
    {
      section: searchParams?.section,
      moderation: searchParams?.moderation,
      branchId: searchParams?.branchId,
    },
    { pureAgentCompact },
  );

  if (orgStaffWorkplace) {
    const eyebrow = orgStaffWorkplace.partnerType === "STORE" ? "Магазин" : "Компания";
    return (
      <CabinetShell returnTo={safeReturnTo}>
        <PageHeading
          eyebrow={eyebrow}
          title="Профиль"
          description="Рабочий контекст организации. Личные шаблоны MASTER/AGENT и кабинет владельца здесь не используются."
        />
        <ProfileOrgStaffWorkplace
          initial={profileResult.data}
          cabinetAccess={cabinetAccess}
          partnerType={orgStaffWorkplace.partnerType}
          section={section}
        />
      </CabinetShell>
    );
  }

  const profileChrome = (
    <>
      <PageHeading
        eyebrow="Профиль партнёра"
        title="Профиль"
        description={
          pureAgentCompact
            ? "Рабочие данные для партнёрства и рекомендаций. Заполнение не публикует вас в каталоге RemCard."
            : "Рабочие данные для партнёрства, филиалы, команда и добровольная публикация в каталоге RemCard."
        }
      />
      <ProfileEditor
        initial={profileResult.data}
        cabinetAccess={cabinetAccess}
        moderationSection={moderationSection}
        section={section}
        focusBranchId={focusBranchId}
        focusField={focusField}
        returnTo={safeReturnTo}
        initialAgentR02Gate={initialAgentR02Gate}
        initialSpecialistR06Gate={initialSpecialistR06Gate}
        initialPureAgentCompact={pureAgentCompact}
      />
    </>
  );

  const body = pureAgentCompact ? (
    <div className={pureAgentStyles.pureAgentProfileChrome}>{profileChrome}</div>
  ) : (
    profileChrome
  );

  return <CabinetShell returnTo={safeReturnTo}>{body}</CabinetShell>;
}
