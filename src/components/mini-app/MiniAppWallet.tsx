"use client";

import { useEffect, useMemo, useState } from "react";
import { formatHistoryTotalParts, formatIsoShort } from "@/lib/wallet-accruals/format";
import { formatMoneyRub } from "@/lib/history-format";
import { scheduleBadgeExtra } from "@/lib/wallet-accruals/detail-buckets";
import { miniAppFetchWalletSettlements } from "@/lib/mini-app/api";
import type { MiniAppActionId, MiniAppBootstrap, MiniAppPlatform } from "@/lib/mini-app/types";
import type { MiniAppEmbeddedContext } from "@/lib/mini-app/embedded-context";
import { classifyMiniWalletFailure, miniWalletFailureMessage, type MiniWalletFailure } from "@/lib/mini-app/wallet/access-errors";
import { computeMiniWalletCalc, type MiniWalletFilter, miniWalletIncomingOnly } from "@/lib/mini-app/wallet/calc";
import { miniWalletEmptyAction, miniWalletShowsGlobalEmptyState } from "@/lib/mini-app/wallet/empty";
import { miniWalletFixtureForRole } from "@/lib/mini-app/wallet/fixtures";
import {
  miniWalletSettlementsSearchParams,
  miniWalletBranchSelectionLabel,
  profWalletCabinetHref,
  type MiniWalletBranchSelection,
  type MiniWalletLedgerScope,
} from "@/lib/mini-app/wallet/scope";
import type { SettlementsResponse } from "@/lib/settlements-types";
import type { WalletDirection } from "@/lib/wallet-accruals/types";
import { MiniAppSubpage } from "./MiniAppSubpage";
import { MiniAppWalletEmpty } from "./MiniAppWalletEmpty";
import { MiniAppWalletBranchDenied } from "./MiniAppWalletBranchDenied";
import { MiniIconChevron, MiniIconPin } from "./MiniAppIcons";
import styles from "./mini-app.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "ok"; data: SettlementsResponse }
  | { status: MiniWalletFailure };

type Props = {
  platform: MiniAppPlatform;
  bootstrap: MiniAppBootstrap;
  branchId: string | null;
  branchSelection?: MiniWalletBranchSelection;
  embeddedContext: MiniAppEmbeddedContext;
  fixtureMode?: boolean;
  fixtureWalletData?: SettlementsResponse | null;
  initialDirection?: WalletDirection;
  initialData?: SettlementsResponse | null;
  onDirectionChange?: (direction: WalletDirection) => void;
  onBack: () => void;
  onOpenProfSettlements: (href: string) => void;
  onOpenBranchPicker?: () => void;
  onChooseWalletBranches?: () => void;
  onWalletBranchSelectionChange?: (next: MiniWalletBranchSelection) => void;
  onWalletAction?: (action: MiniAppActionId) => void;
};

