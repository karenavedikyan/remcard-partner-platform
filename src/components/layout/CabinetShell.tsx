import { headers } from "next/headers";
import { requireProSession } from "@/lib/session";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { countNeedsMyResponse } from "@/lib/partnership-rules";
import { CabinetAppShellClient } from "@/components/layout/CabinetAppShellClient";
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
  const list = await fetchRemcardUpstream<PartnershipListResponse>("/api/partnership/list", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  const attentionCount =
    list.ok && user.id ? countNeedsMyResponse(list.data.partnerships ?? [], user.id) : 0;

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

  return (
    <CabinetAppShellClient
      user={user}
      incomingCount={attentionCount}
      uiPrefs={uiPrefs}
    >
      {children}
    </CabinetAppShellClient>
  );
}
