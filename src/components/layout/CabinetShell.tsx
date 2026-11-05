import { headers } from "next/headers";
import { requireProSession } from "@/lib/session";
import { fetchRemcardUpstream, getAuthMeServer } from "@/lib/remcard-server";
import { authorizePartnershipListRead } from "@/lib/employee-workspace-data/partnership-list-auth";
import { resolvePartnershipListPrincipalUserId } from "@/lib/employee-workspace-data/organization-partnership-read";
import { countNeedsMyResponse } from "@/lib/partnership-rules";
import { CabinetAppShellClient } from "@/components/layout/CabinetAppShellClient";
import { fetchCabinetPresentationServer } from "@/lib/cabinet-presentation/server";
import { resolveCabinetPresentationBlock } from "@/lib/cabinet-presentation/access-block";
import { CabinetPresentationBlockView } from "@/components/layout/CabinetPresentationBlock";
import type { CabinetReadiness } from "@/lib/cabinet-readiness";
import type { PartnershipListResponse } from "@/lib/types";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import { defaultAgentMobileNavKeys } from "@/lib/agent-nav/sections";

type CabinetShellProps = {
  children: React.ReactNode;
  returnTo?: string;
};

export async function CabinetShell({ children, returnTo = "/" }: CabinetShellProps) {
  const user = await requireProSession(returnTo);
  const cookieHeader = (await headers()).get("cookie");
  const authMe = await getAuthMeServer(cookieHeader);
  const profTestSession = authMe.ok ? authMe.data.profTestSession ?? null : null;
  const prefsResult = await fetchRemcardUpstream<CabinetUiPreferencesResponse>(
    "/api/pro/cabinet-ui-preferences",
    { headers: cookieHeader ? { cookie: cookieHeader } : undefined },
  );

  const fallbackPrefs: CabinetUiPreferencesResponse = {
    contractVersion: "2026-10-14.r01",
    pilotEnabled: false,
    pilotActive: false,
    contextKey: null,
    version: 0,
    theme: null,
    mobileNavKeys: null,
    permittedKeys: null,
    defaultMobileNavKeys: null,
  };

  const [presentationResult, readinessResult] = await Promise.all([
    fetchCabinetPresentationServer({ user, cookieHeader }),
    fetchRemcardUpstream<CabinetReadiness>("/api/account/cabinet-readiness", {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    }),
  ]);
  const { presentation } = presentationResult;

  const partnershipListAuth = authorizePartnershipListRead({
    user,
    proContext: presentation.proContext,
    contextReady: presentation.contextReady,
  });
  let attentionCount = 0;
  if (partnershipListAuth.allowed) {
    const list = await fetchRemcardUpstream<PartnershipListResponse>("/api/partnership/list", {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    });
    const principalUserId = resolvePartnershipListPrincipalUserId({
      actorUserId: user.id,
      organizationReadContext:
        partnershipListAuth.mode === "organization" ? partnershipListAuth.readContext : null,
    });
    if (list.ok) {
      attentionCount = countNeedsMyResponse(list.data.partnerships ?? [], principalUserId);
    }
  }

  const presentationBlock = readinessResult.ok
    ? resolveCabinetPresentationBlock({
        isEmployee: readinessResult.data.isEmployee,
        presentation,
        returnTo,
      })
    : { blocked: false as const };
  if (presentationBlock.blocked) {
    return <CabinetPresentationBlockView block={presentationBlock} />;
  }

  const loaded = prefsResult.ok && prefsResult.data ? prefsResult.data : fallbackPrefs;
  const uiPrefs: CabinetUiPreferencesResponse =
    loaded.pilotActive &&
    (!loaded.mobileNavKeys || loaded.mobileNavKeys.length === 0) &&
    loaded.permittedKeys
      ? {
          ...loaded,
          mobileNavKeys: defaultAgentMobileNavKeys(loaded.permittedKeys),
        }
      : loaded;

  const presentationScopeKey = `${presentation.proContext?.organization?.id ?? "none"}:${
    presentation.proContext?.activeBranch?.id ?? "none"
  }:${presentation.navMode}`;

  return (
    <CabinetAppShellClient
      key={`${user.id}:${presentationScopeKey}`}
      user={user}
      presentation={presentation}
      incomingCount={attentionCount}
      uiPrefs={uiPrefs}
      profTestSession={profTestSession}
    >
      {children}
    </CabinetAppShellClient>
  );
}
