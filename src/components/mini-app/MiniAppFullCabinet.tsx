"use client";

import { MiniAppSubpage } from "./MiniAppSubpage";
import { MiniIconExternal } from "./MiniAppIcons";
import styles from "./mini-app.module.css";

type Props = {
  partnersUrl: string;
  onBack: () => void;
  onOpenLink?: (url: string) => void;
};

export function MiniAppFullCabinet({ partnersUrl, onBack, onOpenLink }: Props) {
  return (
    <div data-testid="mini-full-cabinet">
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
      <button
        type="button"
        className={styles.primaryBtn}
        data-testid="mini-open-partners"
        onClick={() => (onOpenLink ? onOpenLink(partnersUrl) : window.open(partnersUrl, "_blank"))}
      >
        <MiniIconExternal />
        Открыть партнёров
      </button>
    </MiniAppSubpage>
    </div>
  );
}
