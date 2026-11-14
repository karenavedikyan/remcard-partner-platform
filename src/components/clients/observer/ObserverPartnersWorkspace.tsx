"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchObserverReferredAppeals } from "@/lib/clients-parity/fetch-observer-appeals";
import type { ObserverPartnerMeta, ObserverReferredAppeal } from "@/lib/clients-parity/types";
import {
  ObserverPartnersListView,
  type ObserverDataContractState,
} from "./ObserverPartnersListView";

export function ObserverPartnersWorkspace({
  showHeading = true,
  directionProbe,
}: {
  showHeading?: boolean;
  directionProbe?: "at-partners";
}) {
  const [loadState, setLoadState] = useState<"loading" | "blocked" | "ready">("loading");
  const [blocker, setBlocker] = useState<{
    id: string;
    message: string;
    routes: string[];
  } | null>(null);
  const [appeals, setAppeals] = useState<ObserverReferredAppeal[]>([]);
  const [partners, setPartners] = useState<ObserverPartnerMeta[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchObserverReferredAppeals().then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setLoadState("blocked");
        setBlocker({
          id: res.blockerId,
          message: res.message,
          routes: res.missingRoutes,
        });
        return;
      }
      setAppeals(res.appeals);
      setPartners(res.partners);
      setLoadState("ready");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dataContract: ObserverDataContractState = useMemo(() => {
    if (loadState === "blocked" && blocker) {
      return {
        status: "blocked",
        blockerId: blocker.id,
        message: blocker.message,
        missingRoutes: blocker.routes,
      };
    }
    return { status: "ready" };
  }, [blocker, loadState]);

  if (loadState === "loading") {
    return <p data-testid="ca-observer-loading">Загрузка…</p>;
  }

  return (
    <ObserverPartnersListView
      showHeading={showHeading}
      appeals={appeals}
      partners={partners}
      dataContract={dataContract}
      loadState={loadState}
      directionProbe={directionProbe}
    />
  );
}
