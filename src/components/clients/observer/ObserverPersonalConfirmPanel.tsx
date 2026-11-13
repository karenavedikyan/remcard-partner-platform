"use client";

import styles from "./observer.module.css";

type Props = {
  kind: "archived" | "trash" | "restore";
  count: number;
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

export function ObserverPersonalConfirmPanel({ kind, count, onCancel, onConfirm }: Props) {
  const c = COPY[kind];
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
      <div className={styles.personalActions}>
        <button type="button" className={styles.ghostBtn} data-observer-action="cancel" onClick={onCancel}>
          Отмена
        </button>
        <button
          type="button"
          className={styles.primaryBtn}
          data-observer-action="confirm"
          onClick={onConfirm}
        >
          {c.confirm}
        </button>
      </div>
    </section>
  );
}
