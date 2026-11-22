"use client";

import { MiniAppSubpage } from "./MiniAppSubpage";
import { MiniIconExternal } from "./MiniAppIcons";
import styles from "./mini-app.module.css";

type Props = {
  partnersUrl: string;
  onBack: () => void;
};

export function MiniAppFullCabinet({ partnersUrl, onBack }: Props) {
  return (
    <MiniAppSubpage backLabel="← Назад" title="Полный кабинет" onBack={onBack}>
      <p className={styles.subpageLead}>
        Здесь мини-приложение откроет раздел «Партнёры» в RemCard.
      </p>
      <div className={styles.infoCard}>
        <h2 className={styles.infoCardTitle}>Что остаётся в полном кабинете</h2>
        <p className={styles.infoCardText}>
          История кошелька, список сертификатов, оформление покупок, поиск партнёров и настройки.
        </p>
      </div>
      <a
        className={styles.primaryBtn}
        href={partnersUrl}
        target="_blank"
        rel="noreferrer"
        data-testid="mini-open-partners"
      >
        <MiniIconExternal />
        Открыть партнёров
      </a>
    </MiniAppSubpage>
  );
}
