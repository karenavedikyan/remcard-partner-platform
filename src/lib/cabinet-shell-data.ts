import { headers } from "next/headers";
import {
  fetchCabinetUiPreferencesServerCached,
  fetchPartnershipListServerCached,
  getAuthMeServerCached,
} from "@/lib/cabinet-upstream-cache";
import { countNeedsMyResponse } from "@/lib/partnership-rules";
import { defaultAgentMobileNavKeys } from "@/lib/agent-nav/sections";
import type { AuthUser } from "@/lib/types";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import type { ProfTestSessionInfo } from "@/lib/types";

export type CabinetShellClientProps = {
  user: AuthUser;
  incomingCount: number;
  uiPrefs: CabinetUiPreferencesResponse;
  profTestSession: ProfTestSessionInfo | null;
};

export async function loadCabinetShellClientProps(user: AuthUser): Promise<CabinetShellClientProps> {
  const cookieKey = (await headers()).get("cookie") ?? "";

  const [authMe, list, prefsResult] = await Promise.all([
    getAuthMeServerCached(cookieKey),
    fetchPartnershipListServerCached(cookieKey),
    fetchCabinetUiPreferencesServerCached(cookieKey),
  ]);

  const profTestSession = authMe.ok ? authMe.data.profTestSession ?? null : null;
  const attentionCount =
    list.ok && user.id ? countNeedsMyResponse(list.data.partnerships ?? [], user.id) : 0;

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

  return {
    user,
    incomingCount: attentionCount,
    uiPrefs,
    profTestSession,
  };
}
