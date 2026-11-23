"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { formatHistoryTotalParts, formatIsoShort } from "@/lib/wallet-accruals/format";
import { formatMoneyRub } from "@/lib/history-format";
import { scheduleBadgeExtra } from "@/lib/wallet-accruals/detail-buckets";
import { miniAppFetchWalletSettlements } from "@/lib/mini-app/api";
import type { MiniAppBootstrap, MiniAppPlatform } from "@/lib/mini-app/types";
import type { MiniAppEmbeddedContext } from "@/lib/mini-app/embedded-context";
import { computeMiniWalletCalc, type MiniWalletFilter, miniWalletIncomingOnly } from "@/lib/mini-app/wallet/calc";
import { miniWalletFixtureForRole } from "@/lib/mini-app/wallet/fixtures";
import type { SettlementsResponse } from "@/lib/settlements-types";
import { MiniAppSubpage } from "./MiniAppSubpage";
import styles from "./mini-app.module.css";

type WalletDirection = "in" | "out";

type LoadState =
  | { status: "loading" }
  | { status: "ok"; data: SettlementsResponse }
  | { status: "forbidden"; message: string }
  | { status: "error"; message: string; retryable: true };

type Props = {
  platform: MiniAppPlatform;
  bootstrap: MiniAppBootstrap;
  branchId: string | null;
  embeddedContext: MiniAppEmbeddedContext;
  fixtureMode?: boolean;
  onBack: () => void;
  onOpenProfSettlements: (href: string) => void;
};

