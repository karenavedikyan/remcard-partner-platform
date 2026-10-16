"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RemcardApiError } from "@/lib/api-client";
import {
  ACCOUNT_SESSION_BROADCAST,
  clearLocalSessionArtifacts,
  notifyAccountSessionExit,
  postLogoutAllDevices,
  postLogoutCurrentDevice,
  type AccountExitScope,
} from "@/lib/account-session-exit";

export function useAccountSessionExit() {
  const router = useRouter();
  const [pending, setPending] = useState<AccountExitScope | null>(null);
  const [error, setError] = useState("");
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const confirmSourceRef = useRef<HTMLElement | null>(null);

  const finishSuccess = useCallback(
    (scope: AccountExitScope) => {
      notifyAccountSessionExit(scope);
      router.push(`/account/signed-out?scope=${scope}`);
      router.refresh();
    },
    [router],
  );

  const exitCurrent = useCallback(async () => {
    if (pending) return;
    setError("");
    setPending("current");
    try {
      await clearLocalSessionArtifacts();
      await postLogoutCurrentDevice();
      finishSuccess("current");
    } catch (caught) {
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось выйти из аккаунта",
      );
    } finally {
      setPending(null);
    }
  }, [finishSuccess, pending]);

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
    if (pending) return;
    setError("");
    setPending("all");
    try {
      await clearLocalSessionArtifacts();
      await postLogoutAllDevices();
      setConfirmAllOpen(false);
      finishSuccess("all");
    } catch (caught) {
      setError(
        caught instanceof RemcardApiError
          ? caught.message
          : "Не удалось завершить сеансы на всех устройствах",
      );
    } finally {
      setPending(null);
    }
  }, [finishSuccess, pending]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ACCOUNT_SESSION_BROADCAST || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as { scope?: AccountExitScope };
        if (parsed.scope === "all" || parsed.scope === "current") {
          router.push(`/account/signed-out?scope=${parsed.scope}`);
          router.refresh();
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [router]);

  return {
    pending,
    error,
    confirmAllOpen,
    exitCurrent,
    openConfirmAll,
    closeConfirmAll,
    confirmExitAll,
  };
}
