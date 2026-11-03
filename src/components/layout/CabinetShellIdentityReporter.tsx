"use client";

import { useEffect } from "react";
import { useCabinetShellStableContext } from "@/components/layout/cabinet-shell-context";

type CabinetShellIdentityReporterProps = {
  freshShellContextToken: string;
};

/** Reports page-segment shell identity without hiding sibling UI (SessionGate). */
export function CabinetShellIdentityReporter({
  freshShellContextToken,
}: CabinetShellIdentityReporterProps) {
  const shell = useCabinetShellStableContext();
  const shellContextToken = shell?.shellContextToken;
  const acknowledgeShellContextMatch = shell?.acknowledgeShellContextMatch;
  const requestShellRefreshIfStale = shell?.requestShellRefreshIfStale;

  useEffect(() => {
    if (!shellContextToken || !acknowledgeShellContextMatch || !requestShellRefreshIfStale) {
      return;
    }
    if (shellContextToken === freshShellContextToken) {
      acknowledgeShellContextMatch();
      return;
    }
    requestShellRefreshIfStale(freshShellContextToken);
  }, [
    shellContextToken,
    freshShellContextToken,
    acknowledgeShellContextMatch,
    requestShellRefreshIfStale,
  ]);

  return null;
}
