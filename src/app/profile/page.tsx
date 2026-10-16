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
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import {
  deriveProfileCabinetAccess,
  type ProContextSnapshot,
} from "@/lib/profile-cabinet-access";
import { requireProPageUser } from "@/lib/session";
import type { ProProfileResponse } from "@/lib/types";
import { parseProfileFocusFromQuery } from "@/lib/recommendation-profile-focus";

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

  const initialAgentR02Gate = await fetchAgentProfileGateServer(cookieHeader);
  const pureAgentCompact = isPureAgentCompactProfile(
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

  const contextResult = await fetchRemcardUpstream<ProContextSnapshot>("/api/pro/context", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  const contextReady = contextResult.ok;
  const cabinetAccess = deriveProfileCabinetAccess({
    profile: profileResult.data,
    proContext: contextReady ? contextResult.data : null,
    contextReady,
  });

  return (
    <CabinetShell returnTo={safeReturnTo}>
      <PageHeading
        eyebrow={pureAgentCompact ? "Агент" : "Профиль партнёра"}
        title={pureAgentCompact ? "Профиль агента" : "Профиль"}
        description={
          pureAgentCompact
            ? "Пошаговый профиль и реквизиты для получения оплаты. Без каталога и организации."
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
        initialPureAgentCompact={pureAgentCompact}
      />
    </CabinetShell>
  );
}
