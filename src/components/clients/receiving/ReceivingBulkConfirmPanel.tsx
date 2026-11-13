"use client";

import styles from "../observer/observer.module.css";
import type { ReceivingBulkContractState } from "./ReceivingBulkActions";
import type { ReceivingBulkConfirmKind } from "./receiving-bulk-handoff";

type Props = {
  kind: ReceivingBulkConfirmKind;
  count: number;
  contractState?: ReceivingBulkContractState;
  partialError?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

const COPY: Record<
  ReceivingBulkConfirmKind,
  { title: string; body: string; confirm: string }
> = {
  archive: {
    title: "Переместить в архив?",
    body: "Этапы и покупки не изменятся.",
    confirm: "Подтвердить",
  },
  delete: {
    title: "Скрыть в корзину?",
    body: "История, покупки и сертификаты сохранятся. Глобального удаления нет.",
    confirm: "Подтвердить",
  },
  unarchive: {
    title: "Вернуть в активные?",
    body: "Обращения снова появятся в активном списке.",
    confirm: "Подтвердить",
  },
  restore: {
    title: "Восстановить из корзины?",
    body: "Обращения вернутся в прежний список (архив или активные).",
    confirm: "Подтвердить",
  },
};

export function ReceivingBulkConfirmPanel({
  kind,
  count,
  contractState = "blocked",
  partialError,
  onCancel,
  onConfirm,
}: Props) {
  const c = COPY[kind];
  const confirmBlocked = contractState === "blocked" || contractState === "pending";
  const confirmLabel =
    contractState === "pending"
      ? "Выполняется…"
      : contractState === "blocked"
        ? `${c.confirm} (недоступно)`
        : c.confirm;

  return (
    <section
      className={styles.confirmPanel}
      role="region"
      aria-label="Подтверждение группового действия"
      data-testid="ca-receiving-bulk-confirm"
      data-contract-state={contractState}
      data-confirm-kind={kind}
    >
      <h3>{c.title}</h3>
      <p>
        Выбрано обращений: {count}. {c.body}
      </p>
      {contractState === "blocked" ? (
        <p className={styles.mutedSmall}>
          Массовые действия — <code>POST /api/pro/client-appeals/batch</code> (K1). Без финансовых
          операций.
        </p>
      ) : null}
      {partialError ? (
        <p className={styles.persistenceNotice} role="alert">
          {partialError}
        </p>
      ) : null}
      <div className={styles.personalActions}>
        <button type="button" className={styles.ghostBtn} data-ca-action="bulk:confirm-no" onClick={onCancel}>
          Отмена
        </button>
        <button
          type="button"
          className={styles.primaryBtn}
          data-ca-action="bulk:confirm-yes"
          disabled={confirmBlocked}
          aria-disabled={confirmBlocked}
          title={contractState === "blocked" ? "BLK-RECEIVING-APPEALS" : undefined}
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
