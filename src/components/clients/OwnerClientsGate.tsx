"use client";

import { useEffect, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { remcardFetch } from "@/lib/api-client";
import { fetchAgentR03Status } from "@/lib/agent-r03/api";
import { fetchSpecialistR06Status } from "@/lib/specialist-r06/api";
import { resolveBusinessOwnerClientsEligibility } from "@/lib/business-clients/gate";
import type { AuthUser } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import styles from "@/components/agent-r03/agent-r03.module.css";
import {
  OwnerClientsModeProvider,
  type OwnerClientsAccessMode,
} from "@/components/clients/OwnerClientsModeContext";

export type { OwnerClientsAccessMode };

export function OwnerClientsGate({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<OwnerClientsAccessMode | null>(null);
  const [businessPartnerType, setBusinessPartnerType] = useState<
    "STORE" | "COMPANY" | undefined
  >(undefined);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetchAgentR03Status(),
      fetchSpecialistR06Status(),
      remcardFetch<{ user: AuthUser }>("/api/auth/me"),
      remcardFetch<{ role: string }>("/api/pro/context"),
    ])
      .then(([r03, r06, mePayload, proCtx]) => {
        if (cancelled) return;
        if (r03.featureEnabled && r03.eligible) {
          setMode("agent");
          return;
        }
        if (r06.featureEnabled && r06.eligible) {
          setMode("specialist");
          return;
        }
        const business = resolveBusinessOwnerClientsEligibility({
          user: mePayload.user,
          proContextRole: proCtx.role,
        });
        if (business.eligible) {
          setMode("business");
          setBusinessPartnerType(business.partnerType);
          return;
        }
        setMode(null);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            caught instanceof RemcardApiError ? caught.message : "Не удалось проверить доступ",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    <OwnerClientsModeProvider mode={mode} businessPartnerType={businessPartnerType}>
      {children}
    </OwnerClientsModeProvider>
  );
}
