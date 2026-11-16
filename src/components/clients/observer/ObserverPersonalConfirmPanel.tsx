"use client";

import type { ObserverPersonalPersistenceStatus } from "./ObserverPersonalEditPanel";

type Props = {
  confirmTargetKey: string;
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
  confirmTargetKey,
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
        : persistenceStatus === "error"
          ? `Повторить: ${c.confirm}`
          : c.confirm;

  return (
    <section
      className="panel ca-personal-confirm"
      role="region"
      aria-label="Подтверждение действия"
      data-testid="ca-observer-personal-confirm"
      data-confirm-target-key={confirmTargetKey}
      data-persistence-status={persistenceStatus}
    >
      <h3>{c.title}</h3>
      <p>
        Выбрано записей: {count}. {c.body}
      </p>
      {persistenceStatus === "blocked" ? (
        <p className="small muted">Сохранение личного списка сейчас недоступно. Данные партнёров не меняются.</p>
      ) : null}
      {partialError ? (
        <p className="ca-personal-notice" role="alert">
          {partialError}
        </p>
      ) : null}
      <div className="ca-personal-actions">
        <button type="button" className="btn ghost" data-observer-action="cancel" onClick={onCancel}>
          Отмена
        </button>
        <button
          type="button"
          className="btn primary"
          data-observer-action="confirm"
          disabled={confirmBlocked}
          aria-disabled={confirmBlocked}
          onClick={() => {
            if (persistenceStatus === "pending") return;
            if (!confirmBlocked) onConfirm();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </section>
  );
}
