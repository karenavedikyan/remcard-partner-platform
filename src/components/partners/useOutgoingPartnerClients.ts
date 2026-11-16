"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchObserverReferredAppeals } from "@/lib/clients-parity/fetch-observer-appeals";
import type { ObserverPersonalMeta, ObserverReferredAppeal } from "@/lib/clients-parity/types";

export type OutgoingClientsState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; appeals: ObserverReferredAppeal[]; personalMeta: Record<string, ObserverPersonalMeta> }
  | { phase: "blocked" | "error"; message: string; retryable: boolean };

/**
 * Your own referred clients at one receiving partner. Uses the same authorized
 * observer fetch as «Клиенты → У партнёров» and keeps only that partner's rows.
 */
export function useOutgoingPartnerClients(partnerId: string | null, enabled: boolean) {
  const [state, setState] = useState<OutgoingClientsState>({ phase: "idle" });
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    if (!enabled || !partnerId) {
      setState({ phase: "idle" });
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setState({ phase: "loading" });
    void fetchObserverReferredAppeals({ signal: controller.signal })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setState({
            phase: "ready",
            appeals: res.appeals.filter((appeal) => appeal.receivingPartnerId === partnerId),
            personalMeta: res.personalMeta,
          });
          return;
        }
        setState({
          phase: res.code === "BLOCKED_CONTRACT" ? "blocked" : "error",
          message: res.message,
          retryable: res.retryable,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ phase: "error", message: "Не удалось загрузить клиентов.", retryable: true });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, partnerId, generation]);

  const reload = useCallback(() => setGeneration((n) => n + 1), []);
  return { state, reload };
}
