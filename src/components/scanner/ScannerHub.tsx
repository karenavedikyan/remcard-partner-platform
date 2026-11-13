"use client";

import Link from "next/link";
import { RewardConfirmationFields } from "./RewardConfirmationFields";
import { PurchaseReviewModal } from "./PurchaseReviewModal";
import { ScannerReferringPartnerBlock } from "./ScannerReferringPartnerBlock";
import { PartnerClientCertificateCard } from "@/components/recommendations/PartnerClientCertificateCard";
import { buildStoreCertificateClientCardModel } from "@/lib/storeCertificateClientCardModel";
import { resolveCertificatePageUrl } from "@/lib/certificate-url";
import { orderPreviewToStoreCertificate } from "@/lib/order-preview-certificate";
import { defaultRewardDraft, rewardDraftToTerms, rewardTermsToDraft, type RewardConfirmationDraft } from "@/lib/reward-confirmation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCabinetPresentation } from "@/components/layout/CabinetPresentationContext";
import {
  resolveScannerBranchContext,
  SCANNER_CAPTURED_BRANCH_INACCESSIBLE_MESSAGE,
  SCANNER_LEGACY_ATTEMPT_BRANCH_MESSAGE,
  isOperationBranchAccessible,
  operationBranchLabelFromResolution,
  scannerShowsOperationBranchControl,
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
import scannerButtonStyles from "./scanner-control-button.module.css";
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
import { parseScannerAppealQueryValues } from "@/lib/scanner/receiving-appeal-handoff";
import { useReceivingAppealScannerHandoff } from "./useReceivingAppealScannerHandoff";
import {
  ReceivingAppealScannerBanner,
  ReceivingAppealScannerSuccessLinkPanel,
} from "./ReceivingAppealScannerPanels";
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
  operationBranchLabel,
  onNewPurchase,
  onCheckResult,
}: {
  storedAttempt: StoreOrderAttemptRecord;
  orderConflict: boolean;
  previewError: string;
  submitting: boolean;
  legacyBranchAttempt?: boolean;
  operationBranchLabel?: string | null;
  onNewPurchase: () => void;
  onCheckResult: () => void;
}) {
  return (
    <div className={styles.uncertainBlock} style={{ marginBottom: "var(--space-4)" }}>
      <p className={styles.uncertainHeading}>Сохранённая попытка покупки</p>
      {operationBranchLabel ? (
        <p className={styles.meta}>Филиал операции (зафиксирован): {operationBranchLabel}</p>
      ) : legacyBranchAttempt ? null : (
        <p className={styles.meta}>Филиал операции: не зафиксирован</p>
      )}
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
        <Button variant="secondary" className={scannerButtonStyles.controlButton} onClick={onNewPurchase}>
          Новая покупка
        </Button>
        {!orderConflict && !legacyBranchAttempt ? (
          <Button className={scannerButtonStyles.controlButton} disabled={submitting} onClick={onCheckResult}>
            {submitting ? "Проверка…" : "Проверить результат"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ScannerHub({ userId }: ScannerHubProps) {
  const searchParams = useSearchParams();
  const receivingHandoff = useReceivingAppealScannerHandoff(
    searchParams ? parseScannerAppealQueryValues(searchParams.getAll("appealId")) : { mode: "none" },
  );
  const receivingRef = useRef(receivingHandoff);
  receivingRef.current = receivingHandoff;
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
  const [purchaseReviewOpen, setPurchaseReviewOpen] = useState(false);
  const [storedAttempt, setStoredAttempt] = useState<StoreOrderAttemptRecord | null>(null);
  const confirmPurchaseButtonRef = useRef<HTMLButtonElement>(null);
  const [attemptRestoreDone, setAttemptRestoreDone] = useState(false);
  const [activityProbe, setActivityProbe] = useState<ScannerEmptyActivityProbe>(
    initialScannerEmptyActivityProbe,
  );

  const previewRequestIdRef = useRef(0);
  const previewBranchByRequestIdRef = useRef(new Map<number, string | undefined>());
  const orderBranchIdForRequestRef = useRef<string | undefined>(undefined);
  const operationBranchUserPickedRef = useRef(false);
  const workbenchRef = useRef<HTMLDivElement | null>(null);
  const previewAbortRef = useRef<AbortController | null>(null);
  const submitInFlightRef = useRef(false);
  const sessionOrderCompletedRef = useRef(false);

  const showNewPartnerEmpty = shouldShowScannerNewPartnerEmpty(activityProbe);
  const welcomeDecisionPending = isScannerWelcomeDecisionPending(activityProbe);

  const orderBranchIdForRequest = useMemo(() => {
    if (branchResolution.kind === "not_required") return undefined;
    if (branchResolution.kind === "ready") {
      return operationBranchId.trim() || branchResolution.branchId;
    }
    return undefined;
  }, [branchResolution, operationBranchId]);

  orderBranchIdForRequestRef.current = orderBranchIdForRequest;

  const prefillAppealGenRef = useRef(0);
  useEffect(() => {
    const code = receivingHandoff.certificatePrefillCode;
    if (!code || !receivingHandoff.appealScoped) {
      return;
    }
    const gen = ++prefillAppealGenRef.current;
    setManualCode((prev) => (prev.trim() ? prev : gen === prefillAppealGenRef.current ? code : prev));
  }, [receivingHandoff.appealScoped, receivingHandoff.certificatePrefillCode, receivingHandoff.appealId]);

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
    setPreviewLoading(false);
  }, []);

  useEffect(() => {
  const branchScopeActive = isStorePurchaseBranchScoped(presentation?.proContext ?? null);

  if (branchResolution.kind !== "ready") {
    if (branchScopeActive) {
      invalidatePreviewRequest();
      setPreviewSession(null);
      setSubmitError("");
      if (branchResolution.kind === "blocked") {
        setPreviewError(branchResolution.message);
      } else {
        setPreviewError("");
      }
    }
    return;
  }
    const { branchId: defaultBranchId } = branchResolution;
    const proContext = presentation?.proContext ?? null;

    if (storedAttempt?.branchId && isStoreOrderAttemptLocked(storedAttempt)) {
      if (operationBranchId !== storedAttempt.branchId) {
        setOperationBranchId(storedAttempt.branchId);
      }
      return;
    }

    if (storedAttempt?.branchId && isRestorableAttempt(storedAttempt)) {
      if (operationBranchId !== storedAttempt.branchId) {
        setOperationBranchId(storedAttempt.branchId);
      }
      return;
    }

    const currentAllowed = operationBranchId.trim()
      ? isOperationBranchAccessible(operationBranchId, proContext)
      : false;

    if (!currentAllowed) {
      invalidatePreviewRequest();
      setPreviewSession(null);
      setPreviewError("");
      setOperationBranchId(defaultBranchId);
      operationBranchUserPickedRef.current = false;
      return;
    }

    if (!operationBranchId.trim()) {
      setOperationBranchId(defaultBranchId);
      return;
    }

    if (
      !operationBranchUserPickedRef.current &&
      !storedAttempt?.branchId &&
      operationBranchId.trim() &&
      operationBranchId !== defaultBranchId
    ) {
      invalidatePreviewRequest();
      setPreviewSession(null);
      setPreviewError("");
      setSubmitError("");
      setOperationBranchId(defaultBranchId);
    }
  }, [
    branchResolution,
    invalidatePreviewRequest,
    operationBranchId,
    presentation?.proContext,
    storedAttempt,
  ]);

  const branchContextBlocked = branchResolution.kind === "blocked";
  const showOperationBranchControl = scannerShowsOperationBranchControl(branchResolution);
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
      operationBranchUserPickedRef.current = true;
      setOperationBranchId(branchId);
    },
    [invalidatePreviewRequest, storedAttempt],
  );

  const capturedAttemptBranchLabel = useMemo(() => {
    if (!storedAttempt?.branchId) {
      return null;
    }
    return (
      operationBranchLabelFromResolution(storedAttempt.branchId, branchResolution) ??
      storedAttempt.branchId
    );
  }, [branchResolution, storedAttempt?.branchId]);

  const activeOperationBranchLabel = useMemo(
    () => operationBranchLabelFromResolution(operationBranchId, branchResolution),
    [branchResolution, operationBranchId],
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
    setPurchaseReviewOpen(false);
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
      idempotencyKey: string,
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
          const handoff = receivingRef.current;
          if (handoff.appealId) {
            handoff.beginOrderLinkAfterSuccess(data.order.id, idempotencyKey);
          }
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
      receivingRef.current.prepareOrderAttemptScope(record.idempotencyKey, wasRetry);
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
          record.idempotencyKey,
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
            record.idempotencyKey,
          );
        } else {
          applyPostOutcome(
            classifyStoreOrderNetworkFailure(wasRetry),
            wasRetry,
            record.body.certificateCode,
            record.idempotencyKey,
          );
        }
      } finally {
        submitInFlightRef.current = false;
        setSubmitting(false);
        setPurchaseReviewOpen(false);
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

      if (branchContextBlocked || legacyBranchAttempt) {
        if (!options?.optional) {
          setPreviewError(
            branchContextBlocked
              ? branchResolution.kind === "blocked"
                ? branchResolution.message
                : "Недоступен филиал для операции"
              : SCANNER_LEGACY_ATTEMPT_BRANCH_MESSAGE,
          );
        }
        return;
      }

      if (branchResolution.kind === "ready" && !options?.restoreAttempt && !orderBranchIdForRequest) {
        if (!options?.optional) {
          setPreviewError("Недоступен филиал для операции");
        }
        return;
      }

      const proContext = presentation?.proContext ?? null;
      let branchIdForPreview: string | undefined | null = undefined;
      if (branchResolution.kind === "ready") {
        if (options?.restoreAttempt?.branchId) {
          const captured = options.restoreAttempt.branchId.trim();
          if (!isOperationBranchAccessible(captured, proContext)) {
            branchIdForPreview = null;
          } else {
            branchIdForPreview = captured;
          }
        } else {
          branchIdForPreview = orderBranchIdForRequest ?? null;
        }
      }

      if (branchIdForPreview === null) {
        if (!options?.optional) {
          setPreviewError(SCANNER_CAPTURED_BRANCH_INACCESSIBLE_MESSAGE);
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
      previewBranchByRequestIdRef.current.set(requestId, branchIdForPreview ?? undefined);
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
          searchParams: branchIdForPreview ? { branchId: branchIdForPreview } : undefined,
        });

        const branchAtRequest = previewBranchByRequestIdRef.current.get(requestId);
        const branchGate =
          options?.restoreAttempt != null
            ? branchAtRequest
            : orderBranchIdForRequestRef.current;
        if (
          !shouldApplyPreviewResponse(
            requestId,
            previewRequestIdRef.current,
            abortController.signal,
            branchAtRequest,
            branchGate,
          )
        ) {
          return;
        }

        if ("allowed" in data && data.allowed) {
          const certMismatch = receivingRef.current.assertPreviewAllowed(data);
          if (certMismatch) {
            if (!options?.optional) {
              setPreviewError(certMismatch);
              setPreviewSession(null);
            } else {
              setPreviewError(certMismatch);
            }
            return;
          }
        }

        const session: PreviewSession = {
          code: parsed.code,
          preview: data,
          branchId: branchIdForPreview ?? undefined,
        };
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
        const branchAtRequest = previewBranchByRequestIdRef.current.get(requestId);
        const branchGate =
          options?.restoreAttempt != null
            ? branchAtRequest
            : orderBranchIdForRequestRef.current;
        if (
          !shouldApplyPreviewResponse(
            requestId,
            previewRequestIdRef.current,
            abortController.signal,
            branchAtRequest,
            branchGate,
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
      legacyBranchAttempt,
      branchResolution,
      orderBranchIdForRequest,
      presentation?.proContext,
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
    if (
      attempt.branchId &&
      !isOperationBranchAccessible(attempt.branchId, presentation?.proContext ?? null)
    ) {
      setPreviewError(SCANNER_CAPTURED_BRANCH_INACCESSIBLE_MESSAGE);
      return;
    }
    void runPreview(attempt.body.certificateCode, { restoreAttempt: attempt, optional: true });
  }, [attemptRestoreDone, presentation?.proContext, runPreview, userId]);

  const checkStoredAttempt = useCallback(async () => {
    if (submitInFlightRef.current || submitting || orderConflict) {
      return;
    }
    if (legacyBranchAttempt) {
      setSubmitError(SCANNER_LEGACY_ATTEMPT_BRANCH_MESSAGE);
      return;
    }
    if (!presentation?.contextReady) {
      setSubmitError("Контекст рабочего места ещё загружается. Повторите позже.");
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
    if (
      isStorePurchaseBranchScoped(presentation?.proContext ?? null) &&
      !prepared.record.branchId
    ) {
      setSubmitError(SCANNER_LEGACY_ATTEMPT_BRANCH_MESSAGE);
      submitInFlightRef.current = false;
      return;
    }
    if (
      prepared.record.branchId &&
      !isOperationBranchAccessible(prepared.record.branchId, presentation?.proContext ?? null)
    ) {
      setSubmitError(SCANNER_CAPTURED_BRANCH_INACCESSIBLE_MESSAGE);
      submitInFlightRef.current = false;
      return;
    }
    await executeOrderPost(prepared.record, true);
  }, [
    executeOrderPost,
    legacyBranchAttempt,
    orderConflict,
    presentation?.contextReady,
    presentation?.proContext,
    submitting,
    userId,
  ]);

  const openPurchaseReview = useCallback(() => {
    if (
      submitting ||
      orderConflict ||
      !isPreviewSessionAllowed(previewSession) ||
      branchContextBlocked
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

    if (!previewSession.preview.partner.isSelfScan) {
      try {
        buildOrderItems(previewSession.preview.availableCategories, amountDrafts).forEach((item) => {
          rewardDraftToTerms(rewardDrafts[item.category] ?? defaultRewardDraft);
        });
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "Проверьте сроки подтверждения",
        );
        return;
      }
    }

    setSubmitError("");
    setPurchaseReviewOpen(true);
  }, [
    amountDrafts,
    branchContextBlocked,
    orderConflict,
    previewSession,
    rewardDrafts,
    submitting,
  ]);

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

    const handoff = receivingRef.current;
    if (handoff.appealInvalid || (handoff.appealScoped && !handoff.allowsNewStoreOrder)) {
      setSubmitError(
        handoff.context.status === "ready" && handoff.context.orderAlreadyLinked
          ? "К обращению уже привязан заказ."
          : "Нет права оформить покупку для этого обращения.",
      );
      return;
    }
    if (handoff.requiresAppealReady) {
      setSubmitError("Загружаем обращение. Повторите после готовности контекста.");
      return;
    }
    if (!presentation?.contextReady) {
      setSubmitError("Контекст рабочего места ещё загружается. Повторите поиск.");
      return;
    }

    if (branchContextBlocked) {
      setSubmitError(
        branchResolution.kind === "blocked"
          ? branchResolution.message
          : "Недоступен филиал для операции",
      );
      return;
    }

    const branchScoped = isStorePurchaseBranchScoped(presentation?.proContext ?? null);
    if (branchScoped) {
      if (branchResolution.kind !== "ready" || !orderBranchIdForRequest?.trim()) {
        setSubmitError("Недоступен филиал для операции. Повторите поиск.");
        return;
      }
      if (!isOperationBranchAccessible(orderBranchIdForRequest, presentation?.proContext ?? null)) {
        setSubmitError(SCANNER_CAPTURED_BRANCH_INACCESSIBLE_MESSAGE);
        return;
      }
      const previewBranch = previewSession.branchId?.trim() || null;
      const activeBranch = orderBranchIdForRequest.trim();
      if (previewBranch !== activeBranch) {
        setSubmitError("Филиал операции изменился. Повторите поиск документа.");
        return;
      }
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
    branchContextBlocked,
    branchResolution,
    orderBranchIdForRequest,
    presentation?.contextReady,
    presentation?.proContext,
    userId,
  ]);

  const allowedPreview = isPreviewSessionAllowed(previewSession) ? previewSession.preview : null;
  const totals =
    allowedPreview && previewSession
      ? computeOrderTotals(allowedPreview.availableCategories, amountDrafts)
      : null;

  const clientCertificateModel = useMemo(() => {
    if (!allowedPreview || !previewSession) return null;
    const cert = orderPreviewToStoreCertificate(allowedPreview, previewSession.code);
    const pageUrl = resolveCertificatePageUrl(cert);
    return buildStoreCertificateClientCardModel(cert, cert.promoCode, pageUrl);
  }, [allowedPreview, previewSession]);

  useEffect(() => {
    if (!purchaseReviewOpen) return;
    if (!isPreviewSessionAllowed(previewSession)) {
      setPurchaseReviewOpen(false);
    }
  }, [previewSession, purchaseReviewOpen]);
  const amountsLocked = orderUncertain || orderConflict || isStoreOrderAttemptLocked(storedAttempt);
  const showRestoredBlock =
    storedAttempt && (isRestorableAttempt(storedAttempt) || isConflictAttempt(storedAttempt));

  if (receivingHandoff.appealInvalid) {
    return (
      <ReceivingAppealScannerBanner
        context={receivingHandoff.context}
        appealId={receivingHandoff.appealId}
      />
    );
  }

  if (
    receivingHandoff.appealScoped &&
    (receivingHandoff.context.status === "forbidden" ||
      receivingHandoff.context.status === "not_found" ||
      receivingHandoff.context.status === "blocked" ||
      receivingHandoff.context.status === "error")
  ) {
    return (
      <ReceivingAppealScannerBanner
        context={receivingHandoff.context}
        appealId={receivingHandoff.appealId}
      />
    );
  }

  if (
    receivingHandoff.appealScoped &&
    receivingHandoff.context.status === "ready" &&
    receivingHandoff.context.orderAlreadyLinked &&
    mode !== "success"
  ) {
    return (
      <ReceivingAppealScannerBanner
        context={receivingHandoff.context}
        appealId={receivingHandoff.appealId}
      />
    );
  }

  if (mode === "success" && success) {
    const appealId = receivingHandoff.appealId;
    return (
      <div>
        <ReceivingAppealScannerBanner context={receivingHandoff.context} appealId={appealId} />
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
        {appealId ? (
          <ReceivingAppealScannerSuccessLinkPanel
            appealId={appealId}
            orderId={success.order.id}
            linkPhase={receivingHandoff.linkPhase}
            linkError={receivingHandoff.linkError}
            onRetryLink={receivingHandoff.retryOrderLinkOnly}
          />
        ) : (
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
            <Button className={scannerButtonStyles.controlButton} onClick={resetAll}>
              Новая покупка
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (previewSession && allowedPreview) {
    const { code } = previewSession;
    const preview = allowedPreview;
    const confirmationBranchLabel =
      operationBranchLabelFromResolution(
        previewSession.branchId ?? orderBranchIdForRequest,
        branchResolution,
      ) ?? activeOperationBranchLabel;
    return (
      <div>
        <ReceivingAppealScannerBanner
          context={receivingHandoff.context}
          appealId={receivingHandoff.appealId}
        />
        {showRestoredBlock ? (
          <RestoredAttemptBlock
            storedAttempt={storedAttempt}
            orderConflict={orderConflict}
            previewError={previewError}
            submitting={submitting}
            legacyBranchAttempt={legacyBranchAttempt}
            operationBranchLabel={capturedAttemptBranchLabel ?? activeOperationBranchLabel}
            onNewPurchase={startNewPurchase}
            onCheckResult={() => void checkStoredAttempt()}
          />
        ) : null}

        {branchResolution.kind === "ready" && confirmationBranchLabel ? (
          <p className={styles.branchConfirmLabel} data-testid="scanner-confirmation-branch">
            Филиал операции: {confirmationBranchLabel}
          </p>
        ) : null}

        <div className={styles.confirmationLayout}>
          <div className={styles.certColumn}>
            {clientCertificateModel ? (
              <PartnerClientCertificateCard
                model={clientCertificateModel}
                presentation="scanner"
              />
            ) : null}
            <ScannerReferringPartnerBlock referringPartner={preview.referringPartner} />
            <details className={styles.issuerDetails}>
              <summary>Эмитент и где принимается документ</summary>
              <div className={styles.issuerDetailsBody}>
                <p className={styles.meta}>
                  {preview.certificate.issuer.label}: {preview.certificate.issuer.name}
                </p>
                <p className={styles.meta}>Код для операции: {code}</p>
                {preview.certificate.userAlias ? (
                  <p className={styles.meta}>Клиент: {preview.certificate.userAlias}</p>
                ) : null}
                <PartnerAcceptance preview={preview} />
              </div>
            </details>
          </div>

          <div className={styles.card} style={{ marginBottom: 0 }}>
          <h2 className={styles.formLead}>Введите суммы покупки</h2>
          <p className={styles.formHint}>
            Суммы до скидки, в рублях. Окончательный расчёт выполняет сервер при подтверждении.
          </p>
          <p className={styles.meta}>
            Партнёр: {preview.partner.storeName}
            {preview.partner.isSelfScan ? " · самосканирование" : ""}
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
              <Button
                variant="secondary"
                className={scannerButtonStyles.controlButton}
                disabled={submitting}
                onClick={startNewPurchase}
              >
                Отмена
              </Button>
              <Button
                ref={confirmPurchaseButtonRef}
                className={scannerButtonStyles.controlButton}
                disabled={
                  submitting ||
                  !totals ||
                  totals.totalAmount <= 0 ||
                  orderConflict ||
                  branchContextBlocked
                }
                onClick={openPurchaseReview}
              >
                Подтвердить покупку
              </Button>
            </div>
          ) : null}
          </div>
        </div>

        {totals ? (
          <PurchaseReviewModal
            open={purchaseReviewOpen}
            preview={preview}
            amountDrafts={amountDrafts}
            rewardDrafts={rewardDrafts}
            totals={totals}
            branchLabel={confirmationBranchLabel}
            submitting={submitting}
            onClose={() => {
              setPurchaseReviewOpen(false);
              queueMicrotask(() => confirmPurchaseButtonRef.current?.focus());
            }}
            onConfirm={() => void confirmNewPurchase()}
          />
        ) : null}
      </div>
    );
  }

  if (showRestoredBlock) {
    return (
      <>
        {showOperationBranchControl && !isStoreOrderAttemptLocked(storedAttempt) ? (
          <ScannerBranchOperationField
            options={branchResolution.kind === "ready" ? branchResolution.options : []}
            value={operationBranchId}
            disabled={isStoreOrderAttemptLocked(storedAttempt)}
            onChange={handleOperationBranchChange}
          />
        ) : null}
        {branchResolution.kind === "ready" && !showOperationBranchControl ? (
          <p className={styles.meta} style={{ marginBottom: "var(--space-4)" }}>
            Филиал операции: {activeOperationBranchLabel ?? operationBranchId}
          </p>
        ) : null}
        <RestoredAttemptBlock
          storedAttempt={storedAttempt}
          orderConflict={orderConflict}
          previewError={previewError}
          submitting={submitting}
          legacyBranchAttempt={legacyBranchAttempt}
          operationBranchLabel={capturedAttemptBranchLabel ?? activeOperationBranchLabel}
          onNewPurchase={startNewPurchase}
          onCheckResult={() => void checkStoredAttempt()}
        />
      </>
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
          <Button variant="secondary" className={scannerButtonStyles.controlButton} onClick={resetAll}>
            Сканировать другой код
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ReceivingAppealScannerBanner
        context={receivingHandoff.context}
        appealId={receivingHandoff.appealId}
      />
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
        {showOperationBranchControl && branchResolution.kind === "ready" ? (
          <ScannerBranchOperationField
            options={branchResolution.options}
            value={operationBranchId}
            disabled={isStoreOrderAttemptLocked(storedAttempt)}
            onChange={handleOperationBranchChange}
          />
        ) : null}
        {branchResolution.kind === "ready" && !showOperationBranchControl ? (
          <p className={styles.meta} style={{ marginBottom: "var(--space-4)" }}>
            Филиал операции:{" "}
            {branchResolution.options.find((o) => o.id === operationBranchId)?.label ??
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
            className={scannerButtonStyles.controlButton}
            disabled={previewLoading || branchContextBlocked || legacyBranchAttempt}
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
              className={scannerButtonStyles.controlButton}
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
              className={scannerButtonStyles.controlButton}
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
