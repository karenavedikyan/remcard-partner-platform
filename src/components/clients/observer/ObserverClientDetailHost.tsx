"use client";

import { useEffect, useState } from "react";
import {
  fetchObserverReferredAppealDetail,
  type ObserverAppealDetailFetchResult,
} from "@/lib/clients-parity/fetch-observer-appeal-detail";
import type { ObserverPartnerMeta, ObserverReferredAppeal } from "@/lib/clients-parity/types";
import {
  ObserverClientDetailView,
  type ObserverClientBackFrom,
} from "./ObserverClientDetailView";
import { k2ReferredAppealDetailToReadySlice } from "./observer-client-detail-contract";

type Props = {
  clientId: string;
  listAppeal?: ObserverReferredAppeal;
  listPartner?: ObserverPartnerMeta;
  backFrom: ObserverClientBackFrom;
  onBack: () => void;
};

/** Fetch only. P4 owns all detail rendering and its public-field contract. */
export function ObserverClientDetailHost({ clientId, backFrom, onBack }: Props) {
  const [generation, setGeneration] = useState(0);
  const [loaded, setLoaded] = useState<{
    clientId: string;
    generation: number;
    result: ObserverAppealDetailFetchResult;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    void fetchObserverReferredAppealDetail(clientId, { signal: controller.signal })
      .then((result) => {
        if (current) setLoaded({ clientId, generation, result });
      })
      .catch((error: unknown) => {
        if (!current || controller.signal.aborted) return;
        setLoaded({
          clientId, generation,
          result: {
            ok: false, code: "NETWORK", retryable: true,
            message: error instanceof Error ? error.message : "Не удалось загрузить направление.",
          },
        });
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [clientId, generation]);

  const chrome = { backFrom, onBack };
  if (!loaded || loaded.clientId !== clientId || loaded.generation !== generation) {
    return <ObserverClientDetailView status="loading" {...chrome} />;
  }
  const result = loaded.result;
  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      return <ObserverClientDetailView status="missing" clientId={clientId} {...chrome} />;
    }
    return <ObserverClientDetailView status="error" message={result.message}
      onRetry={result.retryable ? () => setGeneration((n) => n + 1) : undefined} {...chrome} />;
  }
  const ready = k2ReferredAppealDetailToReadySlice({
    appeal: result.appeal,
    receivingPartner: result.partner,
    timeline: result.timeline,
    purchase: result.purchase,
  });
  return <ObserverClientDetailView status="ready" {...ready} {...chrome} />;
}
