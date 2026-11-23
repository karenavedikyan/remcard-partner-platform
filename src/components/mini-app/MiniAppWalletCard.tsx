"use client";

import { useEffect, useState } from "react";
import { miniAppFetchWalletSettlements } from "@/lib/mini-app/api";
import type { MiniAppEmbeddedContext } from "@/lib/mini-app/embedded-context";
import type { MiniAppBootstrap, MiniAppPlatform } from "@/lib/mini-app/types";
import { computeMiniWalletCalc, miniWalletIncomingOnly, type MiniWalletCalc } from "@/lib/mini-app/wallet/calc";
import { miniWalletFixtureForRole } from "@/lib/mini-app/wallet/fixtures";
import { miniWalletSettlementsSearchParams } from "@/lib/mini-app/wallet/scope";
import { classifyMiniWalletFailure, miniWalletFailureMessage, type MiniWalletFailure } from "@/lib/mini-app/wallet/access-errors";
import type { SettlementsResponse } from "@/lib/settlements-types";
import { formatHistoryTotalParts } from "@/lib/wallet-accruals/format";
import type { WalletDirection } from "@/lib/wallet-accruals/types";
import styles from "./mini-app.module.css";

type Props = {
  bootstrap: MiniAppBootstrap;
  platform: MiniAppPlatform;
  branchId: string | null;
  embeddedContext: MiniAppEmbeddedContext;
  fixtureMode: boolean;
  fixtureWalletData?: SettlementsResponse;
  direction: WalletDirection;
  onDirectionChange: (direction: WalletDirection) => void;
  onCardClick: (data: SettlementsResponse | null) => void;
};

type Balance =
  | { status: "loading" }
  | { status: "ok"; calc: MiniWalletCalc; data: SettlementsResponse }
  | { status: MiniWalletFailure };

export function MiniAppWalletCard({
  bootstrap,
  platform,
  branchId,
  embeddedContext,
  fixtureMode,
  fixtureWalletData,
  direction,
  onDirectionChange,
  onCardClick,
}: Props) {
  const [balance, setBalance] = useState<Balance>(() => {
    if (!fixtureMode) return { status: "loading" };
    const data = fixtureWalletData ?? miniWalletFixtureForRole(bootstrap.role);
    return { status: "ok", calc: computeMiniWalletCalc(data, bootstrap.role, "all"), data };
  });
  const [attempt, setAttempt] = useState(0);
  const dual = !miniWalletIncomingOnly(bootstrap.role);
  const side = dual ? direction : "in";

  useEffect(() => {
    if (fixtureMode) return;
    let active = true;
    const settlementsSearchParams = miniWalletSettlementsSearchParams({ bootstrap, branchId, ledgerScope: "branch" });
    void (async () => {
      try {
        const data = await miniAppFetchWalletSettlements(platform, { embeddedContext, settlementsSearchParams });
        if (active) setBalance({ status: "ok", calc: computeMiniWalletCalc(data, bootstrap.role, "all"), data });
      } catch (error) {
        if (active) setBalance({ status: classifyMiniWalletFailure(error) });
      }
    })();
    return () => {
      active = false;
    };
  }, [attempt, bootstrap, branchId, embeddedContext, fixtureMode, platform]);

  const totals = balance.status === "ok" ? balance.calc[side].totals : null;
  const confirmed = totals ? formatHistoryTotalParts(totals.confirmedRub) : null;
  const waiting = totals ? formatHistoryTotalParts(totals.waitingRub) : null;

  return (
    <div className={styles.cardWrap}>
      <section
        className={`${styles.walletCard} ${styles.walletCardInteractive} ${!dual && balance.status === "ok" ? styles.walletCardSingle : ""}`}
        data-testid="mini-app-wallet-card"
        aria-label="Кошелёк RemCard"
      >
        <div className={styles.walletHead}>
          <span className={styles.walletRibbon}>{bootstrap.roleLabel}</span>
          <span className={styles.walletLockup} aria-hidden="true">
            remcard<span className={styles.walletLockupDot}>.</span>
          </span>
        </div>
        <div className={styles.walletBody}>
          {balance.status === "ok" ? (
            <>
              <p className={styles.walletLabel}>
                {side === "in" ? "Начислено к получению" : "Начислено к оплате"}
              </p>
              <div className={styles.walletHero} data-testid="mini-wallet-card-confirmed">
                <strong className={styles.walletAmount}>{confirmed?.amount}</strong>
                <span className={styles.walletUnit}>{confirmed?.currency || " ₽"}</span>
              </div>
              <p className={`${styles.walletLabel} ${styles.walletLabelSecondary}`}>Ожидает подтверждения</p>
              <div className={styles.walletWaitingRow} data-testid="mini-wallet-card-waiting">
                <strong className={styles.walletWaitingAmount}>{waiting?.amount}</strong>
                <span className={styles.walletWaitingUnit}>{waiting?.currency || " ₽"}</span>
              </div>
            </>
          ) : balance.status === "loading" ? (
            <p className={styles.walletNotice} role="status">
              Загружаем баланс…
            </p>
          ) : balance.status === "error" ? (
            <div role="alert" data-testid="mini-wallet-card-error">
              <strong>Не удалось загрузить баланс</strong>
              <p className={styles.walletNotice}>Проверьте интернет и обновите баланс.</p>
            </div>
          ) : (
            <p className={styles.walletNotice} data-testid={`mini-wallet-card-${balance.status}`}>
              {miniWalletFailureMessage[balance.status]}
            </p>
          )}
        </div>
        {balance.status === "error" ? (
          <div className={styles.walletCardBar}>
            <button
              type="button"
              className={styles.walletRetryBtn}
              onClick={() => {
                setBalance({ status: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              Обновить баланс
            </button>
          </div>
        ) : balance.status !== "loading" && balance.status !== "session_expired" ? (
          <div className={styles.walletCardBar}>
            {dual && balance.status === "ok" ? (
              <div className={styles.walletHomeSwitch} role="group" aria-label="Направление баланса">
                <button type="button" aria-pressed={side === "in"} onClick={() => onDirectionChange("in")}>
                  Мне должны
                </button>
                <button type="button" aria-pressed={side === "out"} onClick={() => onDirectionChange("out")}>
                  Я должен
                </button>
              </div>
            ) : null}
            <button
              type="button"
              className={styles.walletCardFab}
              data-testid="mini-wallet-card-open"
              aria-label="Открыть кошелёк"
              onClick={() => onCardClick(balance.status === "ok" ? balance.data : null)}
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
