"use client";

import Link from "next/link";
import { RewardConfirmationFields } from "./RewardConfirmationFields";
import { defaultRewardDraft, rewardDraftToTerms, rewardTermsToDraft, type RewardConfirmationDraft } from "@/lib/reward-confirmation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCabinetPresentation } from "@/components/layout/CabinetPresentationContext";
import {
  resolveScannerBranchContext,
  SCANNER_LEGACY_ATTEMPT_BRANCH_MESSAGE,
  type ScannerBranchResolution,
  isStorePurchaseBranchScoped,
} from "@/lib/scanner-branch-context";
import { ScannerBranchOperationField } from "./ScannerBranchOperationField";
import { displayCategoryLabel, displayCategoryLabelFromStored } from "@/lib/category-display";
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
import { ScannerNewPartnerEmpty } from "./ScannerNewPartnerEmpty";
import {
  initialScannerEmptyActivityProbe,
  scannerEmptyProbeAfterSuccessfulOrder,
  shouldShowScannerNewPartnerEmpty,
  type ScannerEmptyActivityProbe,
} from "@/lib/scanner-empty/eligibility";
import { loadScannerEmptyActivityProbe } from "@/lib/scanner-empty/load-activity";
import styles from "./scanner.module.css";
import { WelcomeContentAreaPending } from "@/components/welcome-first-paint/WelcomeContentAreaPending";
import { isScannerWelcomeDecisionPending } from "@/lib/welcome-first-paint/welcomeFirstPaintPending";

