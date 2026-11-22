"use client";

import { formatHistoryTotalParts } from "@/lib/wallet-accruals/format";
import type { MiniAppBootstrap } from "@/lib/mini-app/types";
import "@/components/wallet-accruals/wallet-accruals.global.css";
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
        className="wallet-rc-card wallet-rc-card--black"
        data-testid="mini-app-wallet-card"
        aria-label="Кошелёк RemCard"
        onClick={onCardClick}
      >
        <div className="wallet-rc-card__head">
          <span className="wallet-rc-card__ribbon wallet-rc-card__ribbon--role" aria-hidden="true">
            {bootstrap.roleLabel}
          </span>
          <span className="wallet-rc-lockup" aria-hidden="true">
            <span className="wallet-rc-lockup__word">
              remcard<em className="wallet-rc-lockup__dot">.</em>
            </span>
          </span>
        </div>
        <div className="wallet-rc-card__body">
          <p className="wallet-rc-card__label">Начислено к получению</p>
          <div className="wallet-rc-card__hero">
            <strong className="wallet-rc-card__amount">
              {wallet.status !== "ok" ? "—" : confirmed.amount}
            </strong>
            <span className="wallet-rc-card__unit">{confirmed.currency || " ₽"}</span>
          </div>
          {wallet.status === "error" ? (
            <p className={styles.walletNotice} role="alert">
              {wallet.message}
            </p>
          ) : null}
          {wallet.status === "unavailable" ? (
            <p className={styles.walletNotice}>{wallet.message}</p>
          ) : null}
          <p className="wallet-rc-card__label wallet-rc-card__label--secondary">Ожидает подтверждения</p>
          <div className="wallet-rc-card__waiting-row">
            <strong className="wallet-rc-card__waiting-amount">{waiting.amount}</strong>
            <span className="wallet-rc-card__unit wallet-rc-card__unit--waiting">
              {waiting.currency || " ₽"}
            </span>
          </div>
        </div>
        <span className={styles.cardArrow} aria-hidden="true">
          →
        </span>
      </button>
    </div>
  );
}