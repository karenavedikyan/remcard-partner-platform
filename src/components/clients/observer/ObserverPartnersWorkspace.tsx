"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createObserverPersonalPersistenceBridge } from "./createObserverPersonalPersistenceBridge";
import {
  fetchObserverReferredAppeals,
  type ObserverAppealsFetchErrorCode,
} from "@/lib/clients-parity/fetch-observer-appeals";
import type { ObserverPartnerMeta, ObserverPersonalMeta, ObserverReferredAppeal } from "@/lib/clients-parity/types";
import {
  ObserverPartnersListView,
  type ObserverDataContractState,
  type ObserverPersonalPersistenceCallbacks,
} from "./ObserverPartnersListView";
import styles from "./observer.module.css";

type LoadPhase = "loading" | "blocked" | "error" | "ready";

type LoadError = {
  code: ObserverAppealsFetchErrorCode;
  message: string;
  retryable: boolean;
};

type Props = {
  showHeading?: boolean;
  /** Wired by parent from П5 personal API adapter when available. */
  personalPersistence?: ObserverPersonalPersistenceCallbacks;
};

export function ObserverPartnersWorkspace({ showHeading = true, personalPersistence }: Props) {
  const [loadPhase, setLoadPhase] = useState<LoadPhase>("loading");
  const [blocker, setBlocker] = useState<{
    id: string;
    message: string;
    routes: string[];
  } | null>(null);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [appeals, setAppeals] = useState<ObserverReferredAppeal[]>([]);
  const [partners, setPartners] = useState<ObserverPartnerMeta[]>([]);
  const [personalMeta, setPersonalMeta] = useState<Record<string, ObserverPersonalMeta>>({});
  const overlayVersionsRef = useRef<Record<string, number>>({});
  const [loadGeneration, setLoadGeneration] = useState(0);

  const defaultPersonalPersistence = useMemo(
    () =>
      createObserverPersonalPersistenceBridge(
        () => overlayVersionsRef.current,
        (patch) => {
          overlayVersionsRef.current = { ...overlayVersionsRef.current, ...patch };
        },
      ),
    [],
  );
  const persistence = personalPersistence ?? defaultPersonalPersistence;

  const applyResult = useCallback((res: Awaited<ReturnType<typeof fetchObserverReferredAppeals>>) => {
    if (res.ok) {
      setAppeals(res.appeals);
      setPartners(res.partners);
      setPersonalMeta(res.personalMeta);
      overlayVersionsRef.current = res.overlayVersions;
      setLoadPhase("ready");
      setBlocker(null);
      setLoadError(null);
      return;
    }

    if (res.code === "BLOCKED_CONTRACT") {
      setLoadPhase("blocked");
      setBlocker({
        id: res.blockerId ?? "BLK-OBSERVER-REFERRED",
        message: res.message,
        routes: res.missingRoutes ?? [],
      });
      setLoadError(null);
      return;
    }

    setLoadPhase("error");
    setLoadError({
      code: res.code,
      message: res.message,
      retryable: res.retryable,
    });
    setBlocker(null);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoadPhase("loading");
    setLoadError(null);

    void fetchObserverReferredAppeals({ signal: controller.signal }).then((res) => {
      if (cancelled) return;
      applyResult(res);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [applyResult, loadGeneration]);

  const retryLoad = useCallback(() => {
    setLoadError(null);
    setLoadGeneration((n) => n + 1);
  }, []);

  const onPersonalMetaUpdated = useCallback((next: Record<string, ObserverPersonalMeta>) => {
    setPersonalMeta((prev) => {
      const merged = { ...prev };
      for (const [id, meta] of Object.entries(next)) {
        merged[id] = { ...merged[id], ...meta };
      }
      return merged;
    });
  }, []);

  const dataContract: ObserverDataContractState = useMemo(() => {
    if (loadPhase === "blocked" && blocker) {
      return {
        status: "blocked",
        blockerId: blocker.id,
        message: blocker.message,
        missingRoutes: blocker.routes,
      };
    }
    return { status: "ready" };
  }, [blocker, loadPhase]);

  if (loadPhase === "loading") {
    return <p data-testid="ca-observer-loading">Загрузка…</p>;
  }

  if (loadPhase === "error" && loadError) {
    return (
      <section className={styles.blocked} data-testid="ca-observer-load-error" aria-live="polite">
        <h2>Не удалось загрузить направления</h2>
        <p>
          <strong>{loadError.code}</strong> — {loadError.message}
        </p>
        {loadError.retryable ? (
          <button
            type="button"
            className={styles.primaryBtn}
            data-ca-action="observer:retry-load"
            onClick={retryLoad}
          >
            Повторить
          </button>
        ) : null}
      </section>
    );
  }

  if (loadPhase === "blocked") {
    return (
      <ObserverPartnersListView
        showHeading={showHeading}
        appeals={[]}
        partners={[]}
        dataContract={dataContract}
        displayPersonalMeta={{}}
        personalPersistence={persistence}
        onPersonalMetaUpdated={onPersonalMetaUpdated}
      />
    );
  }

  return (
    <ObserverPartnersListView
      showHeading={showHeading}
      appeals={appeals}
      partners={partners}
      dataContract={dataContract}
      displayPersonalMeta={personalMeta}
      personalPersistence={persistence}
      onPersonalMetaUpdated={onPersonalMetaUpdated}
    />
  );
}
