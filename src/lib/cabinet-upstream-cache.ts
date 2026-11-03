import { fetchRemcardUpstream } from "@/lib/remcard-server";
import type { AuthMeResponse } from "@/lib/types";
import type { CabinetReadiness } from "@/lib/cabinet-readiness";
import type { PartnershipListResponse } from "@/lib/types";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import { requestCache } from "@/lib/request-cache";

function cookieHeaderFromKey(cookieKey: string): { cookie: string } | undefined {
  return cookieKey ? { cookie: cookieKey } : undefined;
}

export const getAuthMeServerCached = requestCache(async (cookieKey: string) => {
  return fetchRemcardUpstream<AuthMeResponse>("/api/auth/me", {
    headers: cookieHeaderFromKey(cookieKey),
  });
});

export const getCabinetReadinessServerCached = requestCache(async (cookieKey: string) => {
  const result = await fetchRemcardUpstream<CabinetReadiness>("/api/account/cabinet-readiness", {
    headers: cookieHeaderFromKey(cookieKey),
  });
  return result.ok ? result.data : null;
});

export const fetchPartnershipListServerCached = requestCache(async (cookieKey: string) => {
  return fetchRemcardUpstream<PartnershipListResponse>("/api/partnership/list", {
    headers: cookieHeaderFromKey(cookieKey),
  });
});

export const fetchCabinetUiPreferencesServerCached = requestCache(async (cookieKey: string) => {
  return fetchRemcardUpstream<CabinetUiPreferencesResponse>("/api/pro/cabinet-ui-preferences", {
    headers: cookieHeaderFromKey(cookieKey),
  });
});
