"use client";

import { useMemo, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { formatMoneyRub } from "@/lib/history-format";
import {
  PAYOUT_EXTERNAL_FACT_NOTE,
  type PayoutMethod,
  type SettlementPayoutActions,
  newPayoutIdempotencyKey,
  payoutConfirmLabel,
  recordBonusPayoutFact,
} from "@/lib/payout-record";
import { Button } from "@/components/ui/Button";
import styles from "./payout-record.module.css";

export type PayoutRecordTarget = {
  bonusId: string;
  counterpartyName: string;
  amount: number;
  basis: string;
  branchLabel?: string | null;
  payoutActions: SettlementPayoutActions;
};

type PayoutRecordModalProps = {
  target: PayoutRecordTarget;
  onClose: () => void;
  onSuccess: () => void;
};

export function PayoutRecordModal({ target, onClose, onSuccess }: PayoutRecordModalProps) {
  const methods = useMemo(() => {
    const out: PayoutMethod[] = [];
    if (target.payoutActions.canRecordCash) out.push("CASH");
    if (target.payoutActions.canRecordTransfer) out.push("TRANSFER");
    return out;
  }, [target.payoutActions]);

  const [method, setMethod] = useState<PayoutMethod | "">(methods[0] ?? "");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!method) return;
    setLoading(true);
    setError("");
    try {
      await recordBonusPayoutFact({
        bonusId: target.bonusId,
        payoutMethod: method,
        payoutNote: note,
        idempotencyKey: newPayoutIdempotencyKey(target.bonusId),
      });
      onSuccess();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof RemcardApiError
          ? caught.message
          : "Не удалось зафиксировать выплату. Попробуйте ещё раз.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payout-record-title"
      >
        <h2 id="payout-record-title" className={styles.title}>
          Зафиксировать выплату
        </h2>
        <p className={styles.note}>{PAYOUT_EXTERNAL_FACT_NOTE}</p>
        <dl className={styles.metaList}>
          <div>
            <dt>Получатель</dt>
            <dd>{target.counterpartyName}</dd>
          </div>
          <div>
            <dt>Сумма</dt>
            <dd>{formatMoneyRub(target.amount)}</dd>
          </div>
          <div>
            <dt>Основание</dt>
            <dd>{target.basis}</dd>
          </div>
          {target.branchLabel ? (
            <div>
              <dt>Филиал</dt>
              <dd>{target.branchLabel}</dd>
            </div>
          ) : null}
        </dl>
        <fieldset className={styles.methods}>
          <legend className={styles.legend}>Способ выплаты</legend>
          {methods.map((m) => (
            <label key={m} className={styles.methodLabel}>
              <input
                type="radio"
                name="payout-method"
                value={m}
                checked={method === m}
                onChange={() => setMethod(m)}
              />
              {m === "CASH" ? "Наличными" : "Переводом (уже выполнен)"}
            </label>
          ))}
        </fieldset>
        <label className={styles.noteField}>
          Комментарий (необязательно)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        </label>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={!method || loading}>
            {loading ? "Сохраняем…" : method ? payoutConfirmLabel(method) : "Выберите способ"}
          </Button>
        </div>
      </div>
    </div>
  );
}
