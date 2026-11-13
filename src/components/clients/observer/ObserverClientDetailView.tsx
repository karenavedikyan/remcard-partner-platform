"use client";

import {
  displayClientName,
  formatObserverDateTime,
  observerAppealStatusLabel,
} from "@/lib/clients-parity/observer-display";
import type { ObserverPartnerMeta, ObserverReferredAppeal } from "@/lib/clients-parity/types";
import { ReceivingAppealHistory } from "../receiving/ReceivingAppealHistory";
import {
  formatObserverPublicPurchaseKopecks,
  type K2ObserverPublicPurchase,
  type ObserverPublicTimelineEntry,
} from "./observer-client-detail-contract";
import styles from "./observer.module.css";

export type { ObserverPublicTimelineEntry } from "./observer-client-detail-contract";

/** Where the client detail was opened from (prototype back labels). */
export type ObserverClientBackFrom = "partner-clients" | "partners-list" | "flat-list";

export function resolveObserverClientBackLabel(
  backFrom?: ObserverClientBackFrom,
  backLabel?: string,
): string {
  if (backLabel) return backLabel;
  if (backFrom === "partner-clients") return "← К списку клиентов";
  if (backFrom === "partners-list") return "← К партнёрам";
  if (backFrom === "flat-list") return "← Назад к списку";
  return "← Назад";
}

/** Input slice P3 can derive from `nav` + `layout` without importing nav types. */
export type ObserverClientBackFromInput = {
  /** Set when `openClientPage(id, nav.partnerId)` was used (partner drill). */
  navPartnerId?: string;
  layout?: "partners" | "list";
};

export function resolveObserverClientBackFrom(
  input: ObserverClientBackFromInput,
): ObserverClientBackFrom {
  if (input.navPartnerId) return "partner-clients";
  if (input.layout === "list") return "flat-list";
  return "partners-list";
}

/** Stable name used by P3 shell (`ObserverPartnersListView`). */
export type ObserverClientNavSlice = { partnerId?: string };

export function observerClientBackFrom(
  clientNav: ObserverClientNavSlice,
  layout: "partners" | "list",
): ObserverClientBackFrom {
  return resolveObserverClientBackFrom({ navPartnerId: clientNav.partnerId, layout });
}

type ObserverClientDetailChromeProps = {
  onBack: () => void;
  backFrom?: ObserverClientBackFrom;
  backLabel?: string;
};

/** Legacy list shell — omit `status`; pass `publicTimeline` only after K2 GET. */
type ObserverClientDetailLegacyProps = ObserverClientDetailChromeProps & {
  status?: undefined;
  appeal: ObserverReferredAppeal;
  partner?: ObserverPartnerMeta;
  /** When omitted, timeline/purchase show contract blocker until P3 wires K2 GET. */
  publicTimeline?: ObserverPublicTimelineEntry[];
  purchase?: K2ObserverPublicPurchase | null;
  refusedReason?: string | null;
};

type ObserverClientDetailPageProps = ObserverClientDetailChromeProps &
  (
    | { status: "loading" }
    | { status: "missing"; clientId?: string }
    | { status: "error"; message: string; onRetry?: () => void }
    | {
        status: "ready";
        appeal: ObserverReferredAppeal;
        partner?: ObserverPartnerMeta;
        publicTimeline: ObserverPublicTimelineEntry[];
        purchase: K2ObserverPublicPurchase | null;
        refusedReason?: string | null;
      }
  );

export type ObserverClientDetailProps =
  | ObserverClientDetailLegacyProps
  | ObserverClientDetailPageProps;

function ObserverClientDetailBackButton({
  onBack,
  backFrom,
  backLabel,
}: ObserverClientDetailChromeProps) {
  return (
    <button
      type="button"
      className={styles.backBtn}
      data-ca-action="observer:back"
      data-testid="ca-clients-back"
      onClick={onBack}
    >
      {resolveObserverClientBackLabel(backFrom, backLabel)}
    </button>
  );
}

