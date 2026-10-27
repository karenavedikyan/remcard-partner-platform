"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RemcardApiError } from "@/lib/api-client";
import {
  ACCOUNT_SESSION_BROADCAST,
  clearLocalSessionArtifacts,
  endAccountExit,
  notifyAccountSessionExit,
  postLogoutAllDevices,
  postLogoutCurrentDevice,
  tryBeginAccountExit,
  type AccountExitScope,
} from "@/lib/account-session-exit";

export function useAccountSessionExit({ signInMode }: { signInMode?: "admin" } = {}) {
  const router = useRouter();
  const [pending, setPending] = useState<AccountExitScope | null>(null);
  const [error, setError] = useState("");
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const confirmSourceRef = useRef<HTMLElement | null>(null);

  const finishSuccess = useCallback(
    async (scope: AccountExitScope) => {
      await clearLocalSessionArtifacts();
      notifyAccountSessionExit(scope);
      router.push(`/account/signed-out?scope=${scope}${signInMode === "admin" ? "&mode=admin" : ""}`);
      router.refresh();
    },
    [router, signInMode],
  );

  const exitCurrent = useCallback(async () => {
    if (!tryBeginAccountExit("current")) return;
    setError("");
    setPending("current");
    try {
      await postLogoutCurrentDevice();
      await finishSuccess("current");
    } catch (caught) {
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось выйти из аккаунта",
      );
    } finally {
      setPending(null);
      endAccountExit();
    }
  }, [finishSuccess]);

  const openConfirmAll = useCallback((source?: HTMLElement | null) => {
    confirmSourceRef.current = source ?? null;
    setError("");
    setConfirmAllOpen(true);
  }, []);

  const closeConfirmAll = useCallback(() => {
    setConfirmAllOpen(false);
    const source = confirmSourceRef.current;
    confirmSourceRef.current = null;
    source?.focus({ preventScroll: true });
  }, []);

  const confirmExitAll = useCallback(async () => {
    if (!tryBeginAccountExit("all")) return;
    setError("");
    setPending("all");
    try {
      await postLogoutAllDevices();
      setConfirmAllOpen(false);
      await finishSuccess("all");
    } catch (caught) {
      setError(
        caught instanceof RemcardApiError
          ? caught.message
          : "Не удалось завершить сеансы на всех устройствах",
      );
    } finally {
      setPending(null);
      endAccountExit();
    }
  }, [finishSuccess]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ACCOUNT_SESSION_BROADCAST || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as { scope?: AccountExitScope };
        if (parsed.scope === "all" || parsed.scope === "current") {
          router.push(`/account/signed-out?scope=${parsed.scope}${signInMode === "admin" ? "&mode=admin" : ""}`);
          router.refresh();
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [router, signInMode]);

  const clearError = useCallback(() => setError(""), []);

  return {
    pending,
    error,
    confirmAllOpen,
    exitCurrent,
    openConfirmAll,
    closeConfirmAll,
    confirmExitAll,
    clearError,
  };
}