export function MiniAppWallet({
  platform,
  bootstrap,
  branchId,
  branchSelection = null,
  embeddedContext,
  fixtureMode = false,
  fixtureWalletData = null,
  initialDirection = "in",
  initialData = null,
  onDirectionChange,
  onBack,
  onOpenProfSettlements,
  onOpenBranchPicker,
  onChooseWalletBranches,
  onWalletBranchSelectionChange,
  onWalletAction,
}: Props) {
  const incomingOnly = miniWalletIncomingOnly(bootstrap.role);
  const [direction, setDirection] = useState<WalletDirection>(incomingOnly ? "in" : initialDirection);
  function selectDirection(next: WalletDirection) {
    setDirection(next);
    setExpandedPartner(null);
    onDirectionChange?.(next);
  }
  const [filter, setFilter] = useState<MiniWalletFilter>("all");
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);
  const defaultScope = bootstrap.role === "store" || bootstrap.role === "company" ? "branch" : "all";
  const [localLedgerScope, setLocalLedgerScope] = useState<MiniWalletLedgerScope>(defaultScope);
  const ledgerScope = onWalletBranchSelectionChange
    ? (branchSelection === "all" ? "all" : defaultScope)
    : localLedgerScope;
  const [loadState, setLoadState] = useState<LoadState>(() =>
    initialData ? { status: "ok", data: initialData } : { status: "loading" },
  );
  const [attempt, setAttempt] = useState(0);
  const [canSwitchLedger, setCanSwitchLedger] = useState(Boolean(initialData?.canSwitchBranchLedgerScope));

  function selectLedgerScope(next: MiniWalletLedgerScope) {
    if (onWalletBranchSelectionChange) {
      onWalletBranchSelectionChange(next === "all" ? "all" : null);
      return;
    }
    if (next === ledgerScope) return;
    setLoadState({ status: "loading" });
    setExpandedPartner(null);
    setLocalLedgerScope(next);
    setAttempt((n) => n + 1); // The home snapshot is only valid for the initial hand-off.
  }

  const canSwitchBranch =
    (bootstrap.role === "store" || bootstrap.role === "company") &&
    bootstrap.branches.length > 1 &&
    Boolean(onOpenBranchPicker);

  const showLedgerScopeToggle =
    !fixtureMode &&
    canSwitchLedger &&
    (bootstrap.role === "store" || bootstrap.role === "company") &&
    Boolean(branchId || onChooseWalletBranches);

  useEffect(() => {
    if (initialData && (onWalletBranchSelectionChange || ledgerScope === defaultScope) && attempt === 0) {
      setLoadState({ status: "ok", data: initialData });
      return;
    }
    if (fixtureMode) {
      setLoadState({
        status: "ok",
        data: fixtureWalletData ?? miniWalletFixtureForRole(bootstrap.role),
      });
      return;
    }
    let active = true;
    setLoadState({ status: "loading" });
    void (async () => {
      try {
        const settlementsSearchParams = miniWalletSettlementsSearchParams({ bootstrap, ledgerScope, branchId, branchSelection });
        const data = await miniAppFetchWalletSettlements(platform, { embeddedContext, settlementsSearchParams });
        if (active) {
          setCanSwitchLedger(Boolean(data.canSwitchBranchLedgerScope));
          setLoadState({ status: "ok", data });
        }
      } catch (err) {
        if (active) {
          const status = classifyMiniWalletFailure(err);
          if (status === "forbidden" || status === "session_expired") setCanSwitchLedger(false);
          setLoadState({ status });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [attempt, bootstrap, branchId, branchSelection, defaultScope, embeddedContext, fixtureMode, fixtureWalletData, initialData, ledgerScope, onWalletBranchSelectionChange, platform]);

  const calc = useMemo(() => {
    if (loadState.status !== "ok") return null;
    return computeMiniWalletCalc(loadState.data, bootstrap.role, filter);
  }, [bootstrap.role, filter, loadState]);

  const dirCalc = calc ? (direction === "in" ? calc.in : calc.out) : null;
  const totals = dirCalc?.totals;
  const scopeLabel = miniWalletBranchSelectionLabel(branchSelection, bootstrap);
  const paidLabel = direction === "in" ? "Получено" : "Выплачено";
  const heroLabel = direction === "in" ? "Начислено к получению" : "Начислено к оплате";
  const heroHint =
    direction === "in"
      ? "Подтверждённые обязательства партнёров перед вами"
      : "Подтверждённые обязательства перед вашими партнёрами";

  const settlementsUrl = profWalletCabinetHref(bootstrap);
  const profLinkLabel = incomingOnly
    ? "Выплаты и реестр в полном кабинете"
    : "Открыть выплаты в полном кабинете";

  const showGlobalEmpty =
    loadState.status === "ok" && miniWalletShowsGlobalEmptyState(filter, loadState.data);

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

  const entityLine =
    bootstrap.entityLine ??
    (bootstrap.displayName && bootstrap.role !== "store" && bootstrap.role !== "company"
      ? bootstrap.displayName
      : null);

  return (
    <MiniAppSubpage
      title="Кошелёк"
      onBack={onBack}
      lead={
        incomingOnly
          ? "Вознаграждения от партнёров по подтверждённым покупкам."
          : "Взаиморасчёты с партнёрами по подтверждённым покупкам."
      }
    >
      {entityLine ? <p className={styles.heroIntro}>{entityLine}</p> : null}
      {bootstrap.presentation.cardIdentifier ? (
        <p className={styles.scanNotice}>{bootstrap.presentation.cardIdentifier}</p>
      ) : null}

      {canSwitchBranch ? (
        <div className={styles.mwWorkplaceRow} data-testid="mini-wallet-workplace">
          <span className={styles.workplacePin}>
            <MiniIconPin />
            {bootstrap.workplaceLabel ?? "Сейчас филиал не выбран"}
          </span>
          <button type="button" className={styles.mwWorkplaceSwitch} onClick={onOpenBranchPicker}>
            {bootstrap.workplaceLabel ? "Сменить точку" : "Выбрать точку"}
            <MiniIconChevron />
          </button>
        </div>
      ) : bootstrap.workplaceLabel ? (
        <p className={styles.workplacePin} data-testid="mini-wallet-workplace">
          <MiniIconPin />
          {bootstrap.workplaceLabel}
        </p>
      ) : null}

      {showLedgerScopeToggle ? (
        <div className={styles.mwScopeRow} role="group" aria-label="Охват филиалов">
          <button
            type="button"
            className={`${styles.mwScopeBtn} ${ledgerScope === "branch" && !branchSelection ? styles.mwScopeBtnActive : ""}`}
            data-testid="mini-wallet-scope-branch"
            aria-pressed={ledgerScope === "branch" && !branchSelection}
            onClick={() => selectLedgerScope("branch")}
          >
            По точке: {bootstrap.workplaceLabel ?? "филиал"}
          </button>
          <button
            type="button"
            className={`${styles.mwScopeBtn} ${ledgerScope === "all" ? styles.mwScopeBtnActive : ""}`}
            data-testid="mini-wallet-scope-all"
            aria-pressed={ledgerScope === "all"}
            onClick={() => selectLedgerScope("all")}
          >
            Все филиалы ({bootstrap.branches.length})
          </button>
        </div>
      ) : null}

      {onChooseWalletBranches ? (
        <button
          type="button"
          className={styles.secondaryBtn}
          aria-label="Выбрать филиалы для кошелька"
          onClick={onChooseWalletBranches}
        >
          {scopeLabel ?? "Выбрать филиалы для кошелька"} <MiniIconChevron />
        </button>
      ) : null}

      {loadState.status === "loading" ? (
        <p className={styles.scanNotice} data-testid="mini-wallet-loading">
          Загрузка обязательств…
        </p>
      ) : null}

      {loadState.status === "branch_denied" ? (
        <MiniAppWalletBranchDenied
          branchLabel={scopeLabel ?? bootstrap.workplaceLabel ?? "Выбранный филиал"}
          canPickOtherBranch={Boolean(onChooseWalletBranches) || canSwitchBranch}
          onPickOtherBranch={onChooseWalletBranches ?? onOpenBranchPicker}
        />
      ) : null}

      {loadState.status === "forbidden" ? (
        <div className={styles.blockedPanel} role="alert" data-testid="mini-wallet-forbidden">
          <p>{miniWalletFailureMessage.forbidden}</p>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => onOpenProfSettlements(settlementsUrl)}
          >
            Открыть кошелёк в полном кабинете
          </button>
        </div>
      ) : null}

      {loadState.status === "error" || loadState.status === "session_expired" || loadState.status === "branch_required" ? (
        <div className={styles.blockedPanel} role="alert" data-testid={`mini-wallet-${loadState.status}`}>
          <p>{miniWalletFailureMessage[loadState.status]}</p>
          {loadState.status === "error" ? (
            <button type="button" className={styles.secondaryBtn} onClick={() => setAttempt((n) => n + 1)}>
              Повторить загрузку
            </button>
          ) : null}
          {loadState.status === "branch_required" && onOpenBranchPicker ? (
            <button type="button" className={styles.secondaryBtn} onClick={onOpenBranchPicker}>Выбрать филиал</button>
          ) : null}
        </div>
      ) : null}

      {showGlobalEmpty && loadState.status === "ok" ? (
        <MiniAppWalletEmpty
          role={bootstrap.role}
          identifierLine={bootstrap.presentation.cardIdentifier}
          primaryActionId={miniWalletEmptyAction(bootstrap, loadState.data.walletReadScope)}
          onPrimaryAction={onWalletAction}
          onOpenProfSettlements={() => onOpenProfSettlements(settlementsUrl)}
          profLinkLabel={profLinkLabel}
        />
      ) : null}

      {calc && totals && !showGlobalEmpty ? (
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
                onClick={() => selectDirection("in")}
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
                onClick={() => selectDirection("out")}
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
                aria-pressed={filter === chip.id}
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
                <p className={styles.scanNotice} data-testid="mini-wallet-filter-empty">
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
            {profLinkLabel}
          </button>
        </>
      ) : null}
    </MiniAppSubpage>
  );
}
