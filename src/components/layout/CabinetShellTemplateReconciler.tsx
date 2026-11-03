"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useCabinetShellStableContext } from "@/components/layout/cabinet-shell-context";
import { CabinetPageDetailLoadingSkeleton } from "@/components/layout/CabinetPageLoadingSkeleton";
import { CabinetShellIdentityReconcileDeadEnd } from "@/components/layout/CabinetShellIdentityReconcileDeadEnd";

type CabinetShellTemplateReconcilerProps = {
  freshShellContextToken: string;
  children: ReactNode;
};

export function CabinetShellTemplateReconciler({
  freshShellContextToken,
  children,
}: CabinetShellTemplateReconcilerProps) {
  const shell = useCabinetShellStableContext();
  const shellContextToken = shell?.shellContextToken;
  const acknowledgeShellContextMatch = shell?.acknowledgeShellContextMatch;
  const requestShellRefreshIfStale = shell?.requestShellRefreshIfStale;
  const isShellIdentityRefreshExhausted = shell?.isShellIdentityRefreshExhausted;
  const [identityRefreshAttempted, setIdentityRefreshAttempted] = useState(false);

  useEffect(() => {
    setIdentityRefreshAttempted(false);
  }, [shellContextToken, freshShellContextToken]);

  useEffect(() => {
    if (!shellContextToken || !acknowledgeShellContextMatch || !requestShellRefreshIfStale) {
      return;
    }
    if (shellContextToken === freshShellContextToken) {
      acknowledgeShellContextMatch();
      setIdentityRefreshAttempted(false);
      return;
    }
    if (isShellIdentityRefreshExhausted?.(freshShellContextToken)) {
      setIdentityRefreshAttempted(true);
      return;
    }
    requestShellRefreshIfStale(freshShellContextToken);
    setIdentityRefreshAttempted(true);
  }, [
    shellContextToken,
    freshShellContextToken,
    acknowledgeShellContextMatch,
    requestShellRefreshIfStale,
    isShellIdentityRefreshExhausted,
  ]);

  if (!shell) {
    return children;
  }

  if (shellContextToken === freshShellContextToken) {
    return children;
  }

  if (identityRefreshAttempted) {
    return <CabinetShellIdentityReconcileDeadEnd />;
  }

  return <CabinetPageDetailLoadingSkeleton />;
}