function ObserverClientDetailReadyBody({
  appeal,
  partner,
  publicTimeline,
  purchase,
  purchaseKnown,
  refusedReason,
}: {
  appeal: ObserverReferredAppeal;
  partner?: ObserverPartnerMeta;
  publicTimeline?: ObserverPublicTimelineEntry[];
  purchase?: K2ObserverPublicPurchase | null;
  /** When true, `purchase` came from K2 (including explicit null). */
  purchaseKnown: boolean;
  refusedReason?: string | null;
}) {
  const clientName = displayClientName(appeal);
  const interest = appeal.interest?.trim();
  const certificate = appeal.certificateId?.trim();

  return (
    <>
      <header className={styles.partnerPageHead}>
        {interest ? <p className={styles.mutedSmall}>{interest}</p> : null}
        <h2 id="ca-observer-client-title">{clientName}</h2>
      </header>
      <dl className={styles.detailGrid} aria-labelledby="ca-observer-client-title">
        <div>
          <dt>ID направления</dt>
          <dd>
            <code data-testid="ca-observer-appeal-id">{appeal.id}</code>
          </dd>
        </div>
        <div>
          <dt>Партнёр</dt>
          <dd>
            {partner?.name ?? (
              <span data-testid="ca-observer-partner-unavailable">
                Партнёр недоступен (id: {appeal.receivingPartnerId})
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Статус у партнёра</dt>
          <dd>{observerAppealStatusLabel(appeal)}</dd>
        </div>
        <div>
          <dt>Интерес</dt>
          <dd>{interest || "—"}</dd>
        </div>
        <div>
          <dt>Сертификат</dt>
          <dd>{certificate || "—"}</dd>
        </div>
        <div>
          <dt>Направлено</dt>
          <dd>
            {appeal.referralAt ? (
              <time dateTime={appeal.referralAt}>{formatObserverDateTime(appeal.referralAt)}</time>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt>Обновлено</dt>
          <dd>
            <time dateTime={appeal.updatedAt}>{formatObserverDateTime(appeal.updatedAt)}</time>
          </dd>
        </div>
        {purchaseKnown ? (
          <div data-testid="ca-observer-client-purchase">
            <dt>Покупка</dt>
            <dd>
              {purchase ? (
                <>
                  {formatObserverPublicPurchaseKopecks(purchase.amountKopecks)}
                  {purchase.note?.trim() ? (
                    <span className={styles.mutedSmall}> · {purchase.note.trim()}</span>
                  ) : null}
                </>
              ) : (
                <span className={styles.mutedSmall} data-testid="ca-observer-client-purchase-empty">
                  Покупка у партнёра пока не зафиксирована.
                </span>
              )}
            </dd>
          </div>
        ) : null}
      </dl>
      {publicTimeline !== undefined ? (
        <ReceivingAppealHistory
          entries={publicTimeline.map((row) => ({ at: row.at, text: row.text }))}
          projection="k2-referrer-public"
          refusedReason={refusedReason}
          emptyLabel="Публичных событий пока нет."
        />
      ) : (
        <section
          className={styles.mutedSmall}
          data-testid="ca-observer-client-timeline-na"
          aria-label="Хронология направления"
        >
          Публичная хронология и данные покупки недоступны без подтверждённого контракта направлений
          (BLK-OBSERVER-REFERRED).
        </section>
      )}
    </>
  );
}

export function ObserverClientDetailView(props: ObserverClientDetailProps) {
  const chrome = {
    onBack: props.onBack,
    backFrom: props.backFrom,
    backLabel: props.backLabel,
  };

  if (props.status === "loading") {
    return (
      <div
        className={styles.section}
        data-testid="ca-observer-client-page"
        data-ca-state="loading"
        aria-busy="true"
      >
        <ObserverClientDetailBackButton {...chrome} />
        <p data-testid="ca-observer-client-loading">Загрузка направления…</p>
      </div>
    );
  }

  if (props.status === "error") {
    return (
      <div
        className={styles.section}
        data-testid="ca-observer-client-page"
        data-ca-state="error"
      >
        <ObserverClientDetailBackButton {...chrome} />
        <section className={styles.blocked} data-testid="ca-observer-client-error">
          <h2>Данные направления недоступны</h2>
          <p className={styles.mutedSmall}>{props.message}</p>
          {props.onRetry ? (
            <button type="button" className={styles.ghostBtn} onClick={props.onRetry}>
              Повторить
            </button>
          ) : null}
        </section>
      </div>
    );
  }

  if (props.status === "missing") {
    return (
      <ObserverClientDetailMissing
        clientId={props.clientId}
        onBack={props.onBack}
        backFrom={props.backFrom}
        backLabel={props.backLabel}
      />
    );
  }

  if (props.status === "ready") {
    return (
      <div className={styles.section} data-testid="ca-observer-client-page" data-ca-state="ready">
        <ObserverClientDetailBackButton {...chrome} />
        <ObserverClientDetailReadyBody
          appeal={props.appeal}
          partner={props.partner}
          publicTimeline={props.publicTimeline}
          purchase={props.purchase}
          purchaseKnown
          refusedReason={props.refusedReason}
        />
      </div>
    );
  }

  return (
    <div className={styles.section} data-testid="ca-observer-client-page">
      <ObserverClientDetailBackButton {...chrome} />
      <ObserverClientDetailReadyBody
        appeal={props.appeal}
        partner={props.partner}
        publicTimeline={props.publicTimeline}
        purchase={props.purchase}
        purchaseKnown={props.purchase !== undefined}
        refusedReason={props.refusedReason}
      />
    </div>
  );
}

type ClientMissingProps = {
  clientId?: string;
  onBack: () => void;
  backFrom?: ObserverClientBackFrom;
  backLabel?: string;
};

/** Synthetic 404 — shell renders when `nav.clientId` does not resolve (read P3). */
export function ObserverClientDetailMissing({
  clientId,
  onBack,
  backFrom,
  backLabel,
}: ClientMissingProps) {
  const resolvedBackLabel = resolveObserverClientBackLabel(backFrom, backLabel);
  return (
    <div
      className={styles.section}
      data-testid="ca-observer-client-page"
      data-ca-state="missing"
    >
      <button
        type="button"
        className={styles.backBtn}
        data-ca-action="observer:back"
        data-testid="ca-clients-back"
        onClick={onBack}
      >
        {resolvedBackLabel}
      </button>
      <section className={styles.blocked} data-testid="ca-observer-client-missing">
        <h2>Направление не найдено</h2>
        <p className={styles.mutedSmall}>
          {clientId
            ? `Запись «${clientId}» отсутствует в доступном списке или скрыта фильтрами.`
            : "Запись отсутствует в доступном списке или скрыта фильтрами."}
        </p>
      </section>
    </div>
  );
}
