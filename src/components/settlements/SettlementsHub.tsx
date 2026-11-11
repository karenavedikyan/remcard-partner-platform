"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { formatMoneyRub } from "@/lib/history-format";
import {
  bonusStatusLabel,
  bonusStatusTone,
  type HistoryStatusTone,
} from "@/lib/history-labels";
import { fetchSettlements, isSettlementsAccessDenied } from "@/lib/settlements-loader";
import {
  completedDirectionLabel,
  groupObligationsByCounterparty,
  sumObligationAmounts,
} from "@/lib/settlements-mappers";
import {
  settlementAccrualHref,
  settlementPurchaseHref,
} from "@/lib/settlements-links";
import type {
  SettlementCompleted,
  SettlementObligation,
  SettlementPartnerGroup,
  SettlementsResponse,
  SettlementsTab,
} from "@/lib/settlements-types";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import {
  PayoutRecordModal,
  type PayoutRecordTarget,
} from "@/components/payout/PayoutRecordModal";
import styles from "./settlements.module.css";
import { RewardLifecyclePanel } from "./RewardLifecyclePanel";
import { WalletSectionEmptyState } from "@/components/wallet-empty/WalletSectionEmptyState";
import { isWalletSettlementsDataEmpty } from "@/lib/wallet-empty/is-empty";
import type { WalletEmptyViewerProps } from "@/lib/wallet-empty/viewer-role";
import { isSupportedWalletEmptyViewerRole } from "@/lib/wallet-empty/viewer-role";
import {
  isWalletRefreshUnauthorized,
  useWalletVisibleRefresh,
  WALLET_STALE_DATA_NOTICE,
  type WalletRefreshReason,
} from "@/lib/wallet-data-refresh";

