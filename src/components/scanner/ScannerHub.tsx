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
  ATTEMPT_BODY_MISMATCH_MESSAGE,
  ATTEMPT_CONFLICT_MESSAGE,
  classifyStoreOrderNetworkFailure,
  classifyStoreOrderPostResponse,
  clearStoreOrderAttempt,
  createStoreOrderAttempt,
  formatAttemptItemsSummary,
  isConflictAttempt,
  isRestorableAttempt,
  isStoreOrderAttemptLocked,
  loadStoreOrderAttempt,
  markStoreOrderAttemptConflict,
  markStoreOrderAttemptInFlight,
  markStoreOrderAttemptSucceeded,
  markStoreOrderAttemptUnknown,
  NEW_PURCHASE_WARNING,
  prepareStoreOrderRetry,
  releaseStoreOrderAttemptForEdit,
  STORAGE_SAVE_FAILED_MESSAGE,
  UNCERTAIN_ORDER_DETAIL,
  UNCERTAIN_ORDER_HEADING,
  type StoreOrderAttemptRecord,
} from "@/lib/store-order-attempt";
import { validateOrderCreateResponse } from "@/lib/scanner-order-submit";
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

function RestoredAttemptBlock({
  storedAttempt,
  orderConflict,
  previewError,
  submitting,
  onNewPurchase,
  onCheckResult,
}: {
  storedAttempt: StoreOrderAttemptRecord;
  orderConflict: boolean;
  previewError: string;
  submitting: boolean;
  onNewPurchase: () => void;
  onCheckResult: () => void;
}) {
  return (
    <div className={styles.uncertainBlock} style={{ marginBottom: "var(--space-4)" }}>
      <p className={styles.uncertainHeading}>Сохранённая попытка покупки</p>
      <p className={styles.meta}>Документ: {storedAttempt.body.certificateCode}</p>
      <p className={styles.meta}>{formatAttemptItemsSummary(storedAttempt.body)}</p>
      {orderConflict ? (
        <p className={styles.errorText} role="alert">
          {ATTEMPT_CONFLICT_MESSAGE}
        </p>
      ) : (
        <>
          <p className={styles.uncertainHeading} style={{ marginTop: "var(--space-3)" }}>
            {UNCERTAIN_ORDER_HEADING}
          </p>
          <p className={styles.meta}>{UNCERTAIN_ORDER_DETAIL}</p>
        </>
      )}
      {previewError ? (
        <p className={styles.meta} style={{ marginTop: "var(--space-2)" }}>
          Предпросмотр: {previewError} (не блокирует проверку)
        </p>
      ) : null}
      <div className={styles.actionsRow} style={{ marginTop: "var(--space-4)" }}>
        <Button variant="secondary" onClick={onNewPurchase}>
          Новая покупка
        </Button>
        {!orderConflict ? (
          <Button disabled={submitting} onClick={onCheckResult}>
            {submitting ? "Проверка…" : "Проверить результат"}
          </Button>
        ) : null}
      </div>
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
  const [orderConflict, setOrderConflict] = useState(false);
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
    setOrderConflict(false);
    setSuccess(null);
    setConfirmedCode("");
    setCameraError("");
    setStoredAttempt(null);
    submitInFlightRef.current = false;
  }, [invalidatePreviewRequest]);

  const startNewPurchase = useCallback(() => {
    if (storedAttempt && !window.confirm(NEW_PURCHASE_WARNING)) {
      return;
    }
    resetAll();
  }, [resetAll, storedAttempt]);

  const applyPostOutcome = useCallback(
    (
      outcome: ReturnType<typeof classifyStoreOrderPostResponse>,
      wasRetry: boolean,
      certificateCode: string,
    ) => {
      switch (outcome.kind) {
        case "success": {
          const data = validateOrderCreateResponse(outcome.data);
          markStoreOrderAttemptSucceeded(userId, data.order.id);
          clearStoreOrderAttempt();
          setConfirmedCode(certificateCode);
          setSuccess(data);
          setPreviewSession(null);
          setMode("success");
          setStoredAttempt(null);
          setOrderUncertain(false);
          setOrderConflict(false);
          break;
        }
        case "conflict": {
          const conflict = markStoreOrderAttemptConflict(userId);
          setStoredAttempt(conflict);
          setOrderConflict(true);
          setOrderUncertain(false);
          setSubmitError(ATTEMPT_CONFLICT_MESSAGE);
          break;
        }
        case "uncertain": {
          const unknown = markStoreOrderAttemptUnknown(userId);
          setStoredAttempt(unknown);
          setOrderUncertain(true);
          setOrderConflict(false);
          setSubmitError("");
          break;
        }
        case "unknown_persist": {
          const unknown = markStoreOrderAttemptUnknown(userId);
          setStoredAttempt(unknown);
          setOrderUncertain(true);
          setOrderConflict(false);
          setSubmitError(outcome.message ?? "");
          break;
        }
        case "auth_required": {
          const unknown = wasRetry ? markStoreOrderAttemptUnknown(userId) : null;
          setStoredAttempt(unknown);
          setOrderUncertain(wasRetry);
          setSubmitError(outcome.message);
          break;
        }
        case "validation_failed":
          releaseStoreOrderAttemptForEdit();
          setStoredAttempt(null);
          setOrderUncertain(false);
          setOrderConflict(false);
          setSubmitError(outcome.message);
          break;
        default:
          break;
      }
    },
    [userId],
  );

  const executeOrderPost = useCallback(
    async (record: StoreOrderAttemptRecord, wasRetry: boolean) => {
      markStoreOrderAttemptInFlight(userId);
      setStoredAttempt({ ...record, status: "in_flight" });
      setSubmitting(true);
      setSubmitError("");

      try {
        const { payload } = await remcardFetchWithMeta<unknown>("/api/store/order", {
          method: "POST",
          body: record.body,
          idempotencyKey: record.idempotencyKey,
        });

        applyPostOutcome(
          classifyStoreOrderPostResponse({ status: 201, payload, wasRetry }),
          wasRetry,
          record.body.certificateCode,
        );
      } catch (caught) {
        if (caught instanceof RemcardApiError) {
          const payload = caught.body ?? (caught.message ? { error: caught.message } : null);
          applyPostOutcome(
            classifyStoreOrderPostResponse({
              status: caught.status,
              payload,
              wasRetry,
            }),
            wasRetry,
            record.body.certificateCode,
          );
        } else {
          applyPostOutcome(
            classifyStoreOrderNetworkFailure(wasRetry),
            wasRetry,
            record.body.certificateCode,
          );
        }
      } finally {
        submitInFlightRef.current = false;
        setSubmitting(false);
        setStoredAttempt(loadStoreOrderAttempt(userId));
      }
    },
    [applyPostOutcome, userId],
  );

  const runPreview = useCallback(
    async (
      raw: string,
      options?: { restoreAttempt?: StoreOrderAttemptRecord | null; optional?: boolean },
    ) => {
      if (previewLoading) {
        return;
      }

      const parsed = parseCertificateCode(raw);
      if (!parsed.ok) {
        if (!options?.optional) {
          setPreviewError(parsed.error);
          setPreviewSession(null);
        }
        return;
      }

      const requestId = previewRequestIdRef.current + 1;
      previewRequestIdRef.current = requestId;
      previewAbortRef.current?.abort();
      const abortController = new AbortController();
      previewAbortRef.current = abortController;

      setPreviewLoading(true);
      if (!options?.optional) {
        setPreviewError("");
      }
      if (!options?.restoreAttempt) {
        setSubmitError("");
        setOrderUncertain(false);
        setOrderConflict(false);
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
        if (!options?.optional) {
          setPreviewSession(null);
          setPreviewError(
            caught instanceof RemcardApiError
              ? caught.message
              : "Не удалось проверить документ",
          );
        } else {
          setPreviewError(
            caught instanceof RemcardApiError
              ? caught.message
              : "Не удалось проверить документ",
          );
        }
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
    setOrderUncertain(isRestorableAttempt(attempt));
    setOrderConflict(isConflictAttempt(attempt));
    void runPreview(attempt.body.certificateCode, { restoreAttempt: attempt, optional: true });
  }, [attemptRestoreDone, runPreview, userId]);

  const checkStoredAttempt = useCallback(async () => {
    if (submitInFlightRef.current || submitting || orderConflict) {
      return;
    }
    submitInFlightRef.current = true;
    const prepared = prepareStoreOrderRetry(userId);
    if (!prepared.ok) {
      setSubmitError(
        prepared.reason === "conflict"
          ? ATTEMPT_CONFLICT_MESSAGE
          : "Нет сохранённой попытки для проверки",
      );
      submitInFlightRef.current = false;
      return;
    }
    await executeOrderPost(prepared.record, true);
  }, [executeOrderPost, orderConflict, submitting, userId]);

  const confirmNewPurchase = useCallback(async () => {
    if (
      submitInFlightRef.current ||
      submitting ||
      orderUncertain ||
      orderConflict ||
      !isPreviewSessionAllowed(previewSession)
    ) {
      return;
    }

    const validation = validateOrderAmounts(
      previewSession.preview.availableCategories,
      amountDrafts,
    );
    if (!validation.ok) {
      setSubmitError(validation.message);
      return;
    }

    submitInFlightRef.current = true;
    const items = buildOrderItems(previewSession.preview.availableCategories, amountDrafts);
    const created = createStoreOrderAttempt({
      userId,
      body: { certificateCode: previewSession.code, items },
    });

    if (!created.ok) {
      setSubmitError(
        created.reason === "body_mismatch" || created.reason === "blocked"
          ? ATTEMPT_BODY_MISMATCH_MESSAGE
          : STORAGE_SAVE_FAILED_MESSAGE,
      );
      submitInFlightRef.current = false;
      return;
    }

    await executeOrderPost(created.record, false);
  }, [
    amountDrafts,
    executeOrderPost,
    orderConflict,
    orderUncertain,
    previewSession,
    submitting,
    userId,
  ]);

  const allowedPreview = isPreviewSessionAllowed(previewSession) ? previewSession.preview : null;
  const totals =
    allowedPreview && previewSession
      ? computeOrderTotals(allowedPreview.availableCategories, amountDrafts)
      : null;
  const amountsLocked = orderUncertain || orderConflict || isStoreOrderAttemptLocked(storedAttempt);
  const showRestoredBlock =
    storedAttempt && (isRestorableAttempt(storedAttempt) || isConflictAttempt(storedAttempt));

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
        {showRestoredBlock ? (
          <RestoredAttemptBlock
            storedAttempt={storedAttempt}
            orderConflict={orderConflict}
            previewError={previewError}
            submitting={submitting}
            onNewPurchase={startNewPurchase}
            onCheckResult={() => void checkStoredAttempt()}
          />
        ) : null}

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

          {submitError ? (
            <p className={styles.errorText} role="alert">
              {submitError}
            </p>
          ) : null}

          {!showRestoredBlock ? (
            <div className={styles.actionsRow}>
              <Button variant="secondary" disabled={submitting} onClick={startNewPurchase}>
                Отмена
              </Button>
              <Button
                disabled={submitting || !totals || totals.totalAmount <= 0 || orderConflict}
                onClick={() => void confirmNewPurchase()}
              >
                {submitting ? "Подтверждение…" : "Подтвердить покупку"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (showRestoredBlock) {
    return (
      <RestoredAttemptBlock
        storedAttempt={storedAttempt}
        orderConflict={orderConflict}
        previewError={previewError}
        submitting={submitting}
        onNewPurchase={startNewPurchase}
        onCheckResult={() => void checkStoredAttempt()}
      />
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
