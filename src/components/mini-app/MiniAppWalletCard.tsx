"use client";

import { formatHistoryTotalParts } from "@/lib/wallet-accruals/format";
import type { MiniAppBootstrap } from "@/lib/mini-app/types";
import styles from "./mini-app.module.css";

type Props = {
  bootstrap: MiniAppBootstrap;
  onCardClick: () => void;
};

export function MiniAppWalletCard({ bootstrap, onCardClick }: Props) {
  const wallet = bootstrap.wallet;
  const confirmed =
    wallet.status === "ok"
      ? formatHistoryTotalParts(wallet.confirmedUnpaidRub)
      : { amount: "—", currency: "" };
  const waiting =
    wallet.status === "ok"
      ? formatHistoryTotalParts(wallet.awaitingRub)
      : { amount: "—", currency: "" };

  return (
    <div className={styles.cardWrap}>
      <button
        type="button"
        className={styles.walletCard}
        data-testid="mini-app-wallet-card"
        aria-label="Кошелёк RemCard"
        onClick={onCardClick}
      >
        <div className={styles.walletHead}>
          <span className={styles.walletRibbon}>{bootstrap.roleLabel}</span>
          <span className={styles.walletLockup} aria-hidden="true">
            remcard<span className={styles.walletLockupDot}>.</span>
          </span>
        </div>
        <span className={styles.walletCardFab} aria-hidden="true">
          →
        </span>
        <div className={styles.walletBody}>
          {bootstrap.presentation.cardIdentifier ? (
            <p className={styles.walletLabel}>{bootstrap.presentation.cardIdentifier}</p>
          ) : null}
          <p className={styles.walletLabel}>Начислено к получению</p>
          <div className={styles.walletHero}>
            <strong className={styles.walletAmount}>
              {wallet.status !== "ok" ? "—" : confirmed.amount}
            </strong>
            <span className={styles.walletUnit}>{confirmed.currency || " ₽"}</span>
          </div>
          {wallet.status === "error" ? (
            <p className={styles.walletNotice} role="alert">
              {wallet.message}
            </p>
          ) : null}
          {wallet.status === "unavailable" ? (
            <p className={styles.walletNotice}>{wallet.message}</p>
          ) : null}
          <p className={`${styles.walletLabel} ${styles.walletLabelSecondary}`}>Ожидает подтверждения</p>
          <div className={styles.walletWaitingRow}>
            <strong className={styles.walletWaitingAmount}>{waiting.amount}</strong>
            <span className={styles.walletWaitingUnit}>{waiting.currency || " ₽"}</span>
          </div>
        </div>
      </button>
    </div>
  );
}