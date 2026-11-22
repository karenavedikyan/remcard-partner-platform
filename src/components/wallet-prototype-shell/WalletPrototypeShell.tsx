"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import styles from "./wallet-prototype-shell.module.css";

export type WalletPrototypeTab = "settlements" | "payouts" | "requisites";

export type WalletPrototypeShellProps = {
  shellTestId: string;
  settlementsTabTestId: string;
  payoutsTabTestId: string;
  requisitesTabTestId: string;
  requisitesScopeTestId: string;
  settlements: ReactNode;
  payouts: ReactNode;
  requisites: ReactNode;
  defaultTab?: WalletPrototypeTab;
  settlementsTabLabel?: string;
};

const TAB_ORDER: WalletPrototypeTab[] = ["settlements", "payouts", "requisites"];

export function WalletPrototypeShell({
  shellTestId,
  settlementsTabTestId,
  payoutsTabTestId,
  requisitesTabTestId,
  requisitesScopeTestId,
  settlements,
  payouts,
  requisites,
  defaultTab = "settlements",
  settlementsTabLabel = "Взаиморасчёты",
}: WalletPrototypeShellProps) {
  const [tab, setTab] = useState<WalletPrototypeTab>(defaultTab);
  const tablistId = useId();
  const settlementsTabRef = useRef<HTMLButtonElement>(null);
  const payoutsTabRef = useRef<HTMLButtonElement>(null);
  const requisitesTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  const focusTab = useCallback((next: WalletPrototypeTab) => {
    setTab(next);
    queueMicrotask(() => {
      const target =
        next === "settlements"
          ? settlementsTabRef.current
          : next === "payouts"
            ? payoutsTabRef.current
            : requisitesTabRef.current;
      target?.focus();
    });
  }, []);

  const onTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, current: WalletPrototypeTab) => {
      const index = TAB_ORDER.indexOf(current);
      if (index < 0) return;

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        focusTab(TAB_ORDER[(index + 1) % TAB_ORDER.length]!);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        focusTab(TAB_ORDER[(index + TAB_ORDER.length - 1) % TAB_ORDER.length]!);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusTab("settlements");
      } else if (event.key === "End") {
        event.preventDefault();
        focusTab("requisites");
      }
    },
    [focusTab],
  );

  const panelLabel =
    tab === "settlements"
      ? `${tablistId}-settlements`
      : tab === "payouts"
        ? `${tablistId}-payouts`
        : `${tablistId}-requisites`;

  return (
    <div
      className={`${styles.pw} ${styles.cabSections}`}
      data-testid={shellTestId}
      data-wallet-tab={tab}
    >
      <div className={styles.walletActions}>
        <div className={styles.tabs} role="tablist" aria-label="Кошелёк" id={tablistId}>
          <button
            ref={settlementsTabRef}
            type="button"
            role="tab"
            id={`${tablistId}-settlements`}
            aria-selected={tab === "settlements"}
            aria-controls={`${tablistId}-panel`}
            tabIndex={tab === "settlements" ? 0 : -1}
            className={`${styles.tab} ${tab === "settlements" ? styles.tabActive : ""}`}
            onClick={() => setTab("settlements")}
            onKeyDown={(event) => onTabKeyDown(event, "settlements")}
            data-testid={settlementsTabTestId}
          >
            {settlementsTabLabel}
          </button>
          <button
            ref={payoutsTabRef}
            type="button"
            role="tab"
            id={`${tablistId}-payouts`}
            aria-selected={tab === "payouts"}
            aria-controls={`${tablistId}-panel`}
            tabIndex={tab === "payouts" ? 0 : -1}
            className={`${styles.tab} ${tab === "payouts" ? styles.tabActive : ""}`}
            onClick={() => setTab("payouts")}
            onKeyDown={(event) => onTabKeyDown(event, "payouts")}
            data-testid={payoutsTabTestId}
          >
            Выплаты
          </button>
          <button
            ref={requisitesTabRef}
            type="button"
            role="tab"
            id={`${tablistId}-requisites`}
            aria-selected={tab === "requisites"}
            aria-controls={`${tablistId}-panel`}
            tabIndex={tab === "requisites" ? 0 : -1}
            className={`${styles.tab} ${tab === "requisites" ? styles.tabActive : ""}`}
            onClick={() => setTab("requisites")}
            onKeyDown={(event) => onTabKeyDown(event, "requisites")}
            data-testid={requisitesTabTestId}
          >
            Реквизиты
          </button>
        </div>
      </div>
      <div
        className={styles.panel}
        role="tabpanel"
        id={`${tablistId}-panel`}
        aria-labelledby={panelLabel}
      >
        {tab === "settlements" ? (
          settlements
        ) : tab === "payouts" ? (
          payouts
        ) : (
          <div className={styles.requisitesScope} data-testid={requisitesScopeTestId}>
            {requisites}
          </div>
        )}
      </div>
    </div>
  );
}