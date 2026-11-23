"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QrScanner } from "@/components/scanner/QrScanner";
import { TextField } from "@/components/ui/FormField";
import { parseCertificateCode } from "@/lib/certificate-code";
import { RemcardApiError, remcardFetch, remcardFetchWithMeta } from "@/lib/api-client";
import { miniAppStoreScanLookup } from "@/lib/mini-app/api";
import type { MiniAppBootstrap, MiniAppPlatform } from "@/lib/mini-app/types";
import {
  buildOrderItems,
  categoryIssuerPayoutPoolPercent,
  categoryPoolPercent,
  computeOrderTotals,
  validateOrderAmounts,
  appliedClientDiscountPercent,
  commitDiscountDraftOnBlur,
  discountDraftInputValue,
  validateCategoryDiscountField,
  validateOrderDiscountDrafts,
  type CategoryAmountDraft,
  type CategoryDiscountDraft,
} from "@/lib/order-totals";
import type { OrderPreviewAllowed, OrderPreviewResponse } from "@/lib/order-types";
import {
  ATTEMPT_BODY_MISMATCH_MESSAGE,
  ATTEMPT_CONFLICT_MESSAGE,
  UNCERTAIN_ORDER_DETAIL,
  UNCERTAIN_ORDER_HEADING,
  formatAttemptItemsSummary,
  classifyStoreOrderNetworkFailure,
  classifyStoreOrderPostResponse,
  clearStoreOrderAttempt,
  createStoreOrderAttempt,
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
  storeOrderAttemptBodiesEqual,
  type OrderPostOutcome,
  type StoreOrderAttemptRecord,
} from "@/lib/store-order-attempt";
import { displayCategoryLabel } from "@/lib/category-display";
import {
  defaultRewardDraft,
  rewardDraftToTerms,
  type RewardConfirmationDraft,
} from "@/lib/reward-confirmation";
import { RewardConfirmationFields } from "@/components/scanner/RewardConfirmationFields";
import { useReceivingAppealScannerHandoff } from "@/components/scanner/useReceivingAppealScannerHandoff";
import styles from "./mini-app.module.css";

type Phase = "scan" | "purchase" | "success" | "recovery";

function amountDraftsFromAttempt(record: StoreOrderAttemptRecord): CategoryAmountDraft {
  return Object.fromEntries(record.body.items.map((item) => [item.category, String(item.amount)]));
}

function discountDraftsFromAttempt(record: StoreOrderAttemptRecord): CategoryDiscountDraft {
  const drafts: CategoryDiscountDraft = {};
  for (const item of record.body.items) {
    if (item.discountPercent !== undefined && Number.isFinite(item.discountPercent)) {
      drafts[item.category] = String(item.discountPercent);
    }
  }
  return drafts;
}

const BRANCH_ATTEMPT_MISMATCH_MESSAGE =
  "Филиал не совпадает с сохранённой попыткой. Откройте mini-app с тем же филиалом, что при оформлении.";

type Props = {
  platform: MiniAppPlatform;
  bootstrap: MiniAppBootstrap;
  branchId: string | null;
  appealId?: string | null;
  onDone: () => void;
  onClientsDeepLink?: (appealId: string) => void;
  /** Synthetic tests only: skip scan gate. */
  fixturePreview?: OrderPreviewAllowed;
  fixtureCertCode?: string;
};

const LOCKED_ATTEMPT_OTHER_CODE_MESSAGE =
  "Есть незавершённая покупка по другому коду. Сначала проверьте её результат или дождитесь поддержки.";

