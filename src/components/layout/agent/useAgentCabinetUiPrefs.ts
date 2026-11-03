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
import { neutralCabinetUiPreferencesFallback } from "@/lib/cabinet-ui-preferences-fallback";

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
  const applyGenerationRef = useRef(0);
  const blockInitialFromLayoutRef = useRef(false);

  const applyIncoming = useCallback(
    (
      next: CabinetUiPreferencesResponse,
      source: CabinetUiPrefsApplySource,
      requestGeneration?: number,
    ) => {
      if (source === "auth-failure") {
        applyGenerationRef.current += 1;
        versionRef.current = 0;
        blockInitialFromLayoutRef.current = true;
        setPrefs(next);
        return;
      }
      if (
        requestGeneration !== undefined &&
        requestGeneration !== applyGenerationRef.current
      ) {
        return;
      }
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
    blockInitialFromLayoutRef.current = false;
  }, [initial.version, initial.pilotActive, initial.contextKey]);

  useEffect(() => {
    if (blockInitialFromLayoutRef.current) {
      return;
    }
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
      const requestGeneration = applyGenerationRef.current;
      saveInFlightRef.current += 1;
      try {
        const next = await remcardFetch<CabinetUiPreferencesResponse>(
          "/api/pro/cabinet-ui-preferences",
          {
            method: "PATCH",
            body: { mobileNavKeys, expectedVersion: versionRef.current },
          },
        );
        applyIncoming(next, "patch", requestGeneration);
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
      const requestGeneration = applyGenerationRef.current;
      saveInFlightRef.current += 1;
      try {
        const next = await remcardFetch<CabinetUiPreferencesResponse>(
          "/api/pro/cabinet-ui-preferences",
          {
            method: "PATCH",
            body: { theme, expectedVersion: versionRef.current },
          },
        );
        applyIncoming(next, "patch", requestGeneration);
        return next;
      } catch (error) {
        throw wrapSaveError(error);
      } finally {
        saveInFlightRef.current -= 1;
      }
    },
    [applyIncoming],
  );

  const getApplyGeneration = useCallback(() => applyGenerationRef.current, []);

  const applyServerPrefs = useCallback(
    (next: CabinetUiPreferencesResponse, requestGeneration?: number) => {
      applyIncoming(next, "get", requestGeneration);
    },
    [applyIncoming],
  );

  const applyAuthFailureClear = useCallback(() => {
    applyIncoming(neutralCabinetUiPreferencesFallback, "auth-failure");
  }, [applyIncoming]);

  return {
    prefs,
    applyServerPrefs,
    applyAuthFailureClear,
    getApplyGeneration,
    saveMobileNavKeys,
    saveTheme,
  };
}
