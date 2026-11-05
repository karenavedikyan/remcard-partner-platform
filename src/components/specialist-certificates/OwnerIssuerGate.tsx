"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { fetchAgentR03Status } from "@/lib/agent-r03/api";
import { fetchSpecialistR06Status } from "@/lib/specialist-r06/api";
import { mapRecommendationsPathToAgentCertificates } from "@/lib/specialist-certificates/recommendationsRedirect";
import { resolveBusinessSectionDispatch } from "@/lib/business-workplace/dispatch-priority";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser } from "@/lib/types";
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
  const [mode, setMode] = useState<OwnerIssuerAccessMode | null>(null);
  const [businessPartnerType, setBusinessPartnerType] = useState<"STORE" | "COMPANY" | undefined>(
    undefined,
  );
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
          surface: "issuer",
        });

        if (decision.kind === "agent-r03") {
          const search = searchParams.toString();
          const q = search ? `?${search}` : "";
          router.replace(mapRecommendationsPathToAgentCertificates(pathname, q));
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
        if (decision.kind === "legacy-issuer") {
          setMode("legacy");
          setCanLinkOnboardingHistory(canLinkOnboardingHistoryFromPage);
          return;
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof RemcardApiError ? caught.message : "Не удалось проверить доступ",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canLinkOnboardingHistoryFromPage, pathname, router, searchParams]);

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
    <OwnerIssuerModeProvider
      mode={mode}
      businessPartnerType={businessPartnerType}
      canLinkOnboardingHistory={canLinkOnboardingHistory}
    >
      {children}
    </OwnerIssuerModeProvider>
  );
}
