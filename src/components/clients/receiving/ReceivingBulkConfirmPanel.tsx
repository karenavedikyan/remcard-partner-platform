"use client";

import { ReceivingBulkPartialOutcome } from "./ReceivingBulkPartialOutcome";

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
  const confirmBlocked = contractState === "blocked" || contractState === "pending" || contractState === "refresh-required";
  const confirmLabel =
    contractState === "pending"
      ? "Выполняется…"
      : contractState === "blocked"
        ? `${c.confirm} (недоступно)`
        : c.confirm;

  return (
    <aside
      className="panel stack ca-bulk-confirm"
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
        <p className="small muted">Групповые действия сейчас недоступны. Финансовых операций здесь нет.</p>
      ) : null}
      {partialError ? <ReceivingBulkPartialOutcome message={partialError} /> : null}
      <div className="ca-form-actions">
        <button type="button" className="btn ghost" data-ca-action="bulk:confirm-no" onClick={onCancel}>
          Отмена
        </button>
        <button
          type="button"
          className="btn primary"
          data-ca-action="bulk:confirm-yes"
          disabled={confirmBlocked}
          aria-disabled={confirmBlocked}
          onClick={() => {
            if (!confirmBlocked) onConfirm();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </aside>
  );
}
