"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  fetchObserverReferredAppealDetail,
  type ObserverAppealDetailFetchErrorCode,
} from "@/lib/clients-parity/fetch-observer-appeal-detail";
import type { ObserverPartnerMeta, ObserverReferredAppeal } from "@/lib/clients-parity/types";
import { ObserverClientDetailView } from "./ObserverClientDetailView";
import { ObserverClientDetailMissing } from "./ObserverClientDetailMissing";
import type { ObserverClientBackFrom } from "./observer-client-back";
import { resolveObserverClientBackLabel } from "./observer-client-back";
import {
  mapPublicPurchase,
  mapPublicTimeline,
  type ObserverClientDetailProps,
} from "./observer-client-detail-coordination";
import { formatObserverDateTime } from "@/lib/clients-parity/observer-display";
import styles from "./observer.module.css";

type Phase = "loading" | "ready" | "error" | "not_found";

type Props = {
  clientId: string;
  /** List-row snapshot for instant shell; detail GET is always attempted. */
  listAppeal?: ObserverReferredAppeal;
  listPartner?: ObserverPartnerMeta;
  backFrom: ObserverClientBackFrom;
  onBack: () => void;
};

/** P4 `ObserverClientDetailView` accepts extended props when P4 file is on disk. */
const ClientDetailView = ObserverClientDetailView as (
  props: ObserverClientDetailProps,
) => ReactNode;

export function ObserverClientDetailHost({
  clientId,
  listAppeal,
  listPartner,
  backFrom,
  onBack,
}: Props) {
  const backLabel = resolveObserverClientBackLabel(backFrom);
  const [phase, setPhase] = useState<Phase>("loading");
  const [detailAppeal, setDetailAppeal] = useState<ObserverReferredAppeal | null>(null);
  const [detailPartner, setDetailPartner] = useState<ObserverPartnerMeta | null>(null);
  const [publicTimeline, setPublicTimeline] = useState<ReturnType<typeof mapPublicTimeline> | undefined>(
    undefined,
  );
  const [purchase, setPurchase] = useState<ReturnType<typeof mapPublicPurchase> | undefined>(
    undefined,
  );
  const [error, setError] = useState<{
    code: ObserverAppealDetailFetchErrorCode;
    message: string;
    retryable: boolean;
  } | null>(null);
  const [loadGeneration, setLoadGeneration] = useState(0);

  const applyDetail = useCallback(
    (res: Awaited<ReturnType<typeof fetchObserverReferredAppealDetail>>) => {
      if (res.ok) {
        setDetailAppeal(res.appeal);
        setDetailPartner(res.partner);
        setPublicTimeline(mapPublicTimeline(res.timeline));
        setPurchase(mapPublicPurchase(res.purchase));
        setError(null);
        setPhase("ready");
        return;
      }
      if (res.code === "NOT_FOUND") {
        setPhase("not_found");
        setError(null);
        return;
      }
      if (res.code === "BLOCKED_CONTRACT") {
        setPhase("error");
        setError({ code: res.code, message: res.message, retryable: false });
        return;
      }
      setPhase("error");
      setError({
        code: res.code,
        message: res.message,
        retryable: res.retryable,
      });
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setPhase("loading");
    setError(null);
    setPublicTimeline(undefined);
    setPurchase(undefined);

    void fetchObserverReferredAppealDetail(clientId, { signal: controller.signal }).then((res) => {
      if (cancelled) return;
      applyDetail(res);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [clientId, loadGeneration, applyDetail]);

  if (phase === "not_found") {
    return (
      <ObserverClientDetailMissing
        clientId={clientId}
        backFrom={backFrom}
        backLabel={backLabel}
        onBack={onBack}
      />
    );
  }

  const shellAppeal = detailAppeal ?? listAppeal;
  const shellPartner = detailPartner ?? listPartner;

  if (phase === "error" && error) {
    return (
      <div className={styles.section} data-testid="ca-observer-client-load-error">
        <button
          type="button"
          className={styles.backBtn}
          data-testid="ca-clients-back"
          onClick={onBack}
        >
          {backLabel}
        </button>
        <section className={styles.blocked} data-testid="ca-observer-client-error" aria-live="polite">
          <h2>Не удалось загрузить направление</h2>
          <p className={styles.mutedSmall}>
            <strong>{error.code}</strong> — {error.message}
          </p>
          {error.retryable ? (
            <button
              type="button"
              className={styles.primaryBtn}
              data-ca-action="observer:retry-detail"
              onClick={() => setLoadGeneration((n) => n + 1)}
            >
              Повторить
            </button>
          ) : null}
        </section>
      </div>
    );
  }

  if (!shellAppeal && phase === "loading") {
    return (
      <div className={styles.section} data-testid="ca-observer-client-loading">
        <button
          type="button"
          className={styles.backBtn}
          data-testid="ca-clients-back"
          onClick={onBack}
        >
          {backLabel}
        </button>
        <p data-testid="ca-observer-client-page" data-ca-state="loading">
          Загрузка направления…
        </p>
      </div>
    );
  }

  if (!shellAppeal) {
    return (
      <ObserverClientDetailMissing
        clientId={clientId}
        backFrom={backFrom}
        backLabel={backLabel}
        onBack={onBack}
      />
    );
  }

  if (phase === "ready") {
    const timelineRows = publicTimeline ?? [];
    return (
      <div data-testid="ca-observer-client-detail-host">
        <ClientDetailView
          appeal={shellAppeal}
          partner={shellPartner}
          publicTimeline={timelineRows}
          purchase={purchase ?? null}
          onBack={onBack}
          backFrom={backFrom}
          backLabel={backLabel}
        />
        <section data-testid="ca-observer-client-public-timeline" aria-label="Публичная хронология">
          {timelineRows.length ? (
            <ol className={styles.personalRows}>
              {timelineRows.map((row, i) => (
                <li key={`${row.at}-${i}`}>
                  <time dateTime={row.at}>{formatObserverDateTime(row.at)}</time>
                  <p>{row.text}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.mutedSmall}>Публичных событий пока нет.</p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div data-testid="ca-observer-client-detail-host">
      <ClientDetailView
        appeal={shellAppeal}
        partner={shellPartner}
        onBack={onBack}
        backFrom={backFrom}
        backLabel={backLabel}
      />
      <p className={styles.mutedSmall} data-testid="ca-observer-client-detail-pending">
        Обновление данных…
      </p>
    </div>
  );
}
