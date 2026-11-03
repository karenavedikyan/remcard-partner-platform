"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { remcardFetch } from "@/lib/api-client";
import { isCabinetShellAuthFailure } from "@/lib/cabinet-shell-auth-failure";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import { enrichCabinetUiPreferencesForShell } from "@/lib/agent-nav/root-destination";

/** Refreshes agent UI prefs on pathname change; clears stale private shell state on auth failure. */
export function useAgentCabinetPrefsPathRefresh(
  applyServerPrefs: (
    next: CabinetUiPreferencesResponse,
    requestGeneration?: number,
  ) => void,
  applyAuthFailureClear: () => void,
  getApplyGeneration: () => number,
  onAuthFailure?: () => void,
): void {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const requestGeneration = getApplyGeneration();
    const controller = new AbortController();
    let cancelled = false;
    void remcardFetch<CabinetUiPreferencesResponse>("/api/pro/cabinet-ui-preferences", {
      signal: controller.signal,
    })
      .then((data) => {
        if (cancelled) return;
        applyServerPrefs(enrichCabinetUiPreferencesForShell(data), requestGeneration);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (isCabinetShellAuthFailure(error)) {
          applyAuthFailureClear();
          onAuthFailure?.();
          router.refresh();
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pathname, applyServerPrefs, applyAuthFailureClear, getApplyGeneration, onAuthFailure, router]);
}
