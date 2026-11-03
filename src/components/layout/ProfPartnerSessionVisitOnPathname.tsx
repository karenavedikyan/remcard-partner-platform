"use client";

import { usePathname } from "next/navigation";
import { ProfPartnerSessionVisit } from "@/components/layout/ProfPartnerSessionVisit";
import { useCabinetShellContext } from "@/components/layout/cabinet-shell-context";

/** Re-mount visit tracker on pathname or shell identity change (persistent layout). */
export function ProfPartnerSessionVisitOnPathname() {
  const pathname = usePathname();
  const shell = useCabinetShellContext();
  const shellToken = shell?.shellContextToken ?? "none";
  return <ProfPartnerSessionVisit key={`${shellToken}:${pathname}`} />;
}
