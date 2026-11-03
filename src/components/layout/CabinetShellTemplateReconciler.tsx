"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useCabinetShellContext } from "@/components/layout/cabinet-shell-context";
import { CabinetPageDetailLoadingSkeleton } from "@/components/layout/CabinetPageLoadingSkeleton";

type CabinetShellTemplateReconcilerProps = {
  freshShellContextToken: string;
  children: ReactNode;
};

export function CabinetShellTemplateReconciler({
  freshShellContextToken,
  children,
}: CabinetShellTemplateReconcilerProps) {
  const shell = useCabinetShellContext();

  useEffect(() => {
    if (!shell) {
      return;
    }
    if (shell.shellContextToken === freshShellContextToken) {
      shell.acknowledgeShellContextMatch();
      return;
    }
    shell.requestShellRefreshIfStale(freshShellContextToken);
  }, [shell, freshShellContextToken]);

  if (!shell) {
    return children;
  }

  if (shell.shellContextToken === freshShellContextToken) {
    return children;
  }

  return <CabinetPageDetailLoadingSkeleton />;
}
