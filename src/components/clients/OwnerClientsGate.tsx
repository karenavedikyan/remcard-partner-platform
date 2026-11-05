"use client";

import { useCabinetPresentation } from "@/components/layout/CabinetPresentationContext";
import { useBusinessSectionDispatch } from "@/lib/business-workplace/use-business-section-dispatch";
import { Button } from "@/components/ui/Button";
import styles from "@/components/agent-r03/agent-r03.module.css";
import {
  OwnerClientsModeProvider,
  type OwnerClientsAccessMode,
} from "@/components/clients/OwnerClientsModeContext";
export type { OwnerClientsAccessMode };

export function OwnerClientsGate({
  children,
  canLinkOnboardingHistory: canLinkOnboardingHistoryFromPage,
}: {
  children: React.ReactNode;
  canLinkOnboardingHistory?: boolean;
}) {
  const presentation = useCabinetPresentation();
  const { loading, error, decision } = useBusinessSectionDispatch({
    surface: "clients",
    presentation,
  });

  if (loading) return <p className={styles.loading}>Загрузка…</p>;
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

  let mode: OwnerClientsAccessMode | null = null;
  let businessPartnerType: "STORE" | "COMPANY" | undefined;
  let canLinkOnboardingHistory: boolean | undefined = canLinkOnboardingHistoryFromPage;

  if (decision?.kind === "agent-r03") {
    mode = "agent";
  } else if (decision?.kind === "specialist-r06") {
    mode = "specialist";
    canLinkOnboardingHistory = false;
  } else if (decision?.kind === "business") {
    mode = "business";
    businessPartnerType = decision.partnerType;
  }

  if (!mode) {
    return (
      <p className={styles.empty}>
        Раздел «Клиенты» недоступен для текущего кабинета.
      </p>
    );
  }
  return (
    <OwnerClientsModeProvider
      mode={mode}
      businessPartnerType={businessPartnerType}
      canLinkOnboardingHistory={canLinkOnboardingHistory}
    >
      {children}
    </OwnerClientsModeProvider>
  );
}
