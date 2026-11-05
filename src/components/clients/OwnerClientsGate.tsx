"use client";

import { useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { fetchAgentR03Status } from "@/lib/agent-r03/api";
import { fetchSpecialistR06Status } from "@/lib/specialist-r06/api";
import { resolveBusinessSectionDispatch } from "@/lib/business-workplace/dispatch-priority";
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
        const [r03, r06, mePayload, proCtxResult] = await Promise.all([
          fetchAgentR03Status(),
          fetchSpecialistR06Status(),
          remcardFetch<{ user: AuthUser }>("/api/auth/me"),
          remcardFetch<ProContextSnapshot>("/api/pro/context").catch(() => null),
        ]);
        if (cancelled) return;

        const contextReady = proCtxResult != null;
        const decision = resolveBusinessSectionDispatch({
          user: mePayload.user,
          proContext: proCtxResult,
          contextReady,
          r03Eligible: Boolean(r03.featureEnabled && r03.eligible),
          r06Eligible: Boolean(r06.featureEnabled && r06.eligible),
          surface: "clients",
        });

        if (decision.kind === "agent-r03") {
          setMode("agent");
          setCanLinkOnboardingHistory(canLinkOnboardingHistoryFromPage);
          return;
        }
        if (decision.kind === "specialist-r06") {
          setMode("specialist");
          setCanLinkOnboardingHistory(false);
          return;
        }
        if (decision.kind === "business") {
          setMode("business");
          setBusinessPartnerType(decision.partnerType);
          setCanLinkOnboardingHistory(canLinkOnboardingHistoryFromPage);
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
