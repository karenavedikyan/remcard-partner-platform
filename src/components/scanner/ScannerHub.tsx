"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { RemcardApiError, remcardFetch, remcardFetchWithMeta } from "@/lib/api-client";
import { parseCertificateCode } from "@/lib/certificate-code";
import {
  buildOrderItems,
  computeOrderTotals,
  validateOrderAmounts,
} from "@/lib/order-totals";
import type {
  OrderCreateResponse,
  OrderPreviewAllowed,
  OrderPreviewResponse,
} from "@/lib/order-types";
import {
  isPreviewSessionAllowed,
  shouldApplyPreviewResponse,
  type PreviewSession,
} from "@/lib/scanner-flow";
import {
  IDEMPOTENCY_MISMATCH_MESSAGE,
  isIdempotencyMismatchError,
  isUncertainOrderFailure,
  shouldPreserveAttemptOnError,
  STORAGE_SAVE_FAILED_MESSAGE,
  UNCERTAIN_ORDER_DETAIL,
  UNCERTAIN_ORDER_HEADING,
  validateOrderCreateResponse,
} from "@/lib/scanner-order-submit";
import {
  beginStoreOrderAttempt,
  clearStoreOrderAttempt,
  isStoreOrderAttemptLocked,
  loadStoreOrderAttempt,
  markStoreOrderAttemptSucceeded,
  markStoreOrderAttemptUnknown,
  type StoreOrderAttemptRecord,
} from "@/lib/store-order-attempt";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import { QrScanner } from "./QrScanner";
import styles from "./scanner.module.css";

type ScanMode = "manual" | "camera" | "success";

type ScannerHubProps = {
  userId: string;
};

function formatUsage(usageCount: number, maxUsages: number) {
  if (maxUsages > 0) {
    return `${usageCount} из ${maxUsages}`;
  }
  return `${usageCount} (без ограничений)`;
}