function obligationPrimaryTitle(row: SettlementObligation) {
  const basis = row.basis?.trim();
  return basis || "Начисление";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SETTLEMENTS_COVERAGE_NOTE =
  "Здесь показаны расчёты по покупкам. Другие начисления и часть старых операций могут не отображаться.";

const TAB_ITEMS: Array<{ id: SettlementsTab; label: string }> = [
  { id: "receivable", label: "Мне должны" },
  { id: "payable", label: "Я должен" },
  { id: "completed", label: "Завершённые" },
];

function statusPillClass(tone: HistoryStatusTone) {
  if (tone === "active") return styles.statusGreen;
  if (tone === "pending") return styles.statusAmber;
  return styles.statusPrimary;
}

function StatusPill({ label, tone }: { label: string; tone: HistoryStatusTone }) {
  return (
    <span className={`${styles.statusPill} ${statusPillClass(tone)}`}>{label}</span>
  );
}

function ObligationBreakdown({ row }: { row: SettlementObligation }) {
  const hasPaid = (row.paidAmount ?? 0) > 0;
  const hasPending = (row.pendingAmount ?? 0) > 0;
  const hasSuspended = (row.suspendedAmount ?? 0) > 0;
  if (!hasPaid && !hasPending && !hasSuspended && row.amount <= 0) return null;
  return (
    <dl className={styles.breakdown}>
      <div className={styles.breakdownRow}>
        <dt>Начислено</dt>
        <dd>{formatMoneyRub(row.amount)}</dd>
      </div>
      {hasPending ? (
        <div className={styles.breakdownRow}>
          <dt>Ожидает подтверждения</dt>
          <dd>{formatMoneyRub(row.pendingAmount!)}</dd>
        </div>
      ) : null}
      {hasSuspended ? (
        <div className={styles.breakdownRow}>
          <dt>Приостановлено</dt>
          <dd>{formatMoneyRub(row.suspendedAmount!)}</dd>
        </div>
      ) : null}
      {hasPaid ? (
        <div className={styles.breakdownRow}>
          <dt>Оплата подтверждена</dt>
          <dd>{formatMoneyRub(row.paidAmount!)}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function ObligationRow({
  row,
  onRecordPayout,
  hideCounterparty = false,
}: {
  row: SettlementObligation;
  onRecordPayout?: (row: SettlementObligation) => void;
  hideCounterparty?: boolean;
}) {
  const canPayout =
    row.payoutActions &&
    (row.payoutActions.canRecordCash || row.payoutActions.canRecordTransfer);
  const statusLabel = row.confirmationLabel ?? bonusStatusLabel(row.status);
  const tone = bonusStatusTone(row.status);

  return (
    <article className={styles.compactRecord}>
      <details>
        <summary>
          <span className={styles.recordLineInfo}>
            <strong>{obligationPrimaryTitle(row)}</strong>
            {hideCounterparty ? null : <span>{row.counterpartyName}</span>}
          </span>
          <span className={styles.recordLineValue}>
            <strong>{formatMoneyRub(row.amount)}</strong>
            <StatusPill label={statusLabel} tone={tone} />
          </span>
        </summary>
        <div className={styles.recordDetail}>
          <ObligationBreakdown row={row} />
          {(row.pendingAmount ?? 0) > 0 ? (
            <p className={styles.meta}>
              Ожидает подтверждения: {formatMoneyRub(row.pendingAmount!)}. Не входит в баланс.
            </p>
          ) : null}
          <p className={styles.meta}>Создано: {formatDate(row.createdAt)}</p>
          <p className={styles.meta}>
            Заказ: {row.orderId} · ID начисления: {row.id}
          </p>
          {row.hasIndividualTerms ? (
            <details className={styles.lifecycleDetails}>
              <summary>Категории, сроки и расчёты</summary>
              <RewardLifecyclePanel orderId={row.orderId} />
            </details>
          ) : null}
          <div className={styles.actions}>
            <Link href={settlementAccrualHref(row)} className={styles.linkButton}>
              Начисление
            </Link>
            <Link href={settlementPurchaseHref(row)} className={styles.linkButton}>
              Покупка
            </Link>
            {canPayout && onRecordPayout ? (
              <Button
                type="button"
                variant="secondary"
                data-testid={`settlements-record-payout-${row.id}`}
                onClick={() => onRecordPayout(row)}
              >
                Зафиксировать выплату
              </Button>
            ) : null}
          </div>
        </div>
      </details>
    </article>
  );
}

function PartnerGroupBlock({
  group,
  onRecordPayout,
}: {
  group: SettlementPartnerGroup;
  onRecordPayout?: (row: SettlementObligation) => void;
}) {
  const countLabel = `${group.items.length} ${
    group.items.length === 1 ? "начисление" : group.items.length < 5 ? "начисления" : "начислений"
  }`;
  return (
    <details className={styles.partnerGroup}>
      <summary className={styles.partnerCompact}>
        <span className={styles.partnerCompactMain}>
          <strong className={styles.groupTitle}>{group.counterpartyName}</strong>
          <p className={styles.partnerCompactMeta}>{countLabel}</p>
        </span>
        <span className={styles.partnerCompactAmount}>
          <strong>{formatMoneyRub(group.totalAmount)}</strong>
          <span aria-hidden="true">→</span>
        </span>
      </summary>
      <div className={styles.partnerGroupBody}>
        {group.items.map((row) => (
          <ObligationRow
            key={row.id}
            row={row}
            onRecordPayout={onRecordPayout}
            hideCounterparty
          />
        ))}
      </div>
    </details>
  );
}

function CompletedRow({ row }: { row: SettlementCompleted }) {
  const directionLabel = completedDirectionLabel(row.direction);
  return (
    <article className={styles.historyCard}>
      <details>
        <summary>
          <span className={styles.recordLineInfo}>
            <strong>{row.counterpartyName}</strong>
            <small>{row.basis}</small>
            <small>
              Оплачено: {row.paidAt ? formatDate(row.paidAt) : "дата неизвестна"}
            </small>
          </span>
          <strong>{formatMoneyRub(row.amount)}</strong>
        </summary>
        <div className={styles.recordDetail}>
          <StatusPill label={directionLabel} tone="active" />
          <p className={styles.meta}>{bonusStatusLabel(row.status)}</p>
          <div className={styles.actions}>
            <Link href={settlementAccrualHref(row)} className={styles.linkButton}>
              Начисление
            </Link>
            <Link href={settlementPurchaseHref(row)} className={styles.linkButton}>
              Покупка
            </Link>
          </div>
        </div>
      </details>
    </article>
  );
}

function filterPartnerGroups(
  groups: SettlementPartnerGroup[],
  query: string,
): SettlementPartnerGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((group) => {
      const items = group.items.filter(
        (row) =>
          row.counterpartyName.toLowerCase().includes(q) ||
          row.basis.toLowerCase().includes(q) ||
          row.orderId.toLowerCase().includes(q),
      );
      if (items.length === 0) return null;
      return {
        ...group,
        items,
        totalAmount: sumObligationAmounts(items),
      };
    })
    .filter((group): group is SettlementPartnerGroup => group !== null);
}

function filterCompleted(rows: SettlementCompleted[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (row) =>
      row.counterpartyName.toLowerCase().includes(q) ||
      row.basis.toLowerCase().includes(q),
  );
}

export function SettlementsHub({
  walletEmptyViewerRole,
  canLinkOnboardingHistory,
}: WalletEmptyViewerProps & {
  /** When true, store/company empty may link to `/history`. Omitted → STATIC. */
  canLinkOnboardingHistory?: boolean;
}) {
  const [tab, setTab] = useState<SettlementsTab>("receivable");
  const [searchQ, setSearchQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [data, setData] = useState<SettlementsResponse | null>(null);
  const [payoutTarget, setPayoutTarget] = useState<PayoutRecordTarget | null>(null);
  const [refreshNotice, setRefreshNotice] = useState("");
  const [backgroundRefreshEnabled, setBackgroundRefreshEnabled] = useState(true);
  const loadGenerationRef = useRef(0);
  const hasLoadedDataRef = useRef(false);

  const load = useCallback(async (options?: { background?: boolean }) => {
    const generation = ++loadGenerationRef.current;
    const background = Boolean(options?.background);
    const preserveOnError = background && hasLoadedDataRef.current;
    if (!preserveOnError) {
      setError("");
      setAccessDenied(false);
    }
    if (!background || !hasLoadedDataRef.current) {
      setLoading(true);
    }
    try {
      const response = await fetchSettlements();
      if (generation !== loadGenerationRef.current) return;
      setData(response);
      hasLoadedDataRef.current = true;
      setRefreshNotice("");
      setError("");
      setAccessDenied(false);
    } catch (caught) {
      if (generation !== loadGenerationRef.current) return;
      if (isWalletRefreshUnauthorized(caught) || isSettlementsAccessDenied(caught)) {
        setBackgroundRefreshEnabled(false);
        setData(null);
        hasLoadedDataRef.current = false;
        if (isSettlementsAccessDenied(caught)) {
          setAccessDenied(true);
        } else {
          setError("Сессия завершилась. Войдите снова.");
        }
        return;
      }
      if (preserveOnError) {
        setRefreshNotice(WALLET_STALE_DATA_NOTICE);
        return;
      }
      setData(null);
      hasLoadedDataRef.current = false;
      setError(
        isWalletRefreshUnauthorized(caught)
          ? "Сессия завершилась. Войдите снова."
          : caught instanceof RemcardApiError
            ? caught.message
            : "Не удалось загрузить взаиморасчёты",
      );
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onVisibleRefresh = useCallback(
    (_reason: WalletRefreshReason) => {
      void load({ background: true });
    },
    [load],
  );

  useWalletVisibleRefresh({
    enabled: backgroundRefreshEnabled,
    scopeKey: "settlements-hub",
    onRefresh: onVisibleRefresh,
  });

  const receivableGroups = useMemo(
    () => groupObligationsByCounterparty(data?.receivable ?? []),
    [data?.receivable],
  );
  const payableGroups = useMemo(
    () => groupObligationsByCounterparty(data?.payable ?? []),
    [data?.payable],
  );

  const filteredReceivable = useMemo(
    () => filterPartnerGroups(receivableGroups, searchQ),
    [receivableGroups, searchQ],
  );
  const filteredPayable = useMemo(
    () => filterPartnerGroups(payableGroups, searchQ),
    [payableGroups, searchQ],
  );
  const filteredCompleted = useMemo(
    () => filterCompleted(data?.completed ?? [], searchQ),
    [data?.completed, searchQ],
  );

  const openPayoutModal = useCallback((row: SettlementObligation) => {
    if (!row.payoutActions) return;
    setPayoutTarget({
      bonusId: row.id,
      counterpartyName: row.counterpartyName,
      amount: row.amount,
      basis: row.basis,
      payoutActions: row.payoutActions,
    });
  }, []);

  const receivableTotal = sumObligationAmounts(data?.receivable ?? []);
  const payableTotal = sumObligationAmounts(data?.payable ?? []);
  const pendingReceivable = (data?.receivable ?? []).reduce(
    (sum, row) => sum + (row.pendingAmount ?? 0),
    0,
  );
  const pendingPayable = (data?.payable ?? []).reduce(
    (sum, row) => sum + (row.pendingAmount ?? 0),
    0,
  );

  if (loading && !data) {
    return <div className={styles.loading}>Загружаем взаиморасчёты…</div>;
  }

  if (accessDenied) {
    return (
      <div className={styles.error} role="alert">
        <p>Раздел взаиморасчётов недоступен для этого аккаунта.</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className={styles.error} role="alert">
        <p>{error}</p>
        <Button type="button" onClick={() => void load()}>
          Повторить
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.error} role="alert">
        <p>Не удалось загрузить взаиморасчёты.</p>
        <Button type="button" onClick={() => void load()}>
          Повторить
        </Button>
      </div>
    );
  }

  if (
    isWalletSettlementsDataEmpty(data) &&
    searchQ.trim() === "" &&
    isSupportedWalletEmptyViewerRole(walletEmptyViewerRole)
  ) {
    return (
      <div className={styles.settlementDemo} data-testid="settlements-hub">
        <WalletSectionEmptyState
          role={walletEmptyViewerRole}
          canLinkOnboardingHistory={canLinkOnboardingHistory}
        />
      </div>
    );
  }

  return (
    <div className={styles.settlementDemo} data-testid="settlements-hub">
      {refreshNotice ? (
        <p className={styles.note} role="status" data-testid="settlements-refresh-notice">
          {refreshNotice}
        </p>
      ) : null}
      <p className={styles.note}>{SETTLEMENTS_COVERAGE_NOTE}</p>

      <div className={styles.summary}>
        <button
          type="button"
          className={`${styles.summaryCard} ${styles.summaryCardButton} ${styles.summaryCardReceivable}`}
          aria-pressed={tab === "receivable"}
          onClick={() => setTab("receivable")}
        >
          <p className={styles.summaryLabel}>Мне должны</p>
          <p className={styles.summaryValue}>{formatMoneyRub(receivableTotal)}</p>
          <p className={styles.summaryTileFooter}>
            {pendingReceivable > 0 ? (
              <span className={styles.summaryTileFooterMuted}>
                Ожидает подтверждения: {formatMoneyRub(pendingReceivable)}
              </span>
            ) : (
              <span className={styles.summaryTileFooterMuted} />
            )}
            <span className={styles.summaryTileFooterAction}>Посмотреть партнёров →</span>
          </p>
        </button>
        <button
          type="button"
          className={`${styles.summaryCard} ${styles.summaryCardButton}`}
          aria-pressed={tab === "payable"}
          onClick={() => setTab("payable")}
        >
          <p className={styles.summaryLabel}>Я должен</p>
          <p className={styles.summaryValue}>{formatMoneyRub(payableTotal)}</p>
          <p className={styles.summaryTileFooter}>
            {pendingPayable > 0 ? (
              <span className={styles.summaryTileFooterMuted}>
                Ожидает подтверждения: {formatMoneyRub(pendingPayable)}
              </span>
            ) : (
              <span className={styles.summaryTileFooterMuted} />
            )}
            <span className={styles.summaryTileFooterAction}>Посмотреть партнёров →</span>
          </p>
        </button>
      </div>

      <div className={styles.summaryActions}>
        <Button
          type="button"
          variant="secondary"
          aria-pressed={tab === "completed"}
          data-testid="settlements-completed-history"
          onClick={() => setTab("completed")}
        >
          Завершённые взаиморасчёты ({data.completed.length})
        </Button>
      </div>

      <Tabs items={TAB_ITEMS} active={tab} onChange={setTab} />

      <details className={styles.searchDrawer}>
        <summary>Поиск и фильтры</summary>
        <input
          className={styles.searchField}
          aria-label="Поиск по партнёру или сертификату"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Партнёр, сертификат, заказ…"
        />
      </details>

      {tab === "receivable" ? (
        filteredReceivable.length === 0 ? (
          <div className={styles.empty}>Открытых начислений «мне должны» нет.</div>
        ) : (
          <div className={styles.list}>
            {filteredReceivable.map((group) => (
              <PartnerGroupBlock key={group.counterpartyId} group={group} />
            ))}
          </div>
        )
      ) : null}

      {tab === "payable" ? (
        filteredPayable.length === 0 ? (
          <div className={styles.empty}>Открытых обязательств «я должен» нет.</div>
        ) : (
          <div className={styles.list}>
            {filteredPayable.map((group) => (
              <PartnerGroupBlock
                key={group.counterpartyId}
                group={group}
                onRecordPayout={openPayoutModal}
              />
            ))}
          </div>
        )
      ) : null}

      {tab === "completed" ? (
        filteredCompleted.length === 0 ? (
          <div className={styles.empty}>Завершённых взаиморасчётов пока нет.</div>
        ) : (
          <div className={styles.list}>
            {filteredCompleted.map((row) => (
              <CompletedRow key={`${row.id}-${row.paidAt}`} row={row} />
            ))}
          </div>
        )
      ) : null}

      {payoutTarget ? (
        <PayoutRecordModal
          target={payoutTarget}
          onClose={() => setPayoutTarget(null)}
          onSuccess={async () => {
            await load();
            setPayoutTarget(null);
          }}
        />
      ) : null}
    </div>
  );
}
