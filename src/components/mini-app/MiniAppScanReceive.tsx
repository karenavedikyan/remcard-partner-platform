"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { QrScanner } from "@/components/scanner/QrScanner";
import { TextField } from "@/components/ui/FormField";
import { parseCertificateCode } from "@/lib/certificate-code";
import { RemcardApiError, remcardFetch, remcardFetchWithMeta } from "@/lib/api-client";
import { miniAppStoreScanLookup } from "@/lib/mini-app/api";
import type { MiniAppBootstrap, MiniAppPlatform } from "@/lib/mini-app/types";
import {
  buildOrderItems,
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
  ATTEMPT_CONFLICT_MESSAGE,
  classifyStoreOrderNetworkFailure,
  classifyStoreOrderPostResponse,
  clearStoreOrderAttempt,
  createStoreOrderAttempt,
  markStoreOrderAttemptInFlight,
  markStoreOrderAttemptSucceeded,
  markStoreOrderAttemptUnknown,
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

type Phase = "scan" | "purchase" | "success";

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
    const pool = categoryPoolPercent(cat);
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const submitInFlight = useRef(false);
  const lastIdempotencyKey = useRef<string | null>(null);

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
    if (Object.keys(discountFieldErrors).length > 0) return true;
    const amounts = validateOrderAmounts(preview.availableCategories, amountDrafts);
    return !amounts.ok;
  }, [preview, amountDrafts, discountFieldErrors]);

  const beginPurchase = useCallback(
    async (raw: string) => {
      const parsed = parseCertificateCode(raw);
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
      } catch (e) {
        setGateError(e instanceof RemcardApiError ? e.message : "Не удалось открыть приём документа.");
      } finally {
        setLoading(false);
      }
    },
    [platform, branchId, receiving],
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
    const items = buildOrderItems(preview.availableCategories, amountDrafts, discountDrafts).map((item) =>
      preview.partner.isSelfScan
        ? item
        : {
            ...item,
            rewardConfirmation: rewardDraftToTerms(rewardDrafts[item.category] ?? defaultRewardDraft),
          },
    );
    const created = createStoreOrderAttempt({
      userId: actorUserId,
      body: { certificateCode: certCode, items },
      branchId: branchId ?? undefined,
    });
    if (!created.ok) {
      setSubmitError(
        created.reason === "body_mismatch" || created.reason === "blocked"
          ? ATTEMPT_CONFLICT_MESSAGE
          : "Не удалось сохранить попытку оформления",
      );
      return;
    }
    submitInFlight.current = true;
    setSubmitting(true);
    setSubmitError("");
    markStoreOrderAttemptInFlight(actorUserId);
    try {
      const { payload } = await remcardFetchWithMeta<unknown>("/api/store/order", {
        method: "POST",
        body: created.record.body,
        idempotencyKey: created.record.idempotencyKey,
        searchParams: branchId ? { branchId } : undefined,
      });
      const outcome = classifyStoreOrderPostResponse({ status: 201, payload, wasRetry: false });
      if (outcome.kind === "success") {
        markStoreOrderAttemptSucceeded(actorUserId, outcome.data.order.id);
        setSuccessOrderId(outcome.data.order.id);
        setConfirmOpen(false);
        setPhase("success");
        lastIdempotencyKey.current = created.record.idempotencyKey;
        receiving.beginOrderLinkAfterSuccess(outcome.data.order.id, created.record.idempotencyKey);
      } else if (outcome.kind === "validation_failed" || outcome.kind === "auth_required") {
        setSubmitError(outcome.message);
        markStoreOrderAttemptUnknown(actorUserId);
      } else if (outcome.kind === "unknown_persist") {
        setSubmitError(outcome.message ?? "Статус заказа неизвестен. Проверьте историю в кабинете.");
        markStoreOrderAttemptUnknown(actorUserId);
      } else if (outcome.kind === "conflict") {
        setSubmitError(ATTEMPT_CONFLICT_MESSAGE);
        markStoreOrderAttemptUnknown(actorUserId);
      } else {
        setSubmitError("Не удалось завершить оформление. Проверьте сеть.");
        markStoreOrderAttemptUnknown(actorUserId);
      }
    } catch (caught) {
      if (caught instanceof RemcardApiError) {
        setSubmitError(caught.message);
      } else {
        const net = classifyStoreOrderNetworkFailure(false);
        setSubmitError(
          net.kind === "validation_failed" || net.kind === "auth_required" || net.kind === "unknown_persist"
            ? (net.message ?? "Сетевая ошибка")
            : "Сетевая ошибка",
        );
      }
      markStoreOrderAttemptUnknown(actorUserId);
    } finally {
      submitInFlight.current = false;
      setSubmitting(false);
    }
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
  ]);

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
                disabled={submitting}
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
                disabled={submitting}
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
                  disabled={submitting}
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
          onClick={() => {
            setPhase("scan");
            setPreview(null);
            clearStoreOrderAttempt();
          }}
        >
          Сканировать другой код
        </button>
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