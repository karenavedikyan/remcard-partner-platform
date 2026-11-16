"use client";

import {
  displayClientName,
  formatObserverDateTime,
  observerAppealStatusLabel,
} from "@/lib/clients-parity/observer-display";
import type { ObserverPartnerMeta, ObserverReferredAppeal } from "@/lib/clients-parity/types";
import { ReceivingAppealHistory } from "../receiving/ReceivingAppealHistory";
import { ReceivingSubpageHead } from "../receiving/ReceivingSubpageHead";
import { stageBadgeClassName } from "../receiving/receiving-display";
import {
  formatObserverPublicPurchaseKopecks,
  type K2ObserverPublicPurchase,
  type ObserverPublicTimelineEntry,
} from "./observer-client-detail-contract";

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
      className="ca-back"
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
  chrome,
}: {
  appeal: ObserverReferredAppeal;
  partner?: ObserverPartnerMeta;
  publicTimeline?: ObserverPublicTimelineEntry[];
  purchase?: K2ObserverPublicPurchase | null;
  /** When true, `purchase` came from K2 (including explicit null). */
  purchaseKnown: boolean;
  refusedReason?: string | null;
  chrome: ObserverClientDetailChromeProps;
}) {
  const clientName = displayClientName(appeal);
  const interest = appeal.interest?.trim();
  const certificate = appeal.certificateId?.trim();
  const status = observerAppealStatusLabel(appeal);

  return (
    <>
      <ReceivingSubpageHead
        onBack={chrome.onBack}
        backLabel={resolveObserverClientBackLabel(chrome.backFrom, chrome.backLabel).replace(/^←\s*/, "")}
        title={clientName}
        titleId="ca-observer-client-title"
        badge={<span className={stageBadgeClassName(String(appeal.stageId), status)}>{status}</span>}
      />
      <section className="panel stack ca-observer-client">
        <p className="muted">{interest || "—"}</p>
        <p className="small muted">
          Партнёр:{" "}
          {partner?.name ?? <span data-testid="ca-observer-partner-unavailable">Партнёр недоступен</span>}
        </p>
      </section>
      <section className="panel stack" aria-labelledby="ca-observer-client-brief">
        <h3 id="ca-observer-client-brief">Кратко</h3>
        <dl className="ca-dl">
          <div>
            <dt>Сертификат</dt>
            <dd data-testid="ca-observer-certificate">{certificate ? "Выдан вами" : "—"}</dd>
          </div>
          <div>
            <dt>Статус у партнёра</dt>
            <dd>{status}</dd>
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
                  formatObserverPublicPurchaseKopecks(purchase.amountKopecks)
                ) : (
                  <span className="small muted" data-testid="ca-observer-client-purchase-empty">
                    Покупка у партнёра пока не зафиксирована.
                  </span>
                )}
              </dd>
            </div>
          ) : null}
        </dl>
        {purchaseKnown && purchase?.note?.trim() ? (
          <p className="small muted">{purchase.note.trim()}</p>
        ) : null}
      </section>
      {publicTimeline !== undefined ? (
        <ReceivingAppealHistory
          entries={publicTimeline.map((row) => ({ at: row.at, text: row.text }))}
          projection="k2-referrer-public"
          refusedReason={refusedReason}
          emptyLabel="Публичных событий пока нет."
        />
      ) : (
        <section
          className="panel small muted"
          data-testid="ca-observer-client-timeline-na"
          aria-label="Хронология направления"
        >
          Публичная хронология и данные покупки сейчас недоступны.
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
  const root = "stack ca-section ca-section--observer";

  if (props.status === "loading") {
    return (
      <div className={root} data-testid="ca-observer-client-page" data-ca-state="loading" aria-busy="true">
        <ObserverClientDetailBackButton {...chrome} />
        <p className="muted" data-testid="ca-observer-client-loading">
          Загрузка направления…
        </p>
      </div>
    );
  }

  if (props.status === "error") {
    return (
      <div className={root} data-testid="ca-observer-client-page" data-ca-state="error">
        <ObserverClientDetailBackButton {...chrome} />
        <section className="panel empty ca-empty" data-testid="ca-observer-client-error">
          <h2>Данные направления недоступны</h2>
          <p className="muted">{props.message}</p>
          {props.onRetry ? (
            <button type="button" className="btn ghost small-btn" onClick={props.onRetry}>
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
      <div className={root} data-testid="ca-observer-client-page" data-ca-state="ready">
        <ObserverClientDetailReadyBody
          appeal={props.appeal}
          partner={props.partner}
          publicTimeline={props.publicTimeline}
          purchase={props.purchase}
          purchaseKnown
          refusedReason={props.refusedReason}
          chrome={chrome}
        />
      </div>
    );
  }

  return (
    <div className={root} data-testid="ca-observer-client-page">
      <ObserverClientDetailReadyBody
        appeal={props.appeal}
        partner={props.partner}
        publicTimeline={props.publicTimeline}
        purchase={props.purchase}
        purchaseKnown={props.purchase !== undefined}
        refusedReason={props.refusedReason}
        chrome={chrome}
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
      className="stack ca-section ca-section--observer"
      data-testid="ca-observer-client-page"
      data-ca-state="missing"
    >
      <button
        type="button"
        className="ca-back"
        data-ca-action="observer:back"
        data-testid="ca-clients-back"
        onClick={onBack}
      >
        {resolvedBackLabel}
      </button>
      <section className="panel empty ca-empty" data-testid="ca-observer-client-missing">
        <h2>Направление не найдено</h2>
        <p className="muted">
          {clientId
            ? `Запись «${clientId}» отсутствует в доступном списке или скрыта фильтрами.`
            : "Запись отсутствует в доступном списке или скрыта фильтрами."}
        </p>
      </section>
    </div>
  );
}
