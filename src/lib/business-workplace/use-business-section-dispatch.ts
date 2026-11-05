"use client";

import { useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { fetchAgentR03Status } from "@/lib/agent-r03/api";
import { fetchSpecialistR06Status } from "@/lib/specialist-r06/api";
import type { CabinetPresentationSnapshot } from "@/lib/cabinet-presentation/types";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser } from "@/lib/types";
import {
  resolveBusinessSectionDispatch,
  type BusinessSectionDispatchDecision,
} from "./dispatch-priority";

export function useBusinessSectionDispatch(input: {
  surface: "clients" | "issuer";
  presentation: CabinetPresentationSnapshot | null;
}): {
  loading: boolean;
  error: string;
  decision: BusinessSectionDispatchDecision | null;
} {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState<BusinessSectionDispatchDecision | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const [r03, r06, mePayload, proCtxFallback] = await Promise.all([
          fetchAgentR03Status(),
          fetchSpecialistR06Status(),
          remcardFetch<{ user: AuthUser }>("/api/auth/me"),
          input.presentation
            ? Promise.resolve(null)
            : remcardFetch<ProContextSnapshot>("/api/pro/context").catch(() => null),
        ]);
        if (cancelled) return;

        const proContext =
          input.presentation?.proContext ?? proCtxFallback;
        const contextReady =
          input.presentation?.contextReady ??
          Boolean(proCtxFallback && proCtxFallback.role?.trim());

        const next = resolveBusinessSectionDispatch({
          user: mePayload.user,
          proContext,
          contextReady,
          r03Eligible: Boolean(r03.featureEnabled && r03.eligible),
          r06Eligible: Boolean(r06.featureEnabled && r06.eligible),
          surface: input.surface,
        });
        setDecision(next);
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
  }, [input.presentation, input.surface]);

  return { loading, error, decision };
}