export function MiniAppWallet({
  platform,
  bootstrap,
  branchId,
  embeddedContext,
  fixtureMode = false,
  onBack,
  onOpenProfSettlements,
}: Props) {
  const incomingOnly = miniWalletIncomingOnly(bootstrap.role);
  const [direction, setDirection] = useState<WalletDirection>("in");
  const [filter, setFilter] = useState<MiniWalletFilter>("all");
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  const loadWallet = useCallback(async () => {
    setLoadState({ status: "loading" });
    if (fixtureMode) {
      setLoadState({ status: "ok", data: miniWalletFixtureForRole(bootstrap.role) });
      return;
    }
    try {
      const data = await miniAppFetchWalletSettlements(platform, {
        branchId,
        embeddedContext,
      });
      setLoadState({ status: "ok", data });
    } catch (err) {
      if (err instanceof RemcardApiError && (err.status === 403 || err.status === 404)) {
        setLoadState({
          status: "forbidden",
          message: err.message || "Нет доступа к кошельку в этом филиале.",
        });
        return;
      }
      setLoadState({
        status: "error",
        message: err instanceof Error ? err.message : "Не удалось загрузить кошелёк",
        retryable: true,
      });
    }
  }, [bootstrap.role, branchId, embeddedContext, fixtureMode, platform]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const calc = useMemo(() => {
    if (loadState.status !== "ok") return null;
    return computeMiniWalletCalc(loadState.data, bootstrap.role, filter);
  }, [bootstrap.role, filter, loadState]);

  const dirCalc = calc ? (direction === "in" ? calc.in : calc.out) : null;
  const totals = dirCalc?.totals;
  const paidLabel = direction === "in" ? "Получено" : "Выплачено";
  const heroLabel = direction === "in" ? "К получению" : "К оплате";
  const heroHint =
    direction === "in"
      ? "Подтверждённые суммы, ещё не полученные"
      : "Подтверждённые обязательства к перечислению";

  const settlementsUrl = `${bootstrap.fullCabinetUrl.replace(/\/+$/, "")}${bootstrap.presentation.historyHref}`;

  const filterChips: Array<{ id: MiniWalletFilter; label: string; count: number }> = totals
    ? [
        { id: "all", label: "Все", count: totals.allCount },
        {
          id: "confirmed",
          label: direction === "in" ? "К получению" : "К оплате",
          count: totals.confirmedCount,
        },
        { id: "waiting", label: "Ожидает", count: totals.waitingCount },
        { id: "suspended", label: "Приостановлено", count: totals.suspendedCount },
        { id: "paid", label: paidLabel, count: totals.paidCount },
        { id: "schedule", label: "График", count: dirCalc?.scheduleCount ?? 0 },
      ]
    : [];

  return (
    <MiniAppSubpage title="Кошелёк" onBack={onBack}>
      {bootstrap.presentation.cardIdentifier ? (
        <p className={styles.scanNotice}>{bootstrap.presentation.cardIdentifier}</p>
      ) : null}
      {bootstrap.workplaceLabel ? (
        <p className={styles.workplacePin} data-testid="mini-wallet-workplace">
          {bootstrap.workplaceLabel}
        </p>
      ) : null}

      {loadState.status === "loading" ? (
        <p className={styles.scanNotice} data-testid="mini-wallet-loading">
          Загрузка обязательств…
        </p>
      ) : null}

      {loadState.status === "forbidden" ? (
        <div className={styles.blockedPanel} role="alert" data-testid="mini-wallet-forbidden">
          <p>{loadState.message}</p>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => onOpenProfSettlements(settlementsUrl)}
          >
            Открыть кошелёк в полном кабинете
          </button>
        </div>
      ) : null}

      {loadState.status === "error" ? (
        <div className={styles.blockedPanel} role="alert" data-testid="mini-wallet-error">
          <p>{loadState.message}</p>
          {loadState.retryable ? (
            <button type="button" className={styles.secondaryBtn} onClick={() => void loadWallet()}>
              Повторить загрузку
            </button>
          ) : null}
        </div>
      ) : null}

      {calc && totals ? (
        <>
          {!calc.incomingOnly ? (
            <div
              className={styles.mwDirTabs}
              role="tablist"
              aria-label="Направление расчётов"
              data-testid="mini-wallet-dir-tabs"
            >
              <button
                type="button"
                role="tab"
                aria-selected={direction === "in"}
                className={`${styles.mwDirTab} ${direction === "in" ? styles.mwDirTabActive : ""}`}
                data-testid="mini-wallet-tab-in"
                onClick={() => setDirection("in")}
              >
                <span className={styles.mwDirTabLabel}>Мне должны</span>
                <span className={styles.mwDirTabSum}>
                  {formatHistoryTotalParts(calc.in.totals.confirmedRub).amount}
                  {formatHistoryTotalParts(calc.in.totals.confirmedRub).currency || " ₽"}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={direction === "out"}
                className={`${styles.mwDirTab} ${direction === "out" ? styles.mwDirTabActive : ""}`}
                data-testid="mini-wallet-tab-out"
                onClick={() => setDirection("out")}
              >
                <span className={styles.mwDirTabLabel}>Я должен</span>
                <span className={styles.mwDirTabSum}>
                  {formatHistoryTotalParts(calc.out.totals.confirmedRub).amount}
                  {formatHistoryTotalParts(calc.out.totals.confirmedRub).currency || " ₽"}
                </span>
              </button>
            </div>
          ) : null}

          <section
            className={styles.mwSummary}
            aria-label="Сводка по статусам"
            data-testid="mini-wallet-summary"
          >
            <div>
              <p className={styles.mwSummaryHeroLabel}>{heroLabel}</p>
              <p className={styles.mwSummaryHeroValue} data-testid="mini-wallet-confirmed">
                {formatMoneyRub(totals.confirmedRub)}
              </p>
              <p className={styles.mwSummaryHeroHint}>{heroHint}</p>
            </div>
            <div className={styles.mwStatList}>
              <div className={styles.mwStatRow}>
                <span className={styles.mwStatLabelWrap}>
                  <span className={styles.mwStatLabel}>Ожидает подтверждения</span>
                  <span className={styles.mwStatNote}>· не в балансе</span>
                </span>
                <strong className={styles.mwStatValue} data-testid="mini-wallet-waiting">
                  {formatMoneyRub(totals.waitingRub)}
                </strong>
              </div>
              <div className={styles.mwStatRow}>
                <span className={styles.mwStatLabelWrap}>
                  <span className={styles.mwStatLabel}>Приостановлено</span>
                  <span className={styles.mwStatNote}>· на сверке</span>
                </span>
                <strong className={styles.mwStatValue} data-testid="mini-wallet-suspended">
                  {formatMoneyRub(totals.suspendedRub)}
                </strong>
              </div>
              <div className={styles.mwStatRow}>
                <span className={styles.mwStatLabelWrap}>
                  <span className={styles.mwStatLabel}>{paidLabel}</span>
                  <span className={styles.mwStatNote}>· закрыто</span>
                </span>
                <strong className={styles.mwStatValue} data-testid="mini-wallet-paid">
                  {formatMoneyRub(totals.paidRub)}
                </strong>
              </div>
            </div>
          </section>

          <div className={styles.mwChipRow} role="toolbar" aria-label="Фильтры кошелька">
            {filterChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className={`${styles.mwChip} ${filter === chip.id ? styles.mwChipActive : ""}`}
                data-testid={`mini-wallet-filter-${chip.id}`}
                onClick={() => {
                  setFilter(chip.id);
                  setExpandedPartner(null);
                }}
              >
                <span>{chip.label}</span>
                <span className={styles.mwChipCount}>{chip.count}</span>
              </button>
            ))}
          </div>

          {filter === "schedule" ? (
            <section className={styles.mwSchedule} aria-label="График подтверждений">
              {!dirCalc?.scheduleCount ? (
                <p className={styles.scanNotice}>Нет дат подтверждения для построения графика.</p>
              ) : (
                dirCalc.partnerGroups.flatMap((g) =>
                  g.lines
                    .filter((l) => l.kind === "waiting" && l.sortDate)
                    .map((line) => (
                      <div key={`${g.counterpartyId}-${line.lineId}`} className={styles.mwScheduleRow}>
                        <span>{formatIsoShort(line.sortDate)}</span>
                        <span className={styles.mwScheduleMid}>
                          {line.label} · {g.counterpartyName}
                        </span>
                        <strong>{formatMoneyRub(line.amountRub)}</strong>
                        {line.sortDate ? (
                          <span className={styles.mwScheduleBadge}>
                            {scheduleBadgeExtra(line.sortDate)}
                          </span>
                        ) : null}
                      </div>
                    )),
                )
              )}
            </section>
          ) : (
            <section className={styles.mwPartners} aria-label="Контрагенты">
              {dirCalc?.partnerGroups.length === 0 ? (
                <p className={styles.scanNotice} data-testid="mini-wallet-empty">
                  {totals.confirmedRub === 0 &&
                  totals.waitingRub === 0 &&
                  totals.suspendedRub === 0 &&
                  totals.paidRub === 0
                    ? "Баланс по выбранному направлению нулевой."
                    : "Нет операций по выбранному фильтру."}
                </p>
              ) : (
                dirCalc?.partnerGroups.map((group) => {
                  const open = expandedPartner === group.counterpartyId;
                  return (
                    <details
                      key={group.counterpartyId}
                      className={styles.mwPartnerGroup}
                      open={open}
                      data-testid={`mini-wallet-partner-${group.counterpartyId}`}
                      onToggle={(e) => {
                        const el = e.currentTarget;
                        setExpandedPartner(el.open ? group.counterpartyId : null);
                      }}
                    >
                      <summary className={styles.mwPartnerHead}>
                        <span className={styles.mwPartnerName}>{group.counterpartyName}</span>
                        <strong className={styles.mwPartnerSum}>{formatMoneyRub(group.totalRub)}</strong>
                      </summary>
                      <ul className={styles.mwPartnerBody}>
                        {group.lines.map((line) => (
                          <li key={`${line.lineId}-${line.kind}`} className={styles.mwPartnerLine}>
                            <div className={styles.mwPartnerLineTop}>
                              <span>{line.label}</span>
                              <strong>{formatMoneyRub(line.amountRub)}</strong>
                            </div>
                            <p className={styles.mwPartnerMeta}>
                              Покупка {line.purchaseId}
                              {line.sortDate ? ` · ${formatIsoShort(line.sortDate)}` : ""}
                              {line.suspendedNote ? ` · ${line.suspendedNote}` : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </details>
                  );
                })
              )}
            </section>
          )}

          <button
            type="button"
            className={styles.secondaryBtn}
            data-testid="mini-wallet-full-cabinet"
            onClick={() => onOpenProfSettlements(settlementsUrl)}
          >
            {incomingOnly
              ? "Выплаты и реестр в полном кабинете"
              : "Открыть выплаты в полном кабинете"}
          </button>
        </>
      ) : null}
    </MiniAppSubpage>
  );
}