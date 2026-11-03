"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { formatMoneyRub } from "@/lib/history-format";
import {
  PAYOUT_EXTERNAL_FACT_NOTE,
  type PayoutMethod,
  type SettlementPayoutActions,
  clearPayoutAttemptIdempotencyKey,
  getOrCreatePayoutAttemptIdempotencyKey,
  isLikelyUnknownPayoutNetworkOutcome,
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
  onSuccess: () => void | Promise<void>;
  /** Payout write succeeded but post-success refresh/handler failed (M3). */
  onPostRecordRefreshFailure?: () => void | Promise<void>;
};

const UNKNOWN_OUTCOME_MESSAGE =
  "Результат неизвестен, проверьте начисление перед повтором";

function focusableElements(root: HTMLElement): HTMLElement[] {
  const selector =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
  );
}

export function PayoutRecordModal({
  target,
  onClose,
  onSuccess,
  onPostRecordRefreshFailure,
}: PayoutRecordModalProps) {
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
  const [focusAfterError, setFocusAfterError] = useState(0);

  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const idempotencyKeyRef = useRef<string>(
    getOrCreatePayoutAttemptIdempotencyKey(target.bonusId),
  );

  const requestClose = useCallback(() => {
    if (loading) return;
    onClose();
  }, [loading, onClose]);

  const submit = useCallback(async () => {
    if (!method || loading) return;
    setLoading(true);
    setError("");
    try {
      await recordBonusPayoutFact({
        bonusId: target.bonusId,
        payoutMethod: method,
        payoutNote: note,
        idempotencyKey: idempotencyKeyRef.current,
      });
    } catch (caught) {
      if (isLikelyUnknownPayoutNetworkOutcome(caught)) {
        setError(UNKNOWN_OUTCOME_MESSAGE);
      } else if (caught instanceof RemcardApiError) {
        setError(caught.message);
      } else {
        setError("Не удалось зафиксировать выплату. Попробуйте ещё раз.");
      }
      setLoading(false);
      setFocusAfterError((n) => n + 1);
      return;
    }

    clearPayoutAttemptIdempotencyKey(target.bonusId);
    try {
      await onSuccess();
    } catch {
      if (onPostRecordRefreshFailure) {
        await onPostRecordRefreshFailure();
      } else {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  }, [loading, method, note, onClose, onPostRecordRefreshFailure, onSuccess, target.bonusId]);

  useEffect(() => {
    if (focusAfterError === 0 || loading) return;
    const btn = primaryActionRef.current;
    if (!btn || btn.disabled) return;
    btn.focus();
  }, [focusAfterError, loading]);

  useEffect(() => {
    const root = dialogRef.current;
    if (!root) return;
    const focusables = focusableElements(root);
    const primary = primaryActionRef.current;
    if (primary && !primary.disabled) {
      primary.focus();
      return;
    }
    focusables[0]?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = focusableElements(root);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !root.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !root.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  return (
    <div
      className={styles.backdrop}
      onClick={() => requestClose()}
      role="presentation"
      data-testid="payout-record-backdrop"
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payout-record-title"
        data-testid="payout-record-modal"
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
        <fieldset className={styles.methods} disabled={loading}>
          <legend className={styles.legend}>Способ выплаты</legend>
          {methods.map((m) => (
            <label key={m} className={styles.methodLabel}>
              <input
                type="radio"
                name="payout-method"
                value={m}
                checked={method === m}
                onChange={() => setMethod(m)}
                disabled={loading}
              />
              {m === "CASH" ? "Наличными" : "Переводом (уже выполнен)"}
            </label>
          ))}
        </fieldset>
        <label className={styles.noteField}>
          Комментарий (необязательно)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            disabled={loading}
          />
        </label>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={requestClose} disabled={loading}>
            Отмена
          </Button>
          <Button
            type="button"
            ref={primaryActionRef}
            data-testid="payout-record-submit"
            onClick={() => void submit()}
            disabled={!method || loading}
          >
            {loading ? "Сохраняем…" : method ? payoutConfirmLabel(method) : "Выберите способ"}
          </Button>
        </div>
      </div>
    </div>
  );
}
