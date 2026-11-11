"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PayoutRecordModal,
  type PayoutRecordTarget,
} from "@/components/payout/PayoutRecordModal";
import { formatMoneyRub } from "@/lib/history-format";
import { settlementAccrualHref, settlementPurchaseHref } from "@/lib/settlements-links";
import { ONBOARDING_READ_ONLY_HISTORY_HREF } from "@/lib/onboarding-step/read-only-history";
import type { SettlementObligation } from "@/lib/settlements-types";
import {
  scheduleBadgeExtra,
  walletBucketSummary,
  walletDetailTabCounts,
  walletDetailTabRows,
  type WalletDetailTab,
} from "@/lib/wallet-accruals/detail-buckets";
import {
  formatDeadlineShort,
  formatHistoryTotalParts,
  formatIsoShort,
} from "@/lib/wallet-accruals/format";
import {
  buildWalletHistoryRows,
  filterWalletHistoryRows,
  findObligationById,
  historyFiltersForDirection,
  historyTotalLabel,
  sumHistoryRowAmounts,
  txnViewFromRow,
  walletCardTotals,
} from "@/lib/wallet-accruals/map-history";
import { buildTxnFacts, buildTxnTimeline } from "@/lib/wallet-accruals/timeline";
import type {
  WalletAccrualsData,
  WalletDirection,
  WalletHistoryFilter,
  WalletHistoryRow,
  WalletPresentation,
  WalletTxnView,
} from "@/lib/wallet-accruals/types";
import "./wallet-accruals.global.css";

const DIRECTION_LABELS: Record<WalletDirection, string> = {
  in: "Мне должны",
  out: "Я должен",
};

type DialogMode =
  | { type: "closed" }
  | {
      type: "txn";
      txn: WalletTxnView;
      returnTo: "history" | "detail";
      returnDetailTab: WalletDetailTab;
    }
  | { type: "detail"; tab: WalletDetailTab };

type Props = {
  data: WalletAccrualsData;
  incomingOnly?: boolean;
  presentation: WalletPresentation;
  onDataRefresh?: (options?: { preserveDataOnError?: boolean }) => void | Promise<void>;
  scopeKey?: string;
  coverageNote?: string | null;
  refreshNotice?: string | null;
  onDismissRefreshNotice?: () => void;
  onPayoutRefreshFailed?: () => void;
  onOpenMasterLedger?: () => void;
  onOpenAgentRegistry?: () => void;
};

const DETAIL_TABS: { id: WalletDetailTab; label: (dir: WalletDirection) => string }[] = [
  { id: "confirmed", label: (dir) => (dir === "in" ? "К получению" : "К оплате") },
  { id: "waiting", label: () => "Ожидает" },
  { id: "suspended", label: () => "Приостановлено" },
  { id: "paid", label: (dir) => (dir === "in" ? "Получено" : "Выплачено") },
  { id: "schedule", label: () => "График" },
];

function badgeClasses(kind: WalletHistoryRow["kind"]): string {
  switch (kind) {
    case "waiting":
      return "wallet-status-badge wallet-status-badge--graphite";
    case "confirmed":
      return "wallet-status-badge wallet-status-badge--confirmed";
    case "suspended":
      return "wallet-status-badge wallet-status-badge--amber";
    case "received":
      return "wallet-status-badge wallet-status-badge--paid-in";
    case "paid-out":
      return "wallet-status-badge wallet-status-badge--paid-out";
    case "return":
      return "wallet-status-badge wallet-status-badge--return";
    default:
      return "wallet-status-badge";
  }
}

function badgeCaption(row: WalletHistoryRow): string {
  if (row.kind === "waiting" && row.suspendedReason) {
    return row.suspendedReason.toLowerCase().includes("сверк")
      ? "требует сверки"
      : badgeCaptionBase(row.kind);
  }
  return badgeCaptionBase(row.kind);
}

function badgeCaptionBase(kind: WalletHistoryRow["kind"]): string {
  switch (kind) {
    case "waiting":
      return "ожидает";
    case "confirmed":
      return "подтверждено";
    case "suspended":
      return "приостановлено";
    case "received":
      return "получено";
    case "paid-out":
      return "выплачено";
    case "return":
      return "возврат";
    default:
      return kind;
  }
}

function rowDeadlineLabel(row: WalletHistoryRow): string {
  if (row.kind === "return") return "—";
  if (row.kind === "received" || row.kind === "paid-out") {
    return row.sortDate ? formatIsoShort(row.sortDate) : "—";
  }
  if (!row.sortDate) return "—";
  return formatDeadlineShort(row.sortDate);
}

function WalletStatusBadge({
  row,
  scheduleExtra,
}: {
  row: WalletHistoryRow;
  scheduleExtra?: string;
}) {
  return (
    <span className={badgeClasses(row.kind)}>
      <span className="wallet-status-badge__caption">
        {scheduleExtra ? `ожидает · ${scheduleExtra}` : badgeCaption(row)}
      </span>
      {row.kind === "return" ? null : (
        <strong className="wallet-status-badge__amount">{formatMoneyRub(row.amount)}</strong>
      )}
    </span>
  );
}

export function WalletAccrualsShell({
  data,
  incomingOnly = false,
  presentation,
  onDataRefresh,
  scopeKey,
  coverageNote,
  refreshNotice,
  onDismissRefreshNotice,
  onPayoutRefreshFailed,
  onOpenMasterLedger,
  onOpenAgentRegistry,
}: Props) {
  const [direction, setDirection] = useState<WalletDirection>("in");
  const [historyFilter, setHistoryFilter] = useState<WalletHistoryFilter>("all");
  const [dialog, setDialog] = useState<DialogMode>({ type: "closed" });
  const [scheduleExpanded, setScheduleExpanded] = useState(false);
  const [payoutTarget, setPayoutTarget] = useState<PayoutRecordTarget | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const shellFocusRef = useRef<HTMLElement>(null);
  const skipDialogFocusRestoreRef = useRef(false);
  /** Guards against double restore (closeDialog + native `close` used to clear the ref then fall back). */
  const focusRestorePendingRef = useRef(false);

  const effectiveDirection = incomingOnly ? "in" : direction;

  useEffect(() => {
    setHistoryFilter("all");
  }, [effectiveDirection]);

  useEffect(() => {
    setHistoryFilter("all");
    setScheduleExpanded(false);
    setDialog({ type: "closed" });
    if (!incomingOnly) setDirection("in");
  }, [scopeKey, incomingOnly]);

  const historyRows = useMemo(
    () => buildWalletHistoryRows(data, effectiveDirection, incomingOnly),
    [data, effectiveDirection, incomingOnly],
  );

  const visibleRows = useMemo(
    () => filterWalletHistoryRows(historyRows, historyFilter, effectiveDirection),
    [historyRows, historyFilter, effectiveDirection],
  );

  const totals = useMemo(
    () => walletCardTotals(data, effectiveDirection),
    [data, effectiveDirection],
  );

  const historyTotal = sumHistoryRowAmounts(
    filterWalletHistoryRows(historyRows, historyFilter, effectiveDirection),
  );
  const totalParts = formatHistoryTotalParts(historyTotal);

  const bucketSummary = useMemo(
    () => walletBucketSummary(data, effectiveDirection),
    [data, effectiveDirection],
  );

  const tabCounts = useMemo(
    () => walletDetailTabCounts(data, effectiveDirection, incomingOnly),
    [data, effectiveDirection, incomingOnly],
  );

  const rememberFocus = useCallback(() => {
    const active = document.activeElement;
    returnFocusRef.current = active instanceof HTMLElement ? active : null;
    focusRestorePendingRef.current = true;
  }, []);

  const restoreFocus = useCallback(() => {
    if (!focusRestorePendingRef.current) return;
    focusRestorePendingRef.current = false;
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    if (target && document.contains(target)) {
      target.focus();
      return;
    }
    const shellRoot = shellFocusRef.current;
    if (shellRoot) {
      shellRoot.focus();
      return;
    }
    document.querySelector<HTMLElement>('[data-testid="wallet-direction-in"]')?.focus();
  }, []);

  const openDialog = useCallback(() => {
    dialogRef.current?.showModal();
  }, []);

  const closeDialog = useCallback(() => {
    dialogRef.current?.close();
    setDialog({ type: "closed" });
    setScheduleExpanded(false);
    // Focus restore is owned exclusively by the dialog `close` listener so every
    // close path (Escape/cancel, X, footer, programmatic) restores exactly once.
  }, []);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    const onClose = () => {
      setDialog({ type: "closed" });
      setScheduleExpanded(false);
      if (skipDialogFocusRestoreRef.current) {
        skipDialogFocusRestoreRef.current = false;
        return;
      }
      restoreFocus();
    };
    node.addEventListener("close", onClose);
    return () => node.removeEventListener("close", onClose);
  }, [restoreFocus]);

  const openDetail = useCallback(
    (tab: WalletDetailTab) => {
      rememberFocus();
      setDialog({ type: "detail", tab });
      openDialog();
    },
    [openDialog, rememberFocus],
  );

  const openTxn = useCallback(
    (
      row: WalletHistoryRow,
      returnTo: "history" | "detail" = "history",
      returnDetailTab: WalletDetailTab = "confirmed",
    ) => {
      rememberFocus();
      setDialog({
        type: "txn",
        txn: txnViewFromRow(row),
        returnTo,
        returnDetailTab,
      });
      openDialog();
    },
    [openDialog, rememberFocus],
  );

  const activeTxnRow = useMemo(() => {
    if (dialog.type !== "txn") return null;
    return historyRows.find(
      (r) =>
        txnViewFromRow(r).lineId === dialog.txn.lineId &&
        txnViewFromRow(r).rowKind === dialog.txn.rowKind &&
        txnViewFromRow(r).amount === dialog.txn.amount &&
        txnViewFromRow(r).sortDate === dialog.txn.sortDate,
    );
  }, [dialog, historyRows]);

  const obligation =
    dialog.type === "txn" ? findObligationById(data, dialog.txn.lineId) : undefined;

  const relatedRows = useMemo(() => {
    if (dialog.type !== "txn" || !activeTxnRow) return [];
    return historyRows.filter((r) => r.purchaseId === activeTxnRow.purchaseId);
  }, [dialog, activeTxnRow, historyRows]);

  const onTxnBack = () => {
    if (dialog.type === "txn" && dialog.returnTo === "detail") {
      setDialog({ type: "detail", tab: dialog.returnDetailTab });
      return;
    }
    closeDialog();
  };

  const openPayoutModal = (row: SettlementObligation) => {
    if (!row.payoutActions) return;
    skipDialogFocusRestoreRef.current = true;
    dialogRef.current?.close();
    setDialog({ type: "closed" });
    setPayoutTarget({
      bonusId: row.id,
      counterpartyName: row.counterpartyName,
      amount: row.amount,
      basis: row.basis,
      payoutActions: row.payoutActions,
    });
  };

  const detailTab = dialog.type === "detail" ? dialog.tab : "confirmed";
  const detailRows = useMemo(() => {
    if (dialog.type !== "detail") return [];
    return walletDetailTabRows(data, effectiveDirection, detailTab, incomingOnly);
  }, [data, detailTab, dialog.type, effectiveDirection, incomingOnly]);

  const visibleScheduleRows =
    detailTab === "schedule" && !scheduleExpanded && detailRows.length > 5
      ? detailRows.slice(0, 5)
      : detailRows;

  const renderDetailRowList = () => {
    const rowsToShow = detailTab === "schedule" ? visibleScheduleRows : detailRows;
    if (rowsToShow.length === 0) {
      const empty =
        detailTab === "confirmed"
          ? "Нет подтверждённых сумм"
          : detailTab === "waiting"
            ? "Нет сумм в ожидании"
            : detailTab === "suspended"
              ? "Нет приостановленных сумм"
              : detailTab === "paid"
                ? effectiveDirection === "in"
                  ? "Пока нет поступлений"
                  : "Пока нет выплат"
                : "Операций пока нет";
      return (
        <div className="wallet-accrual-row-list">
          <p className="pw-muted wallet-accrual-empty">{empty}</p>
        </div>
      );
    }
    return (
      <div className="wallet-accrual-row-list" data-testid="wallet-accruals-schedule">
        {rowsToShow.map((row) => {
          const extra =
            detailTab === "schedule" ? scheduleBadgeExtra(row.sortDate || null) : undefined;
          return (
            <button
              key={row.rowKey}
              type="button"
              className="wallet-accrual-row wallet-accruals-history__row"
              data-accrual-row-kind={row.kind}
              onClick={() =>
                openTxn(row, "detail", detailTab === "schedule" ? "schedule" : detailTab)
              }
            >
              <span className="wallet-accrual-row__main">
                <strong className="wallet-accrual-row__title">{row.category}</strong>
                <span className="wallet-accrual-row__sub">
                  {row.partner} · № {row.purchaseId}
                </span>
                {row.sortDate ? (
                    <span className="wallet-accrual-row__sub wallet-accrual-row__date">
                      {rowDeadlineLabel(row)}
                    </span>
                ) : null}
              </span>
              <WalletStatusBadge row={row} scheduleExtra={extra} />
            </button>
          );
        })}
        {detailTab === "schedule" && detailRows.length > 5 ? (
          <button
            type="button"
            className="pw-btn wallet-accruals-schedule__toggle"
            onClick={() => setScheduleExpanded((v) => !v)}
          >
            {scheduleExpanded ? "Свернуть" : `Показать все (${detailRows.length})`}
          </button>
        ) : null}
      </div>
    );
  };

  const renderStatTiles = () => {
    const tiles: [string, string, number][] = [
      ["confirmed", "Подтверждено", bucketSummary.confirmedUnpaid],
      ["waiting", "Ожидает", bucketSummary.waiting],
      ["suspended", "Приостановлено", bucketSummary.suspended],
    ];
    const nonZero = tiles.filter(([, , v]) => v > 0);
    const show = nonZero.length ? nonZero : tiles;
    return (
      <div className="wallet-accrual-stat-tiles" data-testid="wallet-detail-stat-tiles">
        {show.map(([id, label, value]) => (
          <div
            key={id}
            className="wallet-accrual-stat-tiles__tile"
            data-testid={`wallet-detail-stat-${id}`}
          >
            <strong>{formatMoneyRub(value)}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderDetailPanel = () => {
    const title = DIRECTION_LABELS[effectiveDirection];
    return (
      <>
        <div className="wallet-accrual-dialog__head">
          <h3 id="accrual-panel-title">{title}</h3>
          <button
            type="button"
            className="wallet-accrual-dialog__close"
            aria-label="Закрыть"
            onClick={closeDialog}
          >
            ×
          </button>
        </div>
        {renderStatTiles()}
        <div
          className="wallet-accrual-detail-tabs"
          role="tablist"
          aria-label={`Статусы ${title}`}
        >
          {DETAIL_TABS.map(({ id, label }) => {
            const count = tabCounts[id] ?? 0;
            const muted = count === 0 ? " is-muted" : "";
            const active = detailTab === id ? " is-active" : "";
            return (
              <button
                key={id}
                type="button"
                className={`wallet-accrual-detail-tabs__btn${active}${muted}`}
                role="tab"
                aria-selected={detailTab === id}
                data-testid={`wallet-detail-tab-${id}`}
                onClick={() => {
                  setScheduleExpanded(false);
                  setDialog({ type: "detail", tab: id });
                }}
              >
                {label(effectiveDirection)}
                <span className="wallet-accrual-detail-tabs__count">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="wallet-accrual-detail-body" role="tabpanel">
          {renderDetailRowList()}
        </div>
      </>
    );
  };

  const renderTxnPanel = () => {
    if (dialog.type !== "txn" || !obligation || !activeTxnRow) {
      return <p className="pw-muted">Запись недоступна.</p>;
    }
    const directionLabel = DIRECTION_LABELS[effectiveDirection];
    const timeline = buildTxnTimeline(obligation, dialog.txn);
    const facts = buildTxnFacts(obligation, dialog.txn, directionLabel);
    const backLabel = dialog.returnTo === "detail" ? "← Назад" : "← К истории";
    const payableRow =
      effectiveDirection === "out"
        ? data.payable.find((p) => p.id === dialog.txn.lineId)
        : undefined;
    const canPayout =
      dialog.txn.rowKind === "confirmed" &&
      payableRow?.payoutActions &&
      (payableRow.payoutActions.canRecordCash ||
        payableRow.payoutActions.canRecordTransfer);

    return (
      <article className="wallet-txn-panel" data-testid="wallet-txn-panel">
        <div className="wallet-txn-panel__top">
          <div className="wallet-txn-panel__head-row">
            <h3 className="wallet-txn-panel__title" id="accrual-panel-title">
              {activeTxnRow.category}
            </h3>
            <div className="wallet-txn-panel__hero" data-testid="wallet-txn-hero">
              <WalletStatusBadge row={activeTxnRow} />
            </div>
            <button
              type="button"
              className="wallet-accrual-dialog__close"
              aria-label="Закрыть"
              onClick={closeDialog}
            >
              ×
            </button>
          </div>
          <p className="wallet-txn-panel__sub">
            {activeTxnRow.partner} · Заказ № {activeTxnRow.purchaseId}
          </p>
        </div>
        <dl className="wallet-txn-facts">
          {facts.map(([label, value]) => (
            <div className="wallet-txn-facts__cell" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <ol className="wallet-txn-timeline" data-testid="wallet-txn-timeline">
          {timeline.map((step) => (
            <li
              key={step.title}
              className={`wallet-txn-timeline__step wallet-txn-timeline__step--${step.state}${
                step.tone ? ` wallet-txn-timeline__step--${step.tone}` : ""
              }`}
            >
              <span className="wallet-txn-timeline__dot" aria-hidden="true" />
              <span className="wallet-txn-timeline__label">{step.title}</span>
            </li>
          ))}
        </ol>
        {relatedRows.length > 0 ? (
          <section className="wallet-txn-related" data-testid="wallet-txn-related">
            <h4 className="wallet-txn-section-title">
              Операции по заказу № {activeTxnRow.purchaseId}
            </h4>
            <div className="wallet-txn-related__list">
              {relatedRows.map((r) => {
                const current = txnViewFromRow(r);
                const isCurrent =
                  dialog.type === "txn" &&
                  current.lineId === dialog.txn.lineId &&
                  current.rowKind === dialog.txn.rowKind &&
                  current.amount === dialog.txn.amount &&
                  current.sortDate === dialog.txn.sortDate;
                const label = `${badgeCaption(r)} · ${
                  r.sortDate ? formatIsoShort(r.sortDate) : "—"
                }`;
                if (isCurrent) {
                  return (
                    <div
                      key={r.rowKey}
                      className="wallet-txn-related__item is-current"
                      data-testid="wallet-txn-related-current"
                    >
                      <span className="wallet-txn-related__label">{label}</span>
                      <strong className="wallet-txn-related__amount">
                        {formatMoneyRub(r.amount)}
                      </strong>
                    </div>
                  );
                }
                return (
                  <button
                    key={r.rowKey}
                    type="button"
                    className="wallet-txn-related__item"
                    onClick={() =>
                      openTxn(
                        r,
                        dialog.type === "txn" ? dialog.returnTo : "history",
                        dialog.type === "txn" ? dialog.returnDetailTab : "confirmed",
                      )
                    }
                  >
                    <span className="wallet-txn-related__label">{label}</span>
                    <strong className="wallet-txn-related__amount">
                      {formatMoneyRub(r.amount)}
                    </strong>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
        <div className="wallet-txn-panel__footer">
          <button
            type="button"
            className="wallet-txn-back"
            onClick={onTxnBack}
            data-testid="wallet-txn-back"
          >
            {backLabel}
          </button>
          <Link href={settlementAccrualHref(obligation)} className="wallet-txn-back">
            Начисление
          </Link>
          <Link href={settlementPurchaseHref(obligation)} className="wallet-txn-back">
            Заказ
          </Link>
          {canPayout && payableRow ? (
            <button
              type="button"
              className="wallet-txn-back"
              data-testid={`wallet-txn-record-payout-${payableRow.id}`}
              onClick={() => openPayoutModal(payableRow)}
            >
              Зафиксировать выплату
            </button>
          ) : null}
        </div>
      </article>
    );
  };

  const panelBody =
    dialog.type === "txn"
      ? renderTxnPanel()
      : dialog.type === "detail"
        ? renderDetailPanel()
        : null;

  const confirmedParts = formatHistoryTotalParts(totals.confirmedUnpaid);
  const waitingParts = formatHistoryTotalParts(totals.waiting);
  const primaryCardLabel =
    effectiveDirection === "in" ? "к получению:" : "к оплате:";
  const columnTestId =
    effectiveDirection === "in" ? "wallet-column-receivable" : "wallet-column-payable";
  const cardFaceTestId =
    effectiveDirection === "in" ? "wallet-rc-receivable-face" : "wallet-rc-payable-face";
  const panLine = presentation.cardIdentifier?.trim() || null;

  return (
    <section
      ref={shellFocusRef}
      tabIndex={-1}
      className="wallet-accruals"
      data-wallet-accruals
      data-testid="wallet-accruals"
    >
      {coverageNote ? (
        <p className="wallet-accruals-coverage pw-muted" data-testid="wallet-coverage-note">
          {coverageNote}
        </p>
      ) : null}
      {refreshNotice ? (
        <p
          className="wallet-accruals-coverage pw-muted"
          role="status"
          data-testid="wallet-refresh-notice"
        >
          {refreshNotice}
          {onDismissRefreshNotice ? (
            <button type="button" className="pw-btn" onClick={onDismissRefreshNotice}>
              Закрыть
            </button>
          ) : null}
        </p>
      ) : null}
      <div className="wallet-accruals-layout">
        <div className="wallet-accruals-cards">
          {!incomingOnly ? (
            <div
              className="wallet-direction"
              role="tablist"
              aria-label="Направление взаиморасчётов"
              data-testid="wallet-direction"
            >
              {(["in", "out"] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  className={`wallet-direction__tab${effectiveDirection === dir ? " is-active" : ""}`}
                  role="tab"
                  aria-selected={effectiveDirection === dir}
                  data-testid={dir === "in" ? "wallet-direction-in" : "wallet-direction-out"}
                  onClick={() => setDirection(dir)}
                >
                  {DIRECTION_LABELS[dir]}
                </button>
              ))}
            </div>
          ) : null}

          <div
            className="wallet-accruals-card-column"
            data-testid={columnTestId}
          >
            <button
              type="button"
              className="wallet-rc-card wallet-rc-card--black"
              data-testid={cardFaceTestId}
              aria-label={`${DIRECTION_LABELS[effectiveDirection]} · ${formatMoneyRub(totals.confirmedUnpaid)} подтверждено`}
              onClick={() => openDetail("confirmed")}
            >
              <div className="wallet-rc-card__head">
                <span className="wallet-rc-card__ribbon">{presentation.ribbonLabel}</span>
                <span className="wallet-rc-lockup" aria-hidden="true">
                  <span className="wallet-rc-lockup__word">
                    remcard<em className="wallet-rc-lockup__dot">.</em>
                  </span>
                </span>
              </div>
              <div className="wallet-rc-card__body">
                <p className="wallet-rc-card__label">{primaryCardLabel}</p>
                <div className="wallet-rc-card__hero">
                  <strong className="wallet-rc-card__amount">{confirmedParts.amount}</strong>
                  <span className="wallet-rc-card__unit">{confirmedParts.currency || " ₽"}</span>
                </div>
                <p className="wallet-rc-card__label wallet-rc-card__label--secondary">
                  в ожидании:
                </p>
                <div className="wallet-rc-card__waiting-row">
                  <strong className="wallet-rc-card__waiting-amount">
                    {waitingParts.amount}
                  </strong>
                  <span className="wallet-rc-card__unit wallet-rc-card__unit--waiting">
                    {waitingParts.currency || " ₽"}
                  </span>
                </div>
              </div>
              {panLine ? (
                <span className="wallet-rc-card__pan">{panLine}</span>
              ) : null}
            </button>

            <div
              className="wallet-accruals-quick"
              data-testid={`wallet-quick-${effectiveDirection}`}
              aria-label={`Быстрые действия · ${DIRECTION_LABELS[effectiveDirection]}`}
            >
              <button
                type="button"
                className="wallet-accruals-quick__btn wallet-accruals-quick__btn--teal"
                data-testid={`wallet-quick-${effectiveDirection}-waiting`}
                onClick={() => openDetail("waiting")}
              >
                Ожидает
              </button>
              <button
                type="button"
                className="wallet-accruals-quick__btn wallet-accruals-quick__btn--teal"
                data-testid={`wallet-quick-${effectiveDirection}-schedule`}
                onClick={() => openDetail("schedule")}
              >
                График
              </button>
              <button
                type="button"
                className="wallet-accruals-quick__btn wallet-accruals-quick__btn--accent"
                data-testid={`wallet-quick-${effectiveDirection}-paid`}
                onClick={() => openDetail("paid")}
              >
                {effectiveDirection === "in" ? "Получено" : "Выплачено"}
              </button>
            </div>
          </div>

          {onOpenMasterLedger || onOpenAgentRegistry ? (
            <div className="wallet-accruals-extensions" data-testid="wallet-accruals-extensions">
              {onOpenMasterLedger ? (
                <button
                  type="button"
                  className="wallet-accruals-extensions__link"
                  data-testid="wallet-open-master-ledger"
                  onClick={onOpenMasterLedger}
                >
                  Реестр, сверка и Excel
                </button>
              ) : null}
              {onOpenAgentRegistry ? (
                <button
                  type="button"
                  className="wallet-accruals-extensions__link"
                  data-testid="wallet-open-agent-registry"
                  onClick={onOpenAgentRegistry}
                >
                  Реестр начислений агента
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <aside
          className="wallet-accruals-history"
          data-testid="wallet-history"
          data-history-filter={historyFilter}
          data-history-direction={effectiveDirection}
        >
          <div className="wallet-accruals-history__header">
            <div className="wallet-accruals-history__header-text">
              <Link
                href={ONBOARDING_READ_ONLY_HISTORY_HREF}
                className="wallet-accruals-history__hub-link"
                data-testid="wallet-history-hub-link"
              >
                Покупки и транзакции в разделе «История»
              </Link>
              <span className="wallet-accruals-history__eyebrow">
                История · {DIRECTION_LABELS[effectiveDirection]}
              </span>
              <strong className="wallet-accruals-history__total" data-testid="wallet-history-total">
                {historyTotalLabel(historyFilter)}{" "}
                <span data-testid="wallet-history-total-value">{totalParts.amount}</span>
                <span className="wallet-accruals-history__total-currency">
                  {totalParts.currency}
                </span>
              </strong>
            </div>
            <div className="wallet-accruals-history__filters" role="group" aria-label="Фильтр истории">
              {historyFiltersForDirection(effectiveDirection).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={`wallet-accruals-history__filter${
                    historyFilter === chip.id ? " is-active" : ""
                  }`}
                  data-testid={`wallet-history-filter-${chip.id}`}
                  onClick={() => setHistoryFilter(chip.id)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
          <div className="wallet-accruals-history__list">
            {visibleRows.length === 0 ? (
              <p className="wallet-accruals-history__empty pw-muted">Операций пока нет</p>
            ) : (
              visibleRows.map((row) => (
                <button
                  key={row.rowKey}
                  type="button"
                  className="wallet-accrual-row wallet-accruals-history__row"
                  data-accrual-row-kind={row.kind}
                  data-testid={`wallet-history-row-${row.lineId}-${row.kind}`}
                  onClick={() => openTxn(row, "history", "confirmed")}
                >
                  <span className="wallet-accrual-row__main">
                    <strong className="wallet-accrual-row__title">{row.category}</strong>
                    <span className="wallet-accrual-row__sub">
                      {row.partner} · № {row.purchaseId}
                    </span>
                    <span className="wallet-accrual-row__sub wallet-accrual-row__date">
                      {rowDeadlineLabel(row)}
                    </span>
                  </span>
                  <WalletStatusBadge row={row} />
                </button>
              ))
            )}
          </div>
        </aside>
      </div>

      <dialog
        className="wallet-accrual-dialog"
        ref={dialogRef}
        aria-labelledby="accrual-panel-title"
        onCancel={(e) => {
          e.preventDefault();
          closeDialog();
        }}
      >
        <form
          method="dialog"
          className="wallet-accrual-dialog__inner"
          onSubmit={(e) => e.preventDefault()}
        >
          <div data-accrual-panel-body>{panelBody}</div>
          <div className="cab-actions">
            <button type="button" className="pw-btn primary" onClick={closeDialog}>
              Закрыть
            </button>
          </div>
        </form>
      </dialog>

      {payoutTarget ? (
        <PayoutRecordModal
          target={payoutTarget}
          onClose={() => {
            setPayoutTarget(null);
            restoreFocus();
          }}
          onSuccess={async () => {
            await onDataRefresh?.({ preserveDataOnError: true });
            setPayoutTarget(null);
            restoreFocus();
          }}
          onPostRecordRefreshFailure={async () => {
            onPayoutRefreshFailed?.();
            setPayoutTarget(null);
            restoreFocus();
          }}
        />
      ) : null}
    </section>
  );
}
