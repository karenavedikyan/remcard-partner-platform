"use client";

import styles from "./observer.module.css";
import type { ObserverPersonalPersistenceStatus } from "./ObserverPersonalEditPanel";

type Props = {
  kind: "archived" | "trash" | "restore";
  count: number;
  persistenceStatus?: ObserverPersonalPersistenceStatus;
  partialError?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

const COPY = {
  archived: {
    title: "Перенести в архив?",
    body: "Они останутся доступны во вкладке «Архив». Данные, статусы и покупки у партнёров не изменятся.",
    confirm: "В архив",
  },
  trash: {
    title: "Удалить только из своего списка?",
    body: "Они попадут в вашу корзину, откуда их можно восстановить. Данные у партнёров не изменятся.",
    confirm: "Удалить у себя",
  },
  restore: {
    title: "Восстановить в активный список?",
    body: "Записи вернутся в активный список. Данные партнёров не изменятся.",
    confirm: "Восстановить",
  },
};

export function ObserverPersonalConfirmPanel({
  kind,
  count,
  persistenceStatus = "blocked",
  partialError,
  onCancel,
  onConfirm,
}: Props) {
  const c = COPY[kind];
  const confirmBlocked = persistenceStatus === "blocked" || persistenceStatus === "pending";
  const confirmLabel =
    persistenceStatus === "pending"
      ? "Выполняется…"
      : persistenceStatus === "blocked"
        ? `${c.confirm} (недоступно)`
        : c.confirm;

  return (
    <section
      className={styles.confirmPanel}
      role="region"
      aria-label="Подтверждение действия"
      data-testid="ca-observer-personal-confirm"
      data-persistence-status={persistenceStatus}
    >
      <h3>{c.title}</h3>
      <p>
        Выбрано записей: {count}. {c.body}
      </p>
      {persistenceStatus === "blocked" ? (
        <p className={styles.mutedSmall}>
          Сохранение личного списка ожидает подтверждённого API personal-meta (P2). Данные партнёров и
          глобальный CRM не меняются.
        </p>
      ) : null}
      {partialError ? (
        <p className={styles.persistenceNotice} role="alert">
          {partialError}
        </p>
      ) : null}
      <div className={styles.personalActions}>
        <button type="button" className={styles.ghostBtn} data-observer-action="cancel" onClick={onCancel}>
          Отмена
        </button>
        <button
          type="button"
          className={styles.primaryBtn}
          data-observer-action="confirm"
          disabled={confirmBlocked}
          aria-disabled={confirmBlocked}
          title={persistenceStatus === "blocked" ? "BLOCKED_PERSISTENCE" : undefined}
          onClick={() => {
            if (!confirmBlocked) onConfirm();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </section>
  );
}