function formatRub(value: number) {
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

function amountDraftsFromAttempt(record: StoreOrderAttemptRecord): Record<string, string> {
  const drafts: Record<string, string> = {};
  for (const item of record.body.items) {
    drafts[item.category] = String(item.amount);
  }
  return drafts;
}

function PartnerAcceptance({ preview }: { preview: OrderPreviewAllowed }) {
  const [expanded, setExpanded] = useState(false);
  const cards = preview.certificate.partnerCards ?? [];

  if (cards.length === 0) {
    return (
      <p className={styles.meta} style={{ marginTop: "var(--space-3)" }}>
        Принимается у партнёра {preview.partner.storeName}
      </p>
    );
  }

  return (
    <div style={{ marginTop: "var(--space-4)" }}>
      <button
        type="button"
        className={styles.expandButton}
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        Где действует документ
        <span aria-hidden>{expanded ? "▴" : "▾"}</span>
      </button>
      {expanded ? (
        <ul className={styles.partnerList}>
          {cards.map((card, index) => (
            <li key={`${card.publicName ?? "partner"}-${index}`} className={styles.partnerItem}>
              <strong>{card.publicName ?? "Партнёр"}</strong>
              {card.city ? <span className={styles.meta}> · {card.city}</span> : null}
              {card.categories?.length ? (
                <ul className={styles.categoryList}>
                  {card.categories.map((cat) => (
                    <li key={cat.categoryLabel}>
                      {cat.categoryLabel}: −{cat.discountPercent}%
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ScannerHub({ userId }: ScannerHubProps) {
  const [mode, setMode] = useState<ScanMode>("manual");
  const [manualCode, setManualCode] = useState("");
  const [previewSession, setPreviewSession] = useState<PreviewSession | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderUncertain, setOrderUncertain] = useState(false);
  const [success, setSuccess] = useState<OrderCreateResponse | null>(null);
  const [confirmedCode, setConfirmedCode] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [storedAttempt, setStoredAttempt] = useState<StoreOrderAttemptRecord | null>(null);
  const [attemptRestoreDone, setAttemptRestoreDone] = useState(false);

  const previewRequestIdRef = useRef(0);
  const previewAbortRef = useRef<AbortController | null>(null);
  const submitInFlightRef = useRef(false);

  const invalidatePreviewRequest = useCallback(() => {
    previewRequestIdRef.current += 1;
    previewAbortRef.current?.abort();
    previewAbortRef.current = null;
  }, []);

  const resetAll = useCallback(() => {
    invalidatePreviewRequest();
    clearStoreOrderAttempt();
    setMode("manual");
    setManualCode("");
    setPreviewSession(null);
    setPreviewError("");
    setPreviewLoading(false);
    setAmountDrafts({});
    setSubmitError("");
    setSubmitting(false);
    setOrderUncertain(false);
    setSuccess(null);
    setConfirmedCode("");
    setCameraError("");
    setStoredAttempt(null);
    submitInFlightRef.current = false;
  }, [invalidatePreviewRequest]);

  const runPreview = useCallback(
    async (raw: string, options?: { restoreAttempt?: StoreOrderAttemptRecord | null }) => {
      if (previewLoading) {
        return;
      }

      const parsed = parseCertificateCode(raw);
      if (!parsed.ok) {
        setPreviewError(parsed.error);
        setPreviewSession(null);
        return;
      }

      const requestId = previewRequestIdRef.current + 1;
      previewRequestIdRef.current = requestId;
      previewAbortRef.current?.abort();
      const abortController = new AbortController();
      previewAbortRef.current = abortController;

      setPreviewLoading(true);
      setPreviewError("");
      if (!options?.restoreAttempt) {
        setSubmitError("");
        setOrderUncertain(false);
        setSuccess(null);
        setPreviewSession(null);
        setMode("manual");
      }

      try {
        const data = await remcardFetch<OrderPreviewResponse>("/api/store/order/preview", {
          method: "POST",
          body: { certificateCode: parsed.code },
          signal: abortController.signal,
        });

        if (
          !shouldApplyPreviewResponse(
            requestId,
            previewRequestIdRef.current,
            abortController.signal,
          )
        ) {
          return;
        }

        const session: PreviewSession = { code: parsed.code, preview: data };
        setPreviewSession(session);

        if ("allowed" in data && data.allowed) {
          if (options?.restoreAttempt) {
            setAmountDrafts(amountDraftsFromAttempt(options.restoreAttempt));
            setOrderUncertain(options.restoreAttempt.status === "unknown");
            setStoredAttempt(options.restoreAttempt);
          } else {
            const drafts: Record<string, string> = {};
            for (const cat of data.availableCategories) {
              drafts[cat.category] = "";
            }
            setAmountDrafts(drafts);
          }
        } else {
          setAmountDrafts({});
        }
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") {
          return;
        }
        if (
          !shouldApplyPreviewResponse(
            requestId,
            previewRequestIdRef.current,
            abortController.signal,
          )
        ) {
          return;
        }
        setPreviewSession(null);
        setPreviewError(
          caught instanceof RemcardApiError
            ? caught.message
            : "Не удалось проверить документ",
        );
      } finally {
        if (requestId === previewRequestIdRef.current) {
          setPreviewLoading(false);
        }
      }
    },
    [previewLoading],
  );

  useEffect(() => {
    if (attemptRestoreDone) {
      return;
    }
    const attempt = loadStoreOrderAttempt(userId);
    setAttemptRestoreDone(true);
    if (!attempt || attempt.status === "succeeded") {
      return;
    }
    setStoredAttempt(attempt);
    if (attempt.status === "unknown") {
      setOrderUncertain(true);
    }
    void runPreview(attempt.body.certificateCode, { restoreAttempt: attempt });
  }, [attemptRestoreDone, runPreview, userId]);

  const postPurchase = useCallback(
    async (isRetryCheck: boolean) => {
      if (submitInFlightRef.current) {
        return;
      }
      if (isRetryCheck) {
        if (!orderUncertain || submitting) {
          return;
        }
      } else if (!isPreviewSessionAllowed(previewSession) || submitting || orderUncertain) {
        return;
      }

      submitInFlightRef.current = true;

      const session = previewSession;
      const code = isRetryCheck && storedAttempt ? storedAttempt.body.certificateCode : session?.code;
      if (!code) {
        submitInFlightRef.current = false;
        return;
      }

      let items;
      if (isRetryCheck && storedAttempt) {
        items = storedAttempt.body.items;
      } else if (session && isPreviewSessionAllowed(session)) {
        const validation = validateOrderAmounts(session.preview.availableCategories, amountDrafts);
        if (!validation.ok) {
          setSubmitError(validation.message);
          setOrderUncertain(false);
          submitInFlightRef.current = false;
          return;
        }
        items = buildOrderItems(session.preview.availableCategories, amountDrafts);
      } else {
        submitInFlightRef.current = false;
        return;
      }

      const began = beginStoreOrderAttempt({
        userId,
        body: { certificateCode: code, items },
        existing: isRetryCheck ? storedAttempt : storedAttempt?.status === "unknown" ? storedAttempt : null,
      });

      if (!began.ok) {
        setSubmitError(
          began.reason === "foreign_user"
            ? "Попытка покупки принадлежит другому пользователю"
            : STORAGE_SAVE_FAILED_MESSAGE,
        );
        submitInFlightRef.current = false;
        return;
      }

      setStoredAttempt(began.record);
      setSubmitting(true);
      setSubmitError("");
      if (!isRetryCheck) {
        setOrderUncertain(false);
      }

      try {
        const { payload } = await remcardFetchWithMeta<unknown>("/api/store/order", {
          method: "POST",
          body: began.record.body,
          idempotencyKey: began.record.idempotencyKey,
        });

        const data = validateOrderCreateResponse(payload);
        markStoreOrderAttemptSucceeded(userId, data.order.id);
        clearStoreOrderAttempt();

        setConfirmedCode(code);
        setSuccess(data);
        setPreviewSession(null);
        setMode("success");
        setStoredAttempt(null);
        setOrderUncertain(false);
      } catch (caught) {
        if (isIdempotencyMismatchError(caught)) {
          clearStoreOrderAttempt();
          setStoredAttempt(null);
          setOrderUncertain(false);
          setSubmitError(IDEMPOTENCY_MISMATCH_MESSAGE);
        } else if (shouldPreserveAttemptOnError(caught)) {
          const unknown = markStoreOrderAttemptUnknown(userId);
          setStoredAttempt(unknown);
          setOrderUncertain(true);
          setSubmitError("");
        } else if (caught instanceof RemcardApiError) {
          setSubmitError(caught.message);
          setOrderUncertain(false);
        } else if (isUncertainOrderFailure(caught)) {
          const unknown = markStoreOrderAttemptUnknown(userId);
          setStoredAttempt(unknown);
          setOrderUncertain(true);
          setSubmitError("");
        } else {
          const unknown = markStoreOrderAttemptUnknown(userId);
          setStoredAttempt(unknown);
          setOrderUncertain(true);
          setSubmitError("");
        }
      } finally {
        submitInFlightRef.current = false;
        setSubmitting(false);
      }
    },
    [amountDrafts, orderUncertain, previewSession, storedAttempt, submitting, userId],
  );

  const allowedPreview = isPreviewSessionAllowed(previewSession) ? previewSession.preview : null;
  const totals =
    allowedPreview && previewSession
      ? computeOrderTotals(allowedPreview.availableCategories, amountDrafts)
      : null;
  const amountsLocked = orderUncertain || isStoreOrderAttemptLocked(storedAttempt);

  if (mode === "success" && success) {
    return (
      <div>
        <div className={styles.successBanner}>Покупка подтверждена</div>
        <div className={`${styles.card} ${styles.cardDark}`} style={{ marginTop: "var(--space-4)" }}>
          <p className={styles.meta}>Операция #{success.order.id}</p>
          <p className={styles.previewTitle}>Документ {confirmedCode}</p>
          <div className={styles.summaryRow}>
            <span>Сумма покупки</span>
            <span>{formatRub(success.summary.totalAmount)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Скидка клиенту</span>
            <span>−{formatRub(success.summary.discountAmount)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>К оплате</span>
            <strong>{formatRub(success.summary.totalAmount - success.summary.discountAmount)}</strong>
          </div>
          {!success.summary.isSelfScan &&
          (success.summary.issuerBonusAmount ?? success.summary.proBonusAmount) ? (
            <p className={styles.meta} style={{ marginTop: "var(--space-3)" }}>
              Вознаграждение PROF (начисление по правилам сервера):{" "}
              {formatRub(
                success.summary.issuerBonusAmount ?? success.summary.proBonusAmount ?? 0,
              )}
            </p>
          ) : null}
        </div>
        <div className={styles.actionsRow} style={{ marginTop: "var(--space-4)" }}>
          <Link
            href={`/history/purchases/${encodeURIComponent(success.order.id)}`}
            className={styles.openHistoryLink}
          >
            Открыть покупку
          </Link>
          <Link
            href={`/history?search=${encodeURIComponent(confirmedCode)}`}
            className={styles.openHistoryLink}
          >
            Все операции по документу
          </Link>
          <Button onClick={resetAll}>Новая покупка</Button>
        </div>
      </div>
    );
  }

  if (previewSession && allowedPreview) {
    const { code } = previewSession;
    const preview = allowedPreview;
    return (
      <div>
        <div className={`${styles.card} ${styles.cardDark}`}>
          <p className={styles.meta}>Документ</p>
          <p className={styles.previewTitle}>{preview.certificate.promoCode}</p>
          <p className={styles.meta}>Код для операции: {code}</p>
          <p className={styles.meta}>
            {preview.certificate.issuer.label}: {preview.certificate.issuer.name}
          </p>
          <p className={styles.meta}>Статус: {preview.certificate.status}</p>
          <p className={styles.meta}>
            Действует до:{" "}
            {preview.certificate.validUntil
              ? new Date(preview.certificate.validUntil).toLocaleDateString("ru-RU")
              : "без ограничения"}
          </p>
          <p className={styles.meta}>
            Использований:{" "}
            {formatUsage(preview.certificate.usageCount, preview.certificate.maxUsages)}
          </p>
          {preview.certificate.userAlias ? (
            <p className={styles.meta}>Клиент: {preview.certificate.userAlias}</p>
          ) : null}
          <PartnerAcceptance preview={preview} />
        </div>

        <div className={styles.card}>
          <h3 className={styles.previewTitle}>Оформление покупки</h3>
          <p className={styles.meta}>
            Партнёр: {preview.partner.storeName}
            {preview.partner.isSelfScan ? " · самосканирование" : ""}
          </p>
          <p className={styles.meta}>
            Сумма указывается до скидки, в рублях. Скидка и итог рассчитывает сервер.
          </p>

          <div style={{ display: "grid", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
            {preview.availableCategories.map((category) => (
              <div key={category.category} className={styles.categoryRow}>
                <div className={styles.categoryHeader}>
                  <strong>{category.categoryLabel}</strong>
                  <span className={styles.discountBadge}>−{category.discountPercent}%</span>
                </div>
                <TextField
                  label="Сумма покупки до скидки, ₽"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={amountDrafts[category.category] ?? ""}
                  disabled={submitting || amountsLocked}
                  onChange={(event) =>
                    setAmountDrafts((prev) => ({
                      ...prev,
                      [category.category]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>

          {totals ? (
            <div className={styles.summary} style={{ marginTop: "var(--space-4)" }}>
              <div className={styles.summaryRow}>
                <span>Сумма покупки</span>
                <span>{formatRub(totals.totalAmount)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Скидка клиенту</span>
                <span>−{formatRub(totals.totalDiscount)}</span>
              </div>
              <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                <span>К оплате (ориентир)</span>
                <span>{formatRub(totals.payableAmount)}</span>
              </div>
              {!preview.partner.isSelfScan && totals.totalIssuerBonus > 0 ? (
                <p className={styles.meta} style={{ color: "rgba(255, 255, 255, 0.65)" }}>
                  Вознаграждение PROF (ориентир): {formatRub(totals.totalIssuerBonus)}
                </p>
              ) : null}
            </div>
          ) : null}

          {orderUncertain ? (
            <div className={styles.uncertainBlock} role="alert">
              <p className={styles.uncertainHeading}>{UNCERTAIN_ORDER_HEADING}</p>
              <p className={styles.meta}>{UNCERTAIN_ORDER_DETAIL}</p>
            </div>
          ) : null}

          {submitError ? (
            <p className={styles.errorText} role="alert">
              {submitError}
            </p>
          ) : null}

          <div className={styles.actionsRow}>
            <Button variant="secondary" disabled={submitting} onClick={resetAll}>
              {orderUncertain ? "Новая покупка" : "Отмена"}
            </Button>
            {orderUncertain ? (
              <Button disabled={submitting} onClick={() => void postPurchase(true)}>
                {submitting ? "Проверка…" : "Проверить результат"}
              </Button>
            ) : (
              <Button
                disabled={submitting || !totals || totals.totalAmount <= 0}
                onClick={() => void postPurchase(false)}
              >
                {submitting ? "Подтверждение…" : "Подтвердить покупку"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (previewSession && !previewSession.preview.allowed) {
    return (
      <div className={styles.deniedBlock}>
        <p className={styles.previewTitle}>
          Документ {previewSession.preview.certificate?.promoCode ?? previewSession.code}
        </p>
        <p className={styles.errorText} role="alert">
          {previewSession.preview.message}
        </p>
        <div style={{ marginTop: "var(--space-4)" }}>
          <Button variant="secondary" onClick={resetAll}>
            Сканировать другой код
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.scannerHero}>
        <span className={styles.scannerIcon} aria-hidden>
          ▣
        </span>
        <p className={styles.scannerLead}>
          Сканируйте QR-код документа или введите промокод вручную. Предпросмотр не создаёт
          покупку — подтверждение только по кнопке ниже.
        </p>
      </div>
      <div className={styles.modeSwitch}>
        <button
          type="button"
          className={`${styles.modeButton} ${mode === "manual" ? styles.modeButtonActive : ""}`}
          onClick={() => {
            setCameraError("");
            setPreviewError("");
            invalidatePreviewRequest();
            setPreviewLoading(false);
            setMode("manual");
          }}
        >
          ⌨ Ввести код
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${mode === "camera" ? styles.modeButtonActive : ""}`}
          onClick={() => {
            setCameraError("");
            setPreviewError("");
            invalidatePreviewRequest();
            setPreviewLoading(false);
            setMode("camera");
          }}
        >
          📷 Сканировать QR
        </button>
      </div>

      {mode === "manual" ? (
        <div className={styles.manualRow}>
          <div className={styles.manualInput}>
            <TextField
              label="Код или промокод"
              value={manualCode}
              placeholder="RC-XXXXXX"
              disabled={previewLoading}
              onChange={(event) => setManualCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !previewLoading) {
                  void runPreview(manualCode);
                }
              }}
            />
          </div>
          <Button disabled={previewLoading} onClick={() => void runPreview(manualCode)}>
            {previewLoading ? "Проверка…" : "Найти"}
          </Button>
        </div>
      ) : null}

      {mode === "camera" ? (
        <>
          <QrScanner
            onCode={(raw) => {
              if (!previewLoading) {
                void runPreview(raw);
              }
            }}
            onError={(message) => {
              setCameraError(message);
              setMode("manual");
            }}
          />
          <div style={{ marginTop: "var(--space-3)" }}>
            <Button
              variant="secondary"
              onClick={() => {
                invalidatePreviewRequest();
                setPreviewLoading(false);
                setMode("manual");
              }}
            >
              Ввести код вручную
            </Button>
          </div>
        </>
      ) : null}

      {previewLoading ? <p className={styles.meta}>Проверка документа…</p> : null}

      {(previewError || cameraError) && !previewLoading ? (
        <div className={styles.errorBlock} role="alert">
          <p>{previewError || cameraError}</p>
          {cameraError ? (
            <Button
              variant="secondary"
              onClick={() => {
                setCameraError("");
                setMode("manual");
              }}
            >
              Ввести код вручную
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
