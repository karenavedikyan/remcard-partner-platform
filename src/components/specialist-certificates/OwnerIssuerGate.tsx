"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { fetchAgentR03Status } from "@/lib/agent-r03/api";
import { fetchSpecialistR06Status } from "@/lib/specialist-r06/api";
import { mapRecommendationsPathToAgentCertificates } from "@/lib/specialist-certificates/recommendationsRedirect";
import { shouldRenderBusinessOwnerHome } from "@/lib/business-home/gate";
import type { AuthUser } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import styles from "@/components/agent-r03/agent-r03.module.css";
import {
  OwnerIssuerModeProvider,
  type OwnerIssuerAccessMode,
} from "@/components/specialist-certificates/OwnerIssuerModeContext";

export function OwnerIssuerGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<OwnerIssuerAccessMode | null>(null);
  const [businessPartnerType, setBusinessPartnerType] = useState<"STORE" | "COMPANY" | undefined>(
    undefined,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetchAgentR03Status(),
      fetchSpecialistR06Status(),
      remcardFetch<{ user: AuthUser }>("/api/auth/me"),
    ])
      .then(([r03, r06, mePayload]) => {
        if (cancelled) return;
        const me = mePayload.user;
        const r03Eligible = Boolean(r03.featureEnabled && r03.eligible);
        const r06Eligible = Boolean(r06.featureEnabled && r06.eligible);
        if (r03Eligible) {
          const search = searchParams.toString();
          const q = search ? `?${search}` : "";
          router.replace(mapRecommendationsPathToAgentCertificates(pathname, q));
          return;
        }
        if (r06Eligible) {
          setMode("specialist");
          return;
        }
        if (shouldRenderBusinessOwnerHome(me)) {
          setMode("business");
          if (me.partnerType === "STORE" || me.partnerType === "COMPANY") {
            setBusinessPartnerType(me.partnerType);
          }
          return;
        }
        setMode("legacy");
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
  }, [pathname, router, searchParams]);

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
  if (!mode) return null;
  return (
    <OwnerIssuerModeProvider mode={mode} businessPartnerType={businessPartnerType}>
      {children}
    </OwnerIssuerModeProvider>
  );
}
