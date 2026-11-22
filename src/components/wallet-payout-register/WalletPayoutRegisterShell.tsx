"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  approveWalletPayout,
  formatKopecks,
  newWalletPayoutIdempotencyKey,
  rejectWalletPayout,
  requestWalletPayoutCode,
  revealWalletPayoutCode,
  writeoffWalletPayout,
} from "@/lib/wallet-payout-register/api";
import type {
  WalletPayoutDirection,
  WalletPayoutPartnerRow,
  WalletPayoutRegisterResponse,
} from "@/lib/wallet-payout-register/types";
import type { WalletPresentation } from "@/lib/wallet-accruals/types";
import styles from "./wallet-payout-register.module.css";
import "../wallet-accruals/wallet-accruals.global.css";

type DialogMode =
  | { type: "closed" }
  | { type: "request"; partner: WalletPayoutPartnerRow; amount: string }
  | { type: "receive"; partner: WalletPayoutPartnerRow; approved: boolean }
  | { type: "writeoff"; partner: WalletPayoutPartnerRow };

type Props = {
  data: WalletPayoutRegisterResponse;
  presentation: WalletPresentation;
  onRefresh: () => void | Promise<void>;
  initialCounterpartyId?: string | null;
  initialRequestId?: string | null;
  initialReceiptId?: string | null;
};

const DIRECTION_LABEL: Record<WalletPayoutDirection, string> = {
  in: "Мне должны",
  out: "Я должен",
};

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" width={16} height={16}>
      <path
        d="m3.5 8.5 3 3 6-6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DebitIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" width={14} height={14}>
      <path
        d="M4 12 12 4m0 0H6m6 0v6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function rowDetail(partner: WalletPayoutPartnerRow) {
  const pending = partner.pending;
  if (partner.direction === "in") {
    if (pending?.status === "waiting") {
      return { text: `К подтверждению: ${formatKopecks(pending.amountKopecks)}`, success: false };
    }
    if (pending?.status === "rejected") return { text: "Ждём исправления суммы", success: false };
    if (pending?.status === "approved") {
      return { text: `Ждём ввода кода: ${formatKopecks(pending.amountKopecks)}`, success: false };
    }
    if (partner.lastReceipt && !pending) {
      return { text: `Получено ${formatKopecks(partner.lastReceipt.amountKopecks)}`, success: true };
    }
    return { text: "Ждём сумму", success: false };
  }
  if (pending?.status === "approved") {
    return { text: `Подтверждено ${formatKopecks(pending.amountKopecks)}`, success: false };
  }
  if (pending?.status === "rejected") return { text: "Сумма не совпала", success: false };
  if (pending?.status === "waiting") {
    return { text: `Ждём подтверждения: ${formatKopecks(pending.amountKopecks)}`, success: false };
  }
  return { text: "", success: false };
}