const SCANNER_WORKBENCH_ID = "scanner-workbench";

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
                      {displayCategoryLabelFromStored(cat.categoryLabel)}: −{cat.discountPercent}%
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
  legacyBranchAttempt,
  onNewPurchase,
  onCheckResult,
}: {
  storedAttempt: StoreOrderAttemptRecord;
  orderConflict: boolean;
  previewError: string;
  submitting: boolean;
  legacyBranchAttempt?: boolean;
  onNewPurchase: () => void;
  onCheckResult: () => void;
}) {
  return (
    <div className={styles.uncertainBlock} style={{ marginBottom: "var(--space-4)" }}>
      <p className={styles.uncertainHeading}>Сохранённая попытка покупки</p>
      <p className={styles.meta}>Документ: {storedAttempt.body.certificateCode}</p>
      <p className={styles.meta}>{formatAttemptItemsSummary(storedAttempt.body)}</p>
      {legacyBranchAttempt ? (
        <p className={styles.errorText} role="alert">
          {SCANNER_LEGACY_ATTEMPT_BRANCH_MESSAGE}
        </p>
      ) : null}
      {orderConflict ? (
        <p className={styles.errorText} role="alert">
          {ATTEMPT_CONFLICT_MESSAGE}
        </p>
      ) : !legacyBranchAttempt ? (
        <>
          <p className={styles.uncertainHeading} style={{ marginTop: "var(--space-3)" }}>
            {UNCERTAIN_ORDER_HEADING}
          </p>
          <p className={styles.meta}>{UNCERTAIN_ORDER_DETAIL}</p>
        </>
      ) : null}
      {previewError ? (
        <p className={styles.meta} style={{ marginTop: "var(--space-2)" }}>
          Предпросмотр: {previewError} (не блокирует проверку)
        </p>
      ) : null}
      <div className={styles.actionsRow} style={{ marginTop: "var(--space-4)" }}>
        <Button variant="secondary" onClick={onNewPurchase}>
          Новая покупка
        </Button>
        {!orderConflict && !legacyBranchAttempt ? (
          <Button disabled={submitting} onClick={onCheckResult}>
            {submitting ? "Проверка…" : "Проверить результат"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ScannerHub({ userId }: ScannerHubProps) {
  const presentation = useCabinetPresentation();
  const branchResolution: ScannerBranchResolution = useMemo(
    () =>
      resolveScannerBranchContext({
        contextReady: presentation?.contextReady === true,
        proContext: presentation?.proContext ?? null,
      }),
    [presentation?.contextReady, presentation?.proContext],
  );
  const [operationBranchId, setOperationBranchId] = useState("");

  const [mode, setMode] = useState<ScanMode>("manual");
  const [manualCode, setManualCode] = useState("");
  const [previewSession, setPreviewSession] = useState<PreviewSession | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [rewardDrafts, setRewardDrafts] = useState<Record<string, RewardConfirmationDraft>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderUncertain, setOrderUncertain] = useState(false);
  const [orderConflict, setOrderConflict] = useState(false);
  const [success, setSuccess] = useState<OrderCreateResponse | null>(null);
  const [confirmedCode, setConfirmedCode] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [storedAttempt, setStoredAttempt] = useState<StoreOrderAttemptRecord | null>(null);
  const [attemptRestoreDone, setAttemptRestoreDone] = useState(false);
  const [activityProbe, setActivityProbe] = useState<ScannerEmptyActivityProbe>(
    initialScannerEmptyActivityProbe,
  );

  const previewRequestIdRef = useRef(0);
  const workbenchRef = useRef<HTMLDivElement | null>(null);
  const previewAbortRef = useRef<AbortController | null>(null);
  const submitInFlightRef = useRef(false);
  const sessionOrderCompletedRef = useRef(false);

  const showNewPartnerEmpty = shouldShowScannerNewPartnerEmpty(activityProbe);
  const welcomeDecisionPending = isScannerWelcomeDecisionPending(activityProbe);

  useEffect(() => {
    if (branchResolution.kind === "ready") {
      setOperationBranchId(branchResolution.branchId);
    }
  }, [branchResolution]);

  const orderBranchIdForRequest = useMemo(() => {
    if (branchResolution.kind === "not_required") return undefined;
    if (branchResolution.kind === "ready") return branchResolution.branchId;
    if (branchResolution.kind === "pick") {
      return operationBranchId.trim() || undefined;
    }
    return undefined;
  }, [branchResolution, operationBranchId]);

  useEffect(() => {
    let cancelled = false;
    setActivityProbe({ status: "loading" });
    void loadScannerEmptyActivityProbe().then((probe) => {
      if (cancelled || sessionOrderCompletedRef.current) {
        return;
      }
      setActivityProbe(probe);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const invalidatePreviewRequest = useCallback(() => {
    previewRequestIdRef.current += 1;
    previewAbortRef.current?.abort();
    previewAbortRef.current = null;
  }, []);

  const branchPickRequired =
    branchResolution.kind === "pick" && !orderBranchIdForRequest;
  const branchContextBlocked = branchResolution.kind === "blocked";
  const legacyBranchAttempt =
    isStorePurchaseBranchScoped(presentation?.proContext ?? null) &&
    storedAttempt != null &&
    !storedAttempt.branchId &&
    (storedAttempt.status === "unknown" ||
      storedAttempt.status === "in_flight" ||
      storedAttempt.status === "conflict");

  const handleOperationBranchChange = useCallback(
    (branchId: string) => {
      if (isStoreOrderAttemptLocked(storedAttempt)) {
        return;
      }
      if (storedAttempt?.branchId && storedAttempt.branchId !== branchId) {
        setSubmitError("Нельзя сменить филиал во время сохранённой попытки.");
        return;
      }
      invalidatePreviewRequest();
      setPreviewSession(null);
      setPreviewError("");
      setSubmitError("");
      setOperationBranchId(branchId);
    },
    [invalidatePreviewRequest, storedAttempt],
  );

  const focusScannerWorkbench = useCallback(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    workbenchRef.current?.scrollIntoView?.({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
    window.requestAnimationFrame(() => {
      document.getElementById("scanner-manual-code")?.focus();
    });
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
          sessionOrderCompletedRef.current = true;
          markStoreOrderAttemptSucceeded(userId, data.order.id);
          clearStoreOrderAttempt();
          setConfirmedCode(certificateCode);
          setSuccess(data);
          setPreviewSession(null);
          setMode("success");
          setStoredAttempt(null);
          setOrderUncertain(false);
          setOrderConflict(false);
          setActivityProbe((prev) => scannerEmptyProbeAfterSuccessfulOrder(prev));
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
          searchParams: record.branchId ? { branchId: record.branchId } : undefined,
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

      if (branchContextBlocked || branchPickRequired || legacyBranchAttempt) {
        if (!options?.optional) {
          setPreviewError(
            branchContextBlocked
              ? branchResolution.kind === "blocked"
                ? branchResolution.message
                : "Выберите филиал для операции"
              : branchPickRequired
                ? "Выберите филиал для операции"
                : SCANNER_LEGACY_ATTEMPT_BRANCH_MESSAGE,
          );
        }
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
          searchParams: orderBranchIdForRequest
            ? { branchId: orderBranchIdForRequest }
            : undefined,
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
            setRewardDrafts(Object.fromEntries(options.restoreAttempt.body.items.map(item =>
              [item.category, rewardTermsToDraft(item.rewardConfirmation)])));
          } else {
            const drafts: Record<string, string> = {};
            for (const cat of data.availableCategories) {
              drafts[cat.category] = "";
            }
            setAmountDrafts(drafts);
            setRewardDrafts({});
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
    [
      previewLoading,
      branchContextBlocked,
      branchPickRequired,
      legacyBranchAttempt,
      branchResolution,
      orderBranchIdForRequest,
    ],
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
  if (attempt.branchId) {
      setOperationBranchId(attempt.branchId);
    }
    setOrderUncertain(isRestorableAttempt(attempt));
    setOrderConflict(isConflictAttempt(attempt));
    if (!attempt.branchId && isStorePurchaseBranchScoped(presentation?.proContext ?? null)) {
      return;
    }
    void runPreview(attempt.body.certificateCode, { restoreAttempt: attempt, optional: true });
  }, [attemptRestoreDone, presentation?.proContext, runPreview, userId]);

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

    let items;
    try {
      items = buildOrderItems(previewSession.preview.availableCategories, amountDrafts)
        .map(item => previewSession.preview.partner.isSelfScan ? item : ({ ...item,
          rewardConfirmation: rewardDraftToTerms(rewardDrafts[item.category] ?? defaultRewardDraft),
        }));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Проверьте сроки подтверждения");
      return;
    }
    submitInFlightRef.current = true;
    const created = createStoreOrderAttempt({
      userId,
      body: { certificateCode: previewSession.code, items },
      branchId: orderBranchIdForRequest,
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
    rewardDrafts,
    executeOrderPost,
    orderConflict,
    orderUncertain,
    previewSession,
    submitting,
    orderBranchIdForRequest,
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
            legacyBranchAttempt={legacyBranchAttempt}
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
                  <strong>{displayCategoryLabel(category.category, category.categoryLabel)}</strong>
                  <span className={styles.discountBadge}>−{category.discountPercent}%</span>
                </div>
                <TextField
                  id={`scanner-amount-${category.category}`}
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
                {!preview.partner.isSelfScan ? <RewardConfirmationFields category={category.category}
                  draft={rewardDrafts[category.category] ?? defaultRewardDraft}
                  disabled={submitting || amountsLocked}
                  onChange={value => setRewardDrafts(prev => ({ ...prev, [category.category]: value }))}
                  onApplyAll={() => {
                    const days = (rewardDrafts[category.category] ?? defaultRewardDraft).days;
                    setRewardDrafts(prev => Object.fromEntries(preview.availableCategories.map(cat =>
                      [cat.category, { ...(prev[cat.category] ?? defaultRewardDraft), days }])));
                  }} /> : null}
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
        legacyBranchAttempt={legacyBranchAttempt}
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
      {welcomeDecisionPending ? (
        <WelcomeContentAreaPending testId="scanner-welcome-decision-pending" />
      ) : null}
      {!welcomeDecisionPending && showNewPartnerEmpty ? (
        <ScannerNewPartnerEmpty onOpenScanner={focusScannerWorkbench} />
      ) : null}
      <div id={SCANNER_WORKBENCH_ID} ref={workbenchRef}>
        {branchContextBlocked ? (
          <div className={styles.branchBlocked} role="alert">
            {branchResolution.kind === "blocked" ? branchResolution.message : null}
          </div>
        ) : null}
        {legacyBranchAttempt ? (
          <div className={styles.branchBlocked} role="alert">
            {SCANNER_LEGACY_ATTEMPT_BRANCH_MESSAGE}
          </div>
        ) : null}
        {branchResolution.kind === "pick" ? (
          <ScannerBranchOperationField
            options={branchResolution.options}
            value={operationBranchId}
            disabled={isStoreOrderAttemptLocked(storedAttempt)}
            onChange={handleOperationBranchChange}
          />
        ) : null}
        {branchResolution.kind === "ready" ? (
          <p className={styles.meta} style={{ marginBottom: "var(--space-4)" }}>
            Филиал для операции:{" "}
            {branchResolution.options.find((o) => o.id === branchResolution.branchId)?.label ??
              branchResolution.branchId}
          </p>
        ) : null}
        {!welcomeDecisionPending && !showNewPartnerEmpty ? (
          <div className={styles.scannerHero}>
            <span className={styles.scannerIcon} aria-hidden>
              ▣
            </span>
            <p className={styles.scannerLead}>
              Сканируйте QR-код документа или введите промокод вручную. Предпросмотр не создаёт
              покупку — подтверждение только по кнопке ниже.
            </p>
          </div>
        ) : null}
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
              id="scanner-manual-code"
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
          <Button
            disabled={
              previewLoading || branchContextBlocked || branchPickRequired || legacyBranchAttempt
            }
            onClick={() => void runPreview(manualCode)}
          >
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
      </div>
    </>
  );
}
