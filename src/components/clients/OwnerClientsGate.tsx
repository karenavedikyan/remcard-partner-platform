"use client";

import { useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { fetchAgentR03Status } from "@/lib/agent-r03/api";
import { fetchSpecialistR06Status } from "@/lib/specialist-r06/api";
import { resolveBusinessOwnerClientsEligibility } from "@/lib/business-clients/gate";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser } from "@/lib/types";
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
  const [mode, setMode] = useState<OwnerClientsAccessMode | null>(null);
  const [businessPartnerType, setBusinessPartnerType] = useState<
    "STORE" | "COMPANY" | undefined
  >(undefined);
  const [canLinkOnboardingHistory, setCanLinkOnboardingHistory] = useState<
    boolean | undefined
  >(undefined);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [r03, r06] = await Promise.all([
          fetchAgentR03Status(),
          fetchSpecialistR06Status(),
        ]);
        if (cancelled) return;
        if (r03.featureEnabled && r03.eligible) {
          setMode("agent");
          setCanLinkOnboardingHistory(canLinkOnboardingHistoryFromPage);
          return;
        }
        if (r06.featureEnabled && r06.eligible) {
          setMode("specialist");
          setCanLinkOnboardingHistory(false);
          return;
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof RemcardApiError ? caught.message : "Не удалось проверить доступ",
          );
        }
        return;
      }

      try {
        const [mePayload, proCtx] = await Promise.all([
          remcardFetch<{ user: AuthUser }>("/api/auth/me"),
          remcardFetch<ProContextSnapshot>("/api/pro/context"),
        ]);
        if (cancelled) return;
        const business = resolveBusinessOwnerClientsEligibility({
          user: mePayload.user,
          proContextRole: proCtx.role,
          proContext: proCtx,
          contextReady: true,
        });
        if (business.eligible) {
          setMode("business");
          setBusinessPartnerType(business.partnerType);
          setCanLinkOnboardingHistory(canLinkOnboardingHistoryFromPage);
          return;
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof RemcardApiError
              ? caught.message
              : "Не удалось проверить доступ к клиентам организации",
          );
        }
        return;
      }
      if (!cancelled) setMode(null);
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [canLinkOnboardingHistoryFromPage]);

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
