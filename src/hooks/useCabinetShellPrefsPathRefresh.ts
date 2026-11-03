"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import { useCabinetShellStableContext } from "@/components/layout/cabinet-shell-context";
import { enrichCabinetUiPreferencesForShell } from "@/lib/agent-nav/root-destination";
import { cabinetShellPrefsLayoutSignature } from "@/lib/cabinet-shell-prefs-signature";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";

export type UseCabinetShellPrefsPathRefreshOptions = {
  layoutPrefs: CabinetUiPreferencesResponse;
  applyServerPrefs?: (
    next: CabinetUiPreferencesResponse,
    requestGeneration?: number,
  ) => void;
  applyAuthFailureClear?: () => void;
  getApplyGeneration?: () => number;
  onAuthFailure?: () => void;
};

/** One GET /api/pro/cabinet-ui-preferences per pathname for both legacy and agent shells. */
export function useCabinetShellPrefsPathRefresh({
  layoutPrefs,
  applyServerPrefs,
  applyAuthFailureClear,
  getApplyGeneration,
  onAuthFailure,
}: UseCabinetShellPrefsPathRefreshOptions): void {
  const pathname = usePathname();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const shell = useCabinetShellStableContext();
  const acknowledgeShellPrefsLayoutMatch = shell?.acknowledgeShellPrefsLayoutMatch;
  const requestShellRefreshIfPrefsBranchMismatch = shell?.requestShellRefreshIfPrefsBranchMismatch;
  const layoutPrefsSignature = useMemo(
    () => cabinetShellPrefsLayoutSignature(layoutPrefs),
    [layoutPrefs],
  );

  useEffect(() => {
    const requestGeneration = getApplyGeneration?.() ?? 0;
    const controller = new AbortController();
    let cancelled = false;
    void remcardFetch<CabinetUiPreferencesResponse>("/api/pro/cabinet-ui-preferences", {
      signal: controller.signal,
    })
      .then((data) => {
        if (cancelled) return;
        const fresh = enrichCabinetUiPreferencesForShell(data);
        const freshSignature = cabinetShellPrefsLayoutSignature(fresh);
        if (freshSignature === layoutPrefsSignature) {
          acknowledgeShellPrefsLayoutMatch?.();
          applyServerPrefs?.(fresh, requestGeneration);
          return;
        }
        requestShellRefreshIfPrefsBranchMismatch?.(layoutPrefsSignature, freshSignature);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (error instanceof RemcardApiError && error.status === 403) {
          return;
        }
        if (error instanceof RemcardApiError && error.status === 401) {
          applyAuthFailureClear?.();
          onAuthFailure?.();
          routerRef.current.refresh();
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    pathname,
    layoutPrefsSignature,
    applyServerPrefs,
    applyAuthFailureClear,
    getApplyGeneration,
    onAuthFailure,
    acknowledgeShellPrefsLayoutMatch,
    requestShellRefreshIfPrefsBranchMismatch,
  ]);
}

/** @deprecated Prefer useCabinetShellPrefsPathRefresh with layoutPrefs. */
export function useAgentCabinetPrefsPathRefresh(
  applyServerPrefs: (
    next: CabinetUiPreferencesResponse,
    requestGeneration?: number,
  ) => void,
  applyAuthFailureClear: () => void,
  getApplyGeneration: () => number,
  onAuthFailure?: () => void,
  layoutPrefs?: CabinetUiPreferencesResponse,
): void {
  useCabinetShellPrefsPathRefresh({
    layoutPrefs: layoutPrefs ?? {
      contractVersion: "2026-10-14.r01",
      pilotEnabled: false,
      pilotActive: false,
      contextKey: null,
      version: 0,
      theme: null,
      mobileNavKeys: null,
      permittedKeys: null,
      defaultMobileNavKeys: null,
    },
    applyServerPrefs,
    applyAuthFailureClear,
    getApplyGeneration,
    onAuthFailure,
  });
}
