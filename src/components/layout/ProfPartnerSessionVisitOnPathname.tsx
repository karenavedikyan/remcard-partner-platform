"use client";

import { usePathname } from "next/navigation";
import { ProfPartnerSessionVisit } from "@/components/layout/ProfPartnerSessionVisit";

/** Re-mount visit tracker on pathname change (persistent shell no longer remounts AppShell). */
export function ProfPartnerSessionVisitOnPathname() {
  const pathname = usePathname();
  return <ProfPartnerSessionVisit key={pathname} />;
}
