"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import {
  shouldApplyIncomingCabinetUiPrefs,
  type CabinetUiPrefsApplySource,
} from "@/lib/agent-cabinet-ui-prefs-apply";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import type { AgentNavSectionKey } from "@/lib/agent-nav/sections";
import type { ThemePreference } from "@/lib/theme-preference";

export class CabinetUiPrefsSaveError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "CabinetUiPrefsSaveError";
    this.status = status;
    this.code = code;
  }
}

function wrapSaveError(error: unknown): CabinetUiPrefsSaveError {
  if (error instanceof RemcardApiError) {
    const code =
      error.body && typeof error.body === "object" && "code" in error.body
        ? String((error.body as { code?: string }).code ?? "")
        : null;
    return new CabinetUiPrefsSaveError(error.message, error.status, code || null);
  }
  return new CabinetUiPrefsSaveError(
    error instanceof Error ? error.message : "Не удалось сохранить настройки",
    0,
  );
}

export function useAgentCabinetUiPrefs(initial: CabinetUiPreferencesResponse) {
  const [prefs, setPrefs] = useState(initial);
  const versionRef = useRef(initial.version);
  const saveInFlightRef = useRef(0);

  const applyIncoming = useCallback(
    (next: CabinetUiPreferencesResponse, source: CabinetUiPrefsApplySource) => {
      if (
        !shouldApplyIncomingCabinetUiPrefs(
          versionRef.current,
          next,
          saveInFlightRef.current,
          source,
        )
      ) {
        return;
      }
      versionRef.current = next.version;
      setPrefs(next);
    },
    [],
  );

  useEffect(() => {
    applyIncoming(initial, "initial");
  }, [
    applyIncoming,
    initial,
    initial.version,
    initial.permittedKeys,
    initial.mobileNavKeys,
    initial.theme,
    initial.pilotActive,
    initial.contextKey,
  ]);

  const saveMobileNavKeys = useCallback(
    async (mobileNavKeys: AgentNavSectionKey[]) => {
      saveInFlightRef.current += 1;
      try {
        const next = await remcardFetch<CabinetUiPreferencesResponse>(
          "/api/pro/cabinet-ui-preferences",
          {
            method: "PATCH",
            body: { mobileNavKeys, expectedVersion: versionRef.current },
          },
        );
        applyIncoming(next, "patch");
        return next;
      } catch (error) {
        throw wrapSaveError(error);
      } finally {
        saveInFlightRef.current -= 1;
      }
    },
    [applyIncoming],
  );

  const saveTheme = useCallback(
    async (theme: ThemePreference) => {
      saveInFlightRef.current += 1;
      try {
        const next = await remcardFetch<CabinetUiPreferencesResponse>(
          "/api/pro/cabinet-ui-preferences",
          {
            method: "PATCH",
            body: { theme, expectedVersion: versionRef.current },
          },
        );
        applyIncoming(next, "patch");
        return next;
      } catch (error) {
        throw wrapSaveError(error);
      } finally {
        saveInFlightRef.current -= 1;
      }
    },
    [applyIncoming],
  );

  const applyServerPrefs = useCallback(
    (next: CabinetUiPreferencesResponse) => {
      applyIncoming(next, "get");
    },
    [applyIncoming],
  );

  return { prefs, applyServerPrefs, saveMobileNavKeys, saveTheme };
}