function formatRub(value: number) {
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

function weightedPoolSummary(
  categories: OrderPreviewAllowed["availableCategories"],
  amountDrafts: CategoryAmountDraft,
  discountDrafts: CategoryDiscountDraft,
): { clientPct: number; poolPct: number } | null {
  let sumAmount = 0;
  let weightedClient = 0;
  let weightedPool = 0;
  for (const cat of categories) {
    const raw = amountDrafts[cat.category]?.trim() ?? "";
    if (!raw) continue;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const pool = categoryIssuerPayoutPoolPercent(cat);
    const clientPct = appliedClientDiscountPercent(cat, discountDrafts);
    if (!Number.isFinite(clientPct)) continue;
    sumAmount += amount;
    weightedClient += amount * clientPct;
    weightedPool += amount * pool;
  }
  if (sumAmount <= 0) return null;
  return {
    clientPct: Math.round((weightedClient / sumAmount) * 100) / 100,
    poolPct: Math.round((weightedPool / sumAmount) * 100) / 100,
  };
}

export function MiniAppScanReceive({
  platform,
  bootstrap,
  branchId,
  appealId,
  onDone,
  onClientsDeepLink,
  fixturePreview,
  fixtureCertCode = "RC-FIXTURE",
}: Props) {
  const actorUserId = bootstrap.actorUserId;
  const receiving = useReceivingAppealScannerHandoff(appealId?.trim() || null);

  const [phase, setPhase] = useState<Phase>(fixturePreview ? "purchase" : "scan");
  const [manual, setManual] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [gateError, setGateError] = useState("");
  const [certCode, setCertCode] = useState(fixtureCertCode);
  const [preview, setPreview] = useState<OrderPreviewAllowed | null>(fixturePreview ?? null);
  const [amountDrafts, setAmountDrafts] = useState<CategoryAmountDraft>(() => {
    if (!fixturePreview) return {};
    return Object.fromEntries(fixturePreview.availableCategories.map((c) => [c.category, "10000"]));
  });
  const [discountDrafts, setDiscountDrafts] = useState<CategoryDiscountDraft>({});
  const [rewardDrafts, setRewardDrafts] = useState<Record<string, RewardConfirmationDraft>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [orderUncertain, setOrderUncertain] = useState(false);
  const [orderConflict, setOrderConflict] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const submitInFlight = useRef(false);
  const lastIdempotencyKey = useRef<string | null>(null);
  const [storedAttempt, setStoredAttempt] = useState<StoreOrderAttemptRecord | null>(null);
  const attemptRestoreDone = useRef(false);
  const recoveryPreviewGen = useRef(0);

  const syncStoredAttempt = useCallback(() => {
    setStoredAttempt(loadStoreOrderAttempt(actorUserId));
  }, [actorUserId]);

  const branchAttemptMismatch = useMemo(() => {
    if (!storedAttempt?.branchId?.trim() || !branchId?.trim()) return false;
    return storedAttempt.branchId.trim() !== branchId.trim();
  }, [storedAttempt?.branchId, branchId]);

  useEffect(() => {
    if (attemptRestoreDone.current) {
      return;
    }
    attemptRestoreDone.current = true;
    const attempt = loadStoreOrderAttempt(actorUserId);
    if (!attempt || attempt.status === "succeeded") {
      return;
    }
    setStoredAttempt(attempt);
    setOrderUncertain(isRestorableAttempt(attempt));
    setOrderConflict(isConflictAttempt(attempt));
    setCertCode(attempt.body.certificateCode);
    setAmountDrafts(amountDraftsFromAttempt(attempt));
    setDiscountDrafts(discountDraftsFromAttempt(attempt));
    if (isStoreOrderAttemptLocked(attempt)) {
      if (!fixturePreview) {
        setPhase("recovery");
        if (receiving.ordinaryAppealRequired) {
          void receiving.restoreOrdinaryAppealForStoredAttempt({
            userId: actorUserId,
            record: attempt,
            isStale: () => false,
          });
        }
        const gen = ++recoveryPreviewGen.current;
        const searchParams = attempt.branchId?.trim() ? { branchId: attempt.branchId.trim() } : undefined;
        void remcardFetch<OrderPreviewResponse>("/api/store/order/preview", {
          method: "POST",
          body: { certificateCode: attempt.body.certificateCode },
          searchParams,
        })
          .then((data) => {
            if (gen !== recoveryPreviewGen.current) return;
            if ("allowed" in data && data.allowed) {
              setPreview(data);
            }
          })
          .catch(() => undefined);
      }
    } else if (!fixturePreview) {
      setPhase("purchase");
    }
  }, [actorUserId, fixturePreview, receiving]);

  const purchaseDraftLocked = useMemo(
    () =>
      submitting ||
      confirmOpen ||
      orderUncertain ||
      orderConflict ||
      isStoreOrderAttemptLocked(storedAttempt),
    [submitting, confirmOpen, orderUncertain, orderConflict, storedAttempt],
  );

  const rescanBlocked = useMemo(
    () => submitting || isStoreOrderAttemptLocked(storedAttempt) || orderUncertain || orderConflict,
    [submitting, storedAttempt, orderUncertain, orderConflict],
  );

  const totals = useMemo(() => {
    if (!preview) return null;
    return computeOrderTotals(preview.availableCategories, amountDrafts, discountDrafts);
  }, [preview, amountDrafts, discountDrafts]);

  const poolSummary = useMemo(() => {
    if (!preview) return null;
    return weightedPoolSummary(preview.availableCategories, amountDrafts, discountDrafts);
  }, [preview, amountDrafts, discountDrafts]);

  const discountFieldErrors = useMemo(() => {
    if (!preview) return {} as Record<string, string>;
    const errors: Record<string, string> = {};
    for (const category of preview.availableCategories) {
      const result = validateCategoryDiscountField(category, amountDrafts, discountDrafts);
      if (!result.ok) {
        errors[category.category] = result.message;
      }
    }
    return errors;
  }, [preview, amountDrafts, discountDrafts]);

  const purchaseStepBlocked = useMemo(() => {
    if (!preview) return true;
    if (orderUncertain || orderConflict) return true;
    if (Object.keys(discountFieldErrors).length > 0) return true;
    const amounts = validateOrderAmounts(preview.availableCategories, amountDrafts);
    return !amounts.ok;
  }, [preview, amountDrafts, discountFieldErrors, orderUncertain, orderConflict]);

  const applyPostOutcome = useCallback((outcome: OrderPostOutcome) => {
    switch (outcome.kind) {
      case "success":
        markStoreOrderAttemptSucceeded(actorUserId, outcome.data.order.id);
        syncStoredAttempt();
        setSuccessOrderId(outcome.data.order.id);
        setConfirmOpen(false);
        setPhase("success");
        clearStoreOrderAttempt();
        setStoredAttempt(null);
        setOrderUncertain(false);
        setOrderConflict(false);
        break;
      case "conflict":
        markStoreOrderAttemptConflict(actorUserId);
        syncStoredAttempt();
        setOrderConflict(true);
        setOrderUncertain(false);
        setSubmitError(ATTEMPT_CONFLICT_MESSAGE);
        setConfirmOpen(false);
        break;
      case "uncertain":
        markStoreOrderAttemptUnknown(actorUserId);
        syncStoredAttempt();
        setOrderUncertain(true);
        setOrderConflict(false);
        setSubmitError(UNCERTAIN_ORDER_DETAIL);
        setConfirmOpen(false);
        break;
      case "unknown_persist":
        markStoreOrderAttemptUnknown(actorUserId);
        syncStoredAttempt();
        setOrderUncertain(true);
        setOrderConflict(false);
        setSubmitError(outcome.message ?? UNCERTAIN_ORDER_DETAIL);
        setConfirmOpen(false);
        break;
      case "auth_required":
        setSubmitError(outcome.message);
        setConfirmOpen(false);
        break;
      case "validation_failed":
        releaseStoreOrderAttemptForEdit();
        setOrderUncertain(false);
        setOrderConflict(false);
        setSubmitError(outcome.message);
        setConfirmOpen(false);
        break;
      default:
        break;
    }
  }, [actorUserId, syncStoredAttempt]);

  const postStoreOrder = useCallback(
    async (attemptRecord: StoreOrderAttemptRecord, wasRetry: boolean) => {
      const operationBranchId = attemptRecord.branchId?.trim() || branchId?.trim() || undefined;
      submitInFlight.current = true;
      setSubmitting(true);
      setSubmitError("");
      markStoreOrderAttemptInFlight(actorUserId);
      syncStoredAttempt();
      try {
        const { payload } = await remcardFetchWithMeta<unknown>("/api/store/order", {
          method: "POST",
          body: attemptRecord.body,
          idempotencyKey: attemptRecord.idempotencyKey,
          searchParams: operationBranchId ? { branchId: operationBranchId } : undefined,
        });
        const outcome = classifyStoreOrderPostResponse({ status: 201, payload, wasRetry });
        applyPostOutcome(outcome);
        if (outcome.kind === "success") {
          lastIdempotencyKey.current = attemptRecord.idempotencyKey;
          receiving.beginOrderLinkAfterSuccess(outcome.data.order.id, attemptRecord.idempotencyKey);
        }
      } catch (caught) {
        if (caught instanceof RemcardApiError) {
          const payload = caught.body ?? (caught.message ? { error: caught.message } : null);
          applyPostOutcome(
            classifyStoreOrderPostResponse({
              status: caught.status,
              payload,
              wasRetry,
            }),
          );
        } else {
          applyPostOutcome(classifyStoreOrderNetworkFailure(wasRetry));
        }
      } finally {
        submitInFlight.current = false;
        setSubmitting(false);
        syncStoredAttempt();
      }
    },
    [actorUserId, applyPostOutcome, branchId, receiving, syncStoredAttempt],
  );

  const checkStoredAttempt = useCallback(async () => {
    if (submitInFlight.current || submitting || orderConflict || branchAttemptMismatch) return;
    const prepared = prepareStoreOrderRetry(actorUserId);
    if (!prepared.ok) {
      setSubmitError(
        prepared.reason === "conflict" ? ATTEMPT_CONFLICT_MESSAGE : UNCERTAIN_ORDER_DETAIL,
      );
      return;
    }
    await postStoreOrder(prepared.record, true);
  }, [actorUserId, branchAttemptMismatch, orderConflict, postStoreOrder, submitting]);

  const beginPurchase = useCallback(
    async (raw: string) => {
      const parsedEarly = parseCertificateCode(raw);
      const pending = loadStoreOrderAttempt(actorUserId);
      if (pending && isStoreOrderAttemptLocked(pending)) {
        if (parsedEarly.ok && pending.body.certificateCode !== parsedEarly.code) {
          setGateError(LOCKED_ATTEMPT_OTHER_CODE_MESSAGE);
        } else {
          setGateError(UNCERTAIN_ORDER_DETAIL);
        }
        setPhase("recovery");
        return;
      }
      const parsed = parsedEarly;
      if (!parsed.ok) {
        setGateError(parsed.error);
        return;
      }
      setLoading(true);
      setGateError("");
      try {
        const gate = await miniAppStoreScanLookup(platform, parsed.code, branchId);
        if (gate.state !== "valid") {
          setGateError(gate.message || "Сертификат недоступен.");
          return;
        }
        if (receiving.ordinaryAppealRequired) {
          const appealReady = await receiving.ensureOrdinaryAppealContext({
            promoCode: parsed.code,
            branchId: branchId ?? undefined,
            previewRequestId: 1,
            isStale: () => false,
          });
          if (!appealReady.ok) {
            setGateError(appealReady.message);
            return;
          }
        }
        const data = await remcardFetch<OrderPreviewResponse>("/api/store/order/preview", {
          method: "POST",
          body: { certificateCode: parsed.code },
          searchParams: branchId ? { branchId } : undefined,
        });
        if (!("allowed" in data) || !data.allowed) {
          setGateError("message" in data ? data.message : "Покупка по этому документу недоступна.");
          return;
        }
        const mismatch = receiving.assertPreviewAllowed(data);
        if (mismatch) {
          setGateError(mismatch);
          return;
        }
        setCertCode(parsed.code);
        setPreview(data);
        const drafts: CategoryAmountDraft = {};
        const discounts: CategoryDiscountDraft = {};
        const rewards: Record<string, RewardConfirmationDraft> = {};
        for (const cat of data.availableCategories) {
          drafts[cat.category] = "";
          rewards[cat.category] = defaultRewardDraft;
        }
        setAmountDrafts(drafts);
        setDiscountDrafts(discounts);
        setRewardDrafts(rewards);
        setPhase("purchase");
        syncStoredAttempt();
      } catch (e) {
        setGateError(e instanceof RemcardApiError ? e.message : "Не удалось открыть приём документа.");
      } finally {
        setLoading(false);
      }
    },
    [platform, branchId, receiving, actorUserId, syncStoredAttempt],
  );

  const openConfirm = useCallback(() => {
    if (!preview) return;
    const validation = validateOrderAmounts(preview.availableCategories, amountDrafts);
    if (!validation.ok) {
      setSubmitError(validation.message);
      return;
    }
    const discountValidation = validateOrderDiscountDrafts(
      preview.availableCategories,
      amountDrafts,
      discountDrafts,
    );
    if (!discountValidation.ok) {
      setSubmitError(discountValidation.message);
      return;
    }
    if (!preview.partner.isSelfScan) {
      try {
        buildOrderItems(preview.availableCategories, amountDrafts, discountDrafts).forEach((item) => {
          rewardDraftToTerms(rewardDrafts[item.category] ?? defaultRewardDraft);
        });
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Проверьте сроки подтверждения");
        return;
      }
    }
    setSubmitError("");
    setConfirmOpen(true);
  }, [preview, amountDrafts, discountDrafts, rewardDrafts]);

  const submitOrder = useCallback(async () => {
    if (!preview || submitInFlight.current || submitting) return;
    const amounts = validateOrderAmounts(preview.availableCategories, amountDrafts);
    if (!amounts.ok) {
      setSubmitError(amounts.message);
      setConfirmOpen(false);
      return;
    }
    const discountValidation = validateOrderDiscountDrafts(
      preview.availableCategories,
      amountDrafts,
      discountDrafts,
    );
    if (!discountValidation.ok) {
      setSubmitError(discountValidation.message);
      setConfirmOpen(false);
      return;
    }
    const items = buildOrderItems(preview.availableCategories, amountDrafts, discountDrafts).map((item) =>
      preview.partner.isSelfScan
        ? item
        : {
            ...item,
            rewardConfirmation: rewardDraftToTerms(rewardDrafts[item.category] ?? defaultRewardDraft),
          },
    );
    const body = { certificateCode: certCode, items };
    const pending = loadStoreOrderAttempt(actorUserId);
    const wasRetry = Boolean(pending && isStoreOrderAttemptLocked(pending) && isRestorableAttempt(pending));
    let attemptRecord: StoreOrderAttemptRecord;
    if (wasRetry) {
      const prepared = prepareStoreOrderRetry(actorUserId);
      if (!prepared.ok) {
        setSubmitError(
          prepared.reason === "conflict" ? ATTEMPT_CONFLICT_MESSAGE : UNCERTAIN_ORDER_DETAIL,
        );
        return;
      }
      if (!storeOrderAttemptBodiesEqual(prepared.record.body, body)) {
        setSubmitError(ATTEMPT_BODY_MISMATCH_MESSAGE);
        return;
      }
      attemptRecord = prepared.record;
    } else {
      const created = createStoreOrderAttempt({
        userId: actorUserId,
        body,
        branchId: branchId ?? undefined,
      });
      if (!created.ok) {
        const locked = isStoreOrderAttemptLocked(loadStoreOrderAttempt(actorUserId));
        setSubmitError(
          created.reason === "body_mismatch"
            ? ATTEMPT_BODY_MISMATCH_MESSAGE
            : created.reason === "blocked"
              ? locked && orderUncertain
                ? UNCERTAIN_ORDER_DETAIL
                : ATTEMPT_CONFLICT_MESSAGE
              : "Не удалось сохранить попытку оформления",
        );
        return;
      }
      attemptRecord = created.record;
      if (!receiving.persistOrdinaryAppealBinding(actorUserId, created.record.idempotencyKey)) {
        // binding optional when CRM read-only
      }
    }
    await postStoreOrder(attemptRecord, wasRetry);
  }, [
    preview,
    submitting,
    amountDrafts,
    discountDrafts,
    rewardDrafts,
    actorUserId,
    certCode,
    branchId,
    receiving,
    orderUncertain,
    postStoreOrder,
  ]);

  if (phase === "recovery" && storedAttempt) {
    return (
      <section className={styles.scanPanel} data-testid="mini-scan-recovery">
        <p className={styles.scanLead}>Сохранённая попытка покупки</p>
        {storedAttempt.branchId ? (
          <p className={styles.scanNotice}>Филиал (зафиксирован): {storedAttempt.branchId}</p>
        ) : null}
        <p className={styles.scanNotice}>Документ: {storedAttempt.body.certificateCode}</p>
        <p className={styles.scanNotice}>{formatAttemptItemsSummary(storedAttempt.body)}</p>
        {branchAttemptMismatch ? (
          <p className={styles.scanBad} role="alert" data-testid="mini-branch-mismatch">
            {BRANCH_ATTEMPT_MISMATCH_MESSAGE}
          </p>
        ) : null}
        {orderConflict ? (
          <p className={styles.scanBad} role="alert" data-testid="mini-order-conflict">
            {ATTEMPT_CONFLICT_MESSAGE}
          </p>
        ) : (
          <>
            <p className={styles.scanLead}>{UNCERTAIN_ORDER_HEADING}</p>
            <p className={styles.scanNotice} data-testid="mini-order-uncertain">
              {UNCERTAIN_ORDER_DETAIL}
            </p>
          </>
        )}
        {submitError ? (
          <p className={styles.scanBad} role="alert">
            {submitError}
          </p>
        ) : null}
        {!orderConflict && !branchAttemptMismatch ? (
          <button
            type="button"
            className={styles.primaryBtn}
            data-testid="mini-check-order-result"
            disabled={submitting}
            onClick={() => void checkStoredAttempt()}
          >
            {submitting ? "Проверка…" : "Проверить результат"}
          </button>
        ) : null}
      </section>
    );
  }

  if (phase === "success") {
    const appealTarget = receiving.appealId;
    return (
      <section className={styles.scanPanel} data-testid="mini-scan-success">
        <p className={styles.scanOk}>Покупка оформлена.</p>
        {successOrderId ? <p className={styles.scanNotice}>Заказ {successOrderId}</p> : null}
        {appealTarget && receiving.linkPhase === "linked" ? (
          <p className={styles.scanOk}>Заказ привязан к обращению в CRM.</p>
        ) : null}
        {appealTarget && receiving.linkPhase === "failed" ? (
          <p className={styles.scanBad} role="alert">
            {receiving.linkError || "Не удалось привязать заказ. Повторите привязку в «Клиенты»."}
          </p>
        ) : null}
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => {
            if (appealTarget && onClientsDeepLink) onClientsDeepLink(appealTarget);
            else onDone();
          }}
        >
          {appealTarget ? "К обращению в «Клиенты»" : "Готово"}
        </button>
        {appealTarget && receiving.linkPhase === "failed" ? (
          <button type="button" className={styles.secondaryBtn} onClick={() => receiving.retryOrderLinkOnly()}>
            Повторить только привязку заказа
          </button>
        ) : null}
      </section>
    );
  }

  if (phase === "purchase" && preview) {
    return (
      <section className={styles.scanPanel} data-testid="mini-scan-purchase">
        <p className={styles.scanLead}>
          Код: {certCode} · {preview.certificate.userAlias || preview.partner.storeName}
        </p>
        {receiving.crmReadOnlyNotice ? (
          <p className={styles.scanNotice}>{receiving.crmReadOnlyNotice}</p>
        ) : null}
        <div style={{ display: "grid", gap: "12px" }}>
          {preview.availableCategories.map((category) => (
            <div key={category.category}>
              <strong>{displayCategoryLabel(category.category, category.categoryLabel)}</strong>
              <p className={styles.scanNotice}>
                Максимум по категории: {categoryPoolPercent(category)}%
              </p>
              <TextField
                label="Сумма до скидки, ₽"
                type="number"
                min={0}
                inputMode="numeric"
                value={amountDrafts[category.category] ?? ""}
                disabled={purchaseDraftLocked}
                onChange={(e) =>
                  setAmountDrafts((prev) => ({ ...prev, [category.category]: e.target.value }))
                }
              />
              <TextField
                id={`mini-discount-${category.category}`}
                label="Скидка клиенту, %"
                type="number"
                min={0}
                inputMode="decimal"
                data-testid={`mini-discount-input-${category.category}`}
                value={discountDraftInputValue(category, discountDrafts)}
                disabled={purchaseDraftLocked}
                onChange={(e) =>
                  setDiscountDrafts((prev) => ({ ...prev, [category.category]: e.target.value }))
                }
                onBlur={(e) => {
                  const commit = commitDiscountDraftOnBlur(category.category, e.target.value);
                  setDiscountDrafts((prev) => {
                    const next = { ...prev };
                    if (commit.action === "unset") {
                      delete next[category.category];
                    } else {
                      next[category.category] = commit.value;
                    }
                    return next;
                  });
                }}
                aria-invalid={Boolean(discountFieldErrors[category.category])}
              />
              {discountFieldErrors[category.category] ? (
                <p className={styles.scanBad} role="alert" data-testid={`mini-discount-error-${category.category}`}>
                  {discountFieldErrors[category.category]}
                </p>
              ) : null}
              {!preview.partner.isSelfScan ? (
                <RewardConfirmationFields
                  category={category.category}
                  draft={rewardDrafts[category.category] ?? defaultRewardDraft}
                  disabled={purchaseDraftLocked}
                  onChange={(value) =>
                    setRewardDrafts((prev) => ({ ...prev, [category.category]: value }))
                  }
                  onApplyAll={() => undefined}
                />
              ) : null}
            </div>
          ))}
        </div>
        {totals ? (
          <div className={styles.walletBody} style={{ marginTop: 12 }}>
            <p className={styles.walletLabel}>Сумма покупки: {formatRub(totals.totalAmount)}</p>
            <p className={styles.walletLabel}>
              Скидка клиенту: −{formatRub(totals.totalDiscount)}
              {poolSummary ? ` (${poolSummary.clientPct}% от линий)` : ""}
            </p>
            <p className={styles.walletLabel}>К оплате: {formatRub(totals.payableAmount)}</p>
            {!preview.partner.isSelfScan && totals.totalIssuerBonus > 0 ? (
              <p className={styles.walletLabel}>Вознаграждение PROF: {formatRub(totals.totalIssuerBonus)}</p>
            ) : null}
            {poolSummary ? (
              <p className={styles.scanNotice}>
                Пул (взвеш.): {poolSummary.poolPct}% · скидка {poolSummary.clientPct}%
              </p>
            ) : null}
          </div>
        ) : null}
        {orderUncertain ? (
          <p className={styles.scanBad} role="alert" data-testid="mini-order-uncertain">
            {UNCERTAIN_ORDER_DETAIL}
          </p>
        ) : null}
        {orderUncertain && !branchAttemptMismatch ? (
          <button
            type="button"
            className={styles.secondaryBtn}
            data-testid="mini-check-order-result"
            disabled={submitting}
            onClick={() => void checkStoredAttempt()}
          >
            Проверить результат
          </button>
        ) : null}
        {orderConflict ? (
          <p className={styles.scanBad} role="alert" data-testid="mini-order-conflict">
            {ATTEMPT_CONFLICT_MESSAGE}
          </p>
        ) : null}
        {submitError ? (
          <p className={styles.scanBad} role="alert">
            {submitError}
          </p>
        ) : null}
        {confirmOpen ? (
          <div className={styles.branchSheet}>
            <p>Подтвердите оформление покупки. Списание и начисления выполнит сервер.</p>
            <button type="button" className={styles.primaryBtn} disabled={submitting} onClick={() => void submitOrder()}>
              {submitting ? "Оформление…" : "Подтвердить покупку"}
            </button>
            <button type="button" className={styles.secondaryBtn} disabled={submitting} onClick={() => setConfirmOpen(false)}>
              Назад
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={submitting || purchaseStepBlocked}
            data-testid="mini-scan-confirm-step"
            onClick={openConfirm}
          >
            К подтверждению
          </button>
        )}
        <button
          type="button"
          className={styles.secondaryBtn}
          data-testid="mini-scan-another"
          disabled={rescanBlocked}
          title={rescanBlocked ? "Завершите или проверьте текущую покупку" : undefined}
          onClick={() => {
            if (rescanBlocked) return;
            const pending = loadStoreOrderAttempt(actorUserId);
            if (pending && !window.confirm(NEW_PURCHASE_WARNING)) return;
            if (pending && isStoreOrderAttemptLocked(pending)) return;
            clearStoreOrderAttempt();
            setStoredAttempt(null);
            setPreview(null);
            setOrderUncertain(false);
            setOrderConflict(false);
            setConfirmOpen(false);
            setPhase("scan");
          }}
        >
          Сканировать другой код
        </button>
      </section>
    );
  }

  if (storedAttempt && isStoreOrderAttemptLocked(storedAttempt)) {
    return (
      <section className={styles.scanPanel} data-testid="mini-scan-recovery">
        <p className={styles.scanNotice}>{UNCERTAIN_ORDER_DETAIL}</p>
      </section>
    );
  }

  return (
    <section className={styles.scanPanel} data-testid="mini-scan-gate">
      <p className={styles.scanLead}>
        Сначала проверка по пилотным правилам, затем приём документа и оформление покупки.
      </p>
      <QrScanner onCode={(raw) => void beginPurchase(raw)} onError={(message) => setCameraError(message)} />
      {cameraError ? (
        <p className={styles.scanNotice} role="alert">
          {cameraError}
        </p>
      ) : null}
      <form
        className={styles.manualForm}
        onSubmit={(e) => {
          e.preventDefault();
          void beginPurchase(manual);
        }}
      >
        <TextField label="Код вручную" value={manual} onChange={(e) => setManual(e.target.value)} autoComplete="off" />
        <button type="submit" className={styles.primaryBtn} disabled={loading || !manual.trim()}>
          {loading ? "Проверка…" : "Найти документ"}
        </button>
      </form>
      {gateError ? (
        <p className={styles.scanBad} role="alert" data-testid="scan-gate-error">
          {gateError}
        </p>
      ) : null}
    </section>
  );
}