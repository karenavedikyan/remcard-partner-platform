"use client";

import {
  useCallback,
  useId,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import styles from "./wallet-prototype-shell.module.css";

export type WalletPrototypeTab = "settlements" | "requisites";

export type WalletPrototypeShellProps = {
  shellTestId: string;
  settlementsTabTestId: string;
  requisitesTabTestId: string;
  requisitesScopeTestId: string;
  settlements: ReactNode;
  requisites: ReactNode;
  defaultTab?: WalletPrototypeTab;
};

const TAB_ORDER: WalletPrototypeTab[] = ["settlements", "requisites"];

export function WalletPrototypeShell({
  shellTestId,
  settlementsTabTestId,
  requisitesTabTestId,
  requisitesScopeTestId,
  settlements,
  requisites,
  defaultTab = "settlements",
}: WalletPrototypeShellProps) {
  const [tab, setTab] = useState<WalletPrototypeTab>(defaultTab);
  const tablistId = useId();

  const focusTab = useCallback(
    (next: WalletPrototypeTab) => {
      setTab(next);
      const testId = next === "settlements" ? settlementsTabTestId : requisitesTabTestId;
      queueMicrotask(() => {
        document.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)?.focus();
      });
    },
    [requisitesTabTestId, settlementsTabTestId],
  );

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

  return (
    <div
      className={`${styles.pw} ${styles.cabSections}`}
      data-testid={shellTestId}
      data-wallet-tab={tab}
    >
      <div className={styles.walletActions}>
        <div className={styles.tabs} role="tablist" aria-label="Кошелёк" id={tablistId}>
          <button
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
            Взаиморасчёты
          </button>
          <button
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
        aria-labelledby={tab === "settlements" ? `${tablistId}-settlements` : `${tablistId}-requisites`}
      >
        {tab === "settlements" ? (
          settlements
        ) : (
          <div className={styles.requisitesScope} data-testid={requisitesScopeTestId}>
            {requisites}
          </div>
        )}
      </div>
    </div>
  );
}
