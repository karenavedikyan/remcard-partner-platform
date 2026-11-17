"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCabinetPresentation } from "@/components/layout/CabinetPresentationContext";
import { useBusinessSectionDispatch } from "@/lib/business-workplace/use-business-section-dispatch";
import { canIssueCertificates, certificateStaffBranches, isBranchStaffContext } from "@/lib/certificate-issuance-access";
import { mapRecommendationsPathToAgentCertificates } from "@/lib/specialist-certificates/recommendationsRedirect";
import { Button } from "@/components/ui/Button";
import styles from "@/components/agent-r03/agent-r03.module.css";
import {
  OwnerIssuerModeProvider,
  type OwnerIssuerAccessMode,
} from "@/components/specialist-certificates/OwnerIssuerModeContext";

export function OwnerIssuerGate({
  children,
  canLinkOnboardingHistory: canLinkOnboardingHistoryFromPage,
}: {
  children: React.ReactNode;
  canLinkOnboardingHistory?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const presentation = useCabinetPresentation();
  const { loading, error, decision, proContext } = useBusinessSectionDispatch({
    surface: "issuer",
    presentation,
  });

  useEffect(() => {
    if (decision?.kind !== "agent-r03") return;
    const search = searchParams.toString();
    const q = search ? `?${search}` : "";
    router.replace(mapRecommendationsPathToAgentCertificates(pathname, q));
  }, [decision, pathname, router, searchParams]);

  if (loading || decision?.kind === "agent-r03") {
    return <p className={styles.loading}>Загрузка…</p>;
  }
  if (error) {
    return (
      <div className={styles.errorBlock}>
        <p role="alert">{error}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Повторить
        </Button>
      </div>
    );
  }

  let mode: OwnerIssuerAccessMode | null = null;
  let businessPartnerType: "STORE" | "COMPANY" | undefined;
  let employeeIssuer: { canIssue: boolean; employerLabel: string | null } | null = null;
  let canLinkOnboardingHistory: boolean | undefined = canLinkOnboardingHistoryFromPage;

  if (decision?.kind === "specialist-r06") {
    mode = "specialist";
    canLinkOnboardingHistory = false;
  } else if (decision?.kind === "business") {
    mode = "business";
    businessPartnerType = decision.partnerType;
  } else if (decision?.kind === "employee-issuer") {
    // Employee without a Branch: the employer's issuer workspace, read-only except issuing.
    mode = "business";
    businessPartnerType = decision.partnerType;
    canLinkOnboardingHistory = false;
    employeeIssuer = { canIssue: decision.canIssue, employerLabel: decision.employerLabel ?? "Работодатель" };
  } else if (decision?.kind === "legacy-issuer") {
    mode = "legacy";
  }

  if (!mode) return null;
  return (
    <OwnerIssuerModeProvider
      mode={mode}
      businessPartnerType={businessPartnerType}
      canLinkOnboardingHistory={canLinkOnboardingHistory}
      canIssueCertificates={
        employeeIssuer ? employeeIssuer.canIssue : mode === "business" ? canIssueCertificates(proContext) : undefined
      }
      isBranchStaff={
        employeeIssuer ? true : mode === "business" ? isBranchStaffContext(proContext) : undefined
      }
      staffBranches={employeeIssuer ? [] : mode === "business" ? certificateStaffBranches(proContext) : undefined}
      employerLabel={employeeIssuer?.employerLabel}
    >
      {children}
    </OwnerIssuerModeProvider>
  );
}