export function WalletPayoutRegisterShell({
  data,
  presentation,
  onRefresh,
  initialCounterpartyId,
  initialRequestId,
  initialReceiptId,
}: Props) {
  const incomingOnly = data.incomingOnly;
  const [direction, setDirection] = useState<WalletPayoutDirection>("in");
  const effectiveDirection = incomingOnly ? "in" : direction;
  const [dialog, setDialog] = useState<DialogMode>({ type: "closed" });
  const [dialogError, setDialogError] = useState("");
  const [dialogCode, setDialogCode] = useState<string | null>(null);
  const [dialogAmount, setDialogAmount] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const appliedReceiptDeepLinkRef = useRef<string | null>(null);
  const pendingReceiptFocusIdRef = useRef<string | null>(null);
  const receiptRowRefs = useRef(new Map<string, HTMLLIElement>());

  const visiblePartners = useMemo(
    () =>
      data.partners.filter(
        (p) =>
          p.direction === effectiveDirection &&
          (p.readyKopecks > 0 || p.pending || (effectiveDirection === "in" && p.lastReceipt)),
      ),
    [data.partners, effectiveDirection],
  );

  const cardTotal = effectiveDirection === "in" ? data.totals.inKopecks : data.totals.outKopecks;
  const cardLabel = effectiveDirection === "in" ? "К получению" : "К выплате";

  const history = useMemo(
    () => data.receipts.filter((r) => r.direction === effectiveDirection),
    [data.receipts, effectiveDirection],
  );

  const openDialog = useCallback((mode: DialogMode) => {
    setDialogError("");
    setDialogCode(null);
    setDialogAmount(null);
    setDialog(mode);
    queueMicrotask(() => dialogRef.current?.showModal());
  }, []);

  const closeDialog = useCallback(() => {
    dialogRef.current?.close();
    setDialog({ type: "closed" });
    setDialogError("");
  }, []);

  const runRefresh = useCallback(async () => {
    await onRefresh();
    closeDialog();
  }, [closeDialog, onRefresh]);

  const revealPending = (requestId: string) => {
    void revealWalletPayoutCode(requestId)
      .then((res) => {
        setDialogCode(res.code);
        setDialogAmount(formatKopecks(res.amountKopecks));
      })
      .catch((error) => {
        setDialogError(error instanceof Error ? error.message : "Не удалось показать код");
      });
  };

  const onPrimaryAction = (partner: WalletPayoutPartnerRow) => {
    if (partner.direction === "in" && !data.canReceive) return;
    if (partner.direction === "out" && (data.readOnly || !data.canPayout)) return;
    if (partner.direction === "in") {
      const approved = partner.pending?.status === "approved";
      openDialog({ type: "receive", partner, approved: !!approved });
      if (
        partner.pending &&
        (partner.pending.status === "waiting" || partner.pending.status === "approved")
      ) {
        revealPending(partner.pending.requestId);
      }
      return;
    }
    if (partner.pending?.status === "approved") {
      openDialog({ type: "writeoff", partner });
      return;
    }
  const defaultAmount = partner.pending
      ? (partner.pending.amountKopecks / 100).toString()
      : (partner.readyKopecks / 100).toString();
    openDialog({ type: "request", partner, amount: defaultAmount });
  };

  const primaryLabel = (partner: WalletPayoutPartnerRow) => {
    if (partner.direction === "in") {
      if (partner.pending?.status === "waiting") return "Проверить сумму";
      if (partner.pending?.status === "approved") return "Код";
      return "";
    }
    if (partner.pending?.status === "approved") return "Списать по коду";
    if (partner.readyKopecks > 0 && data.canPayout) return "Запросить код";
    if (partner.pending?.status === "waiting" || partner.pending?.status === "rejected") {
      return partner.pending.status === "rejected" ? "Запросить новый код" : "Изменить сумму";
    }
    return "";
  };

  const submitDialog = async (event: React.FormEvent) => {
    event.preventDefault();
    if (dialog.type === "closed" || busy) return;
    setBusy(true);
    setDialogError("");
    try {
      if (dialog.type === "request") {
        const amountRub = dialog.amount.replace(",", ".").trim();
        await requestWalletPayoutCode({
          counterpartyUserId: dialog.partner.counterpartyId,
          amountRub,
          idempotencyKey: newWalletPayoutIdempotencyKey(dialog.partner.counterpartyId),
        });
        await runRefresh();
        return;
      }
      if (dialog.type === "receive" && dialog.partner.pending) {
        if (dialog.approved) {
          closeDialog();
          return;
        }
        await approveWalletPayout(dialog.partner.pending.requestId);
        const revealed = await revealWalletPayoutCode(dialog.partner.pending.requestId);
        setDialogCode(revealed.code);
        setDialogAmount(formatKopecks(revealed.amountKopecks));
        await onRefresh();
        return;
      }
      if (dialog.type === "writeoff" && dialog.partner.pending) {
        const form = event.target as HTMLFormElement;
        const code = new FormData(form).get("code")?.toString().trim() ?? "";
        await writeoffWalletPayout({
          requestId: dialog.partner.pending.requestId,
          code,
          idempotencyKey: newWalletPayoutIdempotencyKey(`writeoff-${dialog.partner.pending.requestId}`),
        });
        await runRefresh();
      }
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Ошибка операции");
    } finally {
      setBusy(false);
    }
  };

  const focusPartner = initialCounterpartyId
    ? visiblePartners.find((p) => p.counterpartyId === initialCounterpartyId)
    : null;

  const linkedReceipt = useMemo(
    () => (initialReceiptId ? data.receipts.find((r) => r.receiptId === initialReceiptId) ?? null : null),
    [data.receipts, initialReceiptId],
  );

  const focusReceipt = useMemo(() => {
    if (!linkedReceipt) return null;
    if (incomingOnly && linkedReceipt.direction === "out") return null;
    return linkedReceipt;
  }, [incomingOnly, linkedReceipt]);

  const focusNotice = useMemo(() => {
    if (initialRequestId) {
      const found = data.partners.some((p) => p.pending?.requestId === initialRequestId);
      if (!found) return "Запрос недоступен в выбранном подразделении или устарел.";
    }
    if (initialReceiptId && !focusReceipt) {
      return "Квитанция недоступна в выбранном подразделении.";
    }
    return null;
  }, [data.partners, focusReceipt, initialReceiptId, initialRequestId]);

  useEffect(() => {
    if (!initialRequestId) return;
    const partner = data.partners.find((p) => p.pending?.requestId === initialRequestId);
    if (!partner) return;
    if (partner.direction !== effectiveDirection) setDirection(partner.direction);
    queueMicrotask(() => {
      const row = document.querySelector<HTMLElement>(
        `[data-payout-row="${partner.counterpartyId}"]`,
      );
      if (row?.scrollIntoView) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
      row?.focus();
    });
  }, [data.partners, effectiveDirection, initialRequestId]);

  useEffect(() => {
    if (!initialReceiptId) {
      appliedReceiptDeepLinkRef.current = null;
      pendingReceiptFocusIdRef.current = null;
      return;
    }
    if (!focusReceipt) return;
    if (appliedReceiptDeepLinkRef.current === initialReceiptId) return;

    appliedReceiptDeepLinkRef.current = initialReceiptId;
    pendingReceiptFocusIdRef.current = initialReceiptId;
    if (!incomingOnly && focusReceipt.direction !== effectiveDirection) {
      setDirection(focusReceipt.direction);
    }
    setHistoryOpen(true);
  }, [effectiveDirection, focusReceipt, incomingOnly, initialReceiptId]);

  useLayoutEffect(() => {
    const targetId = pendingReceiptFocusIdRef.current;
    if (!targetId || !focusReceipt || targetId !== focusReceipt.receiptId) return;
    if (!historyOpen) return;
    if (effectiveDirection !== focusReceipt.direction) return;

    const row = receiptRowRefs.current.get(targetId);
    if (!row) return;

    if (row.scrollIntoView) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    row.focus();
    pendingReceiptFocusIdRef.current = null;
  }, [effectiveDirection, focusReceipt, history.length, historyOpen, initialReceiptId]);

  return (
    <section className={styles.register} data-payout-register data-testid="wallet-payout-register">
      <header>
        <h2 id="wallet-register-title">Выплаты</h2>
        {data.readOnly ? (
          <p className="pw-muted">Только просмотр по доступным подразделениям.</p>
        ) : null}
        {focusNotice ? (
          <p className="pw-muted" role="status" data-testid="wallet-payout-focus-notice">
            {focusNotice}
          </p>
        ) : null}
      </header>
      <div className={styles.layout}>
        <div className="wallet-accruals-card-column">
          <div className={styles.directionTabs} role="group" aria-label="Направление выплат">
            {(incomingOnly
              ? ([["in", DIRECTION_LABEL.in]] as const)
              : ([
                  ["in", DIRECTION_LABEL.in],
                  ["out", DIRECTION_LABEL.out],
                ] as const)
            ).map(([dir, label]) => (
              <Button
                key={dir}
                type="button"
                variant={effectiveDirection === dir ? "primary" : "secondary"}
                className={styles.primaryAction}
                aria-pressed={effectiveDirection === dir}
                data-testid={`wallet-payout-direction-${dir}`}
                onClick={() => setDirection(dir)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div
            className={`wallet-rc-card wallet-rc-card--black ${styles.payoutCard}`}
            data-testid="wallet-payout-card"
          >
            <div className="wallet-rc-card__head">
              <span className="wallet-rc-card__ribbon">{presentation.ribbonLabel}</span>
              <span className="wallet-rc-card__brand" aria-hidden>
                remcard.
              </span>
            </div>
            <div className="wallet-rc-card__body" style={{ marginTop: "1.5rem" }}>
              <span className="wallet-rc-card__label">{cardLabel}</span>
              <div className="wallet-rc-card__hero">
                <strong className="wallet-rc-card__amount">
                  {(cardTotal / 100).toLocaleString("ru-RU")}
                </strong>
                <span className="wallet-rc-card__unit"> ₽</span>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.partners}>
          <h3 className={styles.partnersTitle}>Партнёры</h3>
          <div className={styles.list}>
            {visiblePartners.length ? (
              visiblePartners.map((partner) => {
                const detail = rowDetail(partner);
                const action = primaryLabel(partner);
                const balanceLabel =
                  partner.direction === "in" ? "Осталось получить" : "К выплате";
                return (
                  <article
                    key={`${partner.counterpartyId}:${partner.direction}`}
                    className={styles.item}
                    data-payout-row={partner.counterpartyId}
                    data-testid={`wallet-payout-row-${partner.counterpartyId}`}
                  >
                    <div className={styles.heading}>
                      <div>
                        <h3 tabIndex={-1}>{partner.counterpartyName}</h3>
                        {partner.branchLabel ? <p className="pw-muted">{partner.branchLabel}</p> : null}
                        {detail.text ? (
                          <div
                            className={`${styles.status} ${detail.success ? styles.statusSuccess : ""}`}
                          >
                            {detail.success ? <CheckIcon /> : null}
                            <span>{detail.text}</span>
                          </div>
                        ) : null}
                      </div>
                      {partner.readyKopecks > 0 ? (
                        <div className={styles.balance}>
                          <span>{balanceLabel}</span>
                          <strong>{formatKopecks(partner.readyKopecks)}</strong>
                        </div>
                      ) : null}
                      {action &&
                      ((partner.direction === "in" && data.canReceive) ||
                        (partner.direction === "out" && !data.readOnly && data.canPayout)) ? (
                        <Button
                          type="button"
                          variant="primary"
                          className={styles.primaryAction}
                          onClick={() => onPrimaryAction(partner)}
                        >
                          {action}
                        </Button>
                      ) : null}
                    </div>
                  </article>
                );
              })
            ) : (
              <p className={`${styles.empty} pw-muted`} data-testid="payout-empty">
                {effectiveDirection === "in"
                  ? "Нет сумм к получению."
                  : "Нет сумм, готовых к выплате."}
              </p>
            )}
          </div>
          {focusPartner ? <span className="sr-only">Фокус: {focusPartner.counterpartyName}</span> : null}
          {history.length ? (
            <details
              className={styles.history}
              open={historyOpen}
              onToggle={(event) => setHistoryOpen(event.currentTarget.open)}
            >
              <summary>История выплат</summary>
              <ul>
                {history.map((entry) => (
                  <li
                    key={entry.receiptId}
                    ref={(node) => {
                      if (node) receiptRowRefs.current.set(entry.receiptId, node);
                      else receiptRowRefs.current.delete(entry.receiptId);
                    }}
                    tabIndex={-1}
                    data-receipt-id={entry.receiptId}
                    data-testid={`wallet-payout-receipt-${entry.receiptId}`}
                    className={
                      initialReceiptId === entry.receiptId ? styles.historyFocus : undefined
                    }
                  >
                    <div>
                      <span>{entry.counterpartyName}</span>
                      <time className="pw-muted" style={{ fontSize: "0.78rem" }}>
                        {new Date(entry.confirmedAt).toLocaleDateString("ru-RU")}
                      </time>
                    </div>
                    <strong
                      className={`${styles.badge} ${
                        entry.direction === "in" ? styles.badgeIn : styles.badgeOut
                      }`}
                    >
                      {entry.direction === "in" ? <CheckIcon /> : <DebitIcon />}
                      <span>
                        {entry.direction === "in" ? "Получено" : "Списано"}{" "}
                        {formatKopecks(entry.amountKopecks)}
                      </span>
                    </strong>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      </div>
      <dialog ref={dialogRef} className="wallet-accrual-dialog" onClose={closeDialog}>
        {dialog.type !== "closed" ? (
          <form className="wallet-accrual-dialog__inner" onSubmit={submitDialog}>
            {dialog.type === "request" ? (
              <>
                <h3>{dialog.partner.pending ? "Изменить сумму выплаты" : "Запросить код"}</h3>
                <p className="pw-muted">
                  Партнёр: {dialog.partner.counterpartyName}. К выплате:{" "}
                  {formatKopecks(dialog.partner.readyKopecks)}.
                </p>
                <label className={styles.dialogField}>
                  Сколько выплатили, ₽
                  <input
                    name="amount"
                    defaultValue={dialog.amount}
                    inputMode="decimal"
                    required
                    onChange={(e) =>
                      setDialog({ ...dialog, amount: e.target.value })
                    }
                  />
                </label>
              </>
            ) : null}
            {dialog.type === "receive" ? (
              <>
                <h3>{dialog.approved ? "Код для отправителя" : "Проверьте сумму"}</h3>
                <p className="pw-muted">
                  Сверьте сумму с фактическим поступлением. При расхождении отправитель должен исправить
                  сумму.
                </p>
                <div className={styles.codeBox}>
                  {dialogAmount ? <p>Сумма: <strong>{dialogAmount}</strong></p> : null}
                  {dialogCode ? (
                    <p>
                      Код: <strong data-testid="wallet-payout-demo-code">{dialogCode}</strong>
                    </p>
                  ) : null}
                </div>
                {!dialog.approved ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      if (!dialog.partner.pending) return;
                      await rejectWalletPayout(dialog.partner.pending.requestId);
                      await runRefresh();
                    }}
                  >
                    Сумма не совпадает
                  </Button>
                ) : null}
              </>
            ) : null}
            {dialog.type === "writeoff" ? (
              <>
                <h3>Списать по коду</h3>
                <p className="pw-muted">
                  {dialog.partner.counterpartyName} ·{" "}
                  {dialog.partner.pending
                    ? formatKopecks(dialog.partner.pending.amountKopecks)
                    : ""}
                </p>
                <label className={styles.dialogField}>
                  Код из 6 цифр
                  <input name="code" inputMode="numeric" maxLength={6} required />
                </label>
              </>
            ) : null}
            {dialogError ? (
              <p className={styles.dialogError} role="alert">
                {dialogError}
              </p>
            ) : null}
            <div className="cab-actions">
              {dialog.type === "receive" && !dialog.approved ? (
                <Button type="submit" variant="primary" disabled={busy}>
                  Подтвердить получение
                </Button>
              ) : null}
              {dialog.type === "request" || dialog.type === "writeoff" ? (
                <Button type="submit" variant="primary" disabled={busy}>
                  {dialog.type === "writeoff" ? "Подтвердить списание" : "Запросить код"}
                </Button>
              ) : null}
              <Button type="button" variant="secondary" onClick={closeDialog}>
                {dialog.type === "receive" && dialog.approved ? "Закрыть" : "Отмена"}
              </Button>
            </div>
          </form>
        ) : null}
      </dialog>
    </section>
  );
}