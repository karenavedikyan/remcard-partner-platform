"use client";

import type { ObserverPersonalPersistenceStatus } from "./ObserverPersonalEditPanel";
import styles from "./observer.module.css";

type Props = {
  kind: "archived" | "trash" | "restore";
  count: number;
  persistenceStatus: ObserverPersonalPersistenceStatus;
  persistenceError?: string | null;
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
  persistenceStatus,
  persistenceError,
  onCancel,
  onConfirm,
}: Props) {
  const c = COPY[kind];
  const confirmAllowed = persistenceStatus === "ready" || persistenceStatus === "error";
  return (
    <section
      className={styles.confirmPanel}
      role="region"
      aria-label="Подтверждение действия"
      data-testid="ca-observer-personal-confirm"
    >
      <h3>{c.title}</h3>
      <p>
        Выбрано записей: {count}. {c.body}
      </p>
      {persistenceError ? (
        <p className={styles.persistenceNotice} role="alert">
          {persistenceError}
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
          disabled={!confirmAllowed}
          aria-disabled={!confirmAllowed}
          data-persistence-status={persistenceStatus}
          onClick={onConfirm}
        >
          {persistenceStatus === "pending" ? "Выполняется…" : c.confirm}
        </button>
      </div>
    </section>
  );
}
