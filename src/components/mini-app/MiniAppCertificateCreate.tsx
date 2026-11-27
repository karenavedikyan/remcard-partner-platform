"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import type {
  AvailablePartner,
  CreateCertificateBody,
  StoreCertificate,
} from "@/lib/certificate-types";
import {
  buildCreateCertificatePayload,
  categoryFieldKey,
  formatDiscountLimitError,
  isCategoryIssuable,
  previewIssuerPercent,
  resolvePoolPercent,
} from "@/lib/certificate-percent";
import {
  beginMiniCertificateCreateAttempt,
  classifyMiniCertificateCreateFailure,
  clearMiniCertificateCreateAttempt,
  isMiniCertificateCreateAttemptLocked,
  loadMiniCertificateCreateAttempt,
  markMiniCertificateCreateAttemptInFlight,
  markMiniCertificateCreateAttemptUnknown,
  MINI_CERT_ATTEMPT_BODY_MISMATCH,
  MINI_CERT_ATTEMPT_STORAGE_FAILED,
  MINI_CERT_ATTEMPT_USE_RETRY,
  prepareMiniCertificateCreateRetry,
  type MiniCertificateCreateAttemptRecord,
} from "@/lib/mini-app/mini-certificate-create-attempt";
import { displayCategoryLabel } from "@/lib/category-display";
import { miniAppCreateCertificate, miniAppFetchCertificateOptions } from "@/lib/mini-app/api";
import type { MiniAppEmbeddedContext } from "@/lib/mini-app/embedded-context";
import type { MiniAppBootstrap, MiniAppPlatform } from "@/lib/mini-app/types";
import {
  clearMiniCertificateCreateDraft,
  loadMiniCertificateCreateDraft,
  reconcileMiniCertificateDraftPartnerKeys,
  saveMiniCertificateCreateDraft,
  serializeMiniCertificateCreateDraftScope,
  type MiniCertificateCreateDraftScope,
} from "@/lib/mini-app/mini-certificate-create-draft";
import {
  branchLabelForCreate,
  filterSelectablePartners,
  miniCertificateCategoryKeySet,
  miniCertificatePartnerKeySet,
  miniCertificateRequireTenthStep,
  miniCertificateUsesWizard,
} from "@/lib/mini-app/mini-certificate-wizard";
import {
  defaultCategoryDiscountDraft,
  partnerMatchesSearch,
  partnerSelectionKey,
} from "@/lib/specialist-certificate-create-ui";
import { MiniAppSubpage } from "./MiniAppSubpage";
import styles from "./mini-app.module.css";

export type MiniAppFixtureCreateSeed = {
  programLabel: string;
  clientLabel: string;
};

type Props = {
  platform: MiniAppPlatform;
  bootstrap: MiniAppBootstrap;
  branchId: string | null;
  onCreated: (cert: StoreCertificate) => void;
  onBack: () => void;
  fixtureCreateSeed?: MiniAppFixtureCreateSeed;
  fixtureSubmitCertificate?: StoreCertificate;
  embeddedContext?: MiniAppEmbeddedContext;
};

export function MiniAppCertificateCreate({
  platform,
  bootstrap,
  branchId,
  onCreated,
  onBack,
  fixtureCreateSeed,
  fixtureSubmitCertificate,
  embeddedContext = "default",
}: Props) {
  const [loadState, setLoadState] = useState<"loading" | "ready" | "blocked">("loading");
  const [blockMessage, setBlockMessage] = useState("");
  const [partners, setPartners] = useState<AvailablePartner[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; label: string }>>([]);
  const [needsClient, setNeedsClient] = useState(
    bootstrap.role === "agent" || bootstrap.role === "specialist",
  );
  const [needsBranch, setNeedsBranch] = useState(
    (bootstrap.role === "store" || bootstrap.role === "company") && bootstrap.branches.length > 0,
  );

  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [partnerSearchQuery, setPartnerSearchQuery] = useState("");
  const [selectedCategoryKeys, setSelectedCategoryKeys] = useState<Record<string, boolean>>({});
  const [discountDrafts, setDiscountDrafts] = useState<Record<string, string>>({});
  const [clientId, setClientId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uncertainSubmit, setUncertainSubmit] = useState(false);
  const [openAttempt, setOpenAttempt] = useState<MiniCertificateCreateAttemptRecord | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [stalePartnersNotice, setStalePartnersNotice] = useState(false);

  const submitInFlightRef = useRef(false);

  const draftScope = useMemo<MiniCertificateCreateDraftScope>(
    () => ({
      actorUserId: bootstrap.actorUserId,
      platform,
      branchId,
    }),
    [bootstrap.actorUserId, branchId, platform],
  );
  const draftScopeKey = useMemo(
    () => serializeMiniCertificateCreateDraftScope(draftScope),
    [draftScope],
  );

  const attemptLocked = useMemo(
    () => isMiniCertificateCreateAttemptLocked(openAttempt),
    [openAttempt],
  );

  const refreshOpenAttempt = useCallback(() => {
    const loaded = loadMiniCertificateCreateAttempt(draftScope);
    setOpenAttempt(loaded);
    setUncertainSubmit(loaded?.status === "unknown");
  }, [draftScope]);

  const selectablePartners = useMemo(() => filterSelectablePartners(partners), [partners]);
  const hasWizard = useMemo(
    () => miniCertificateUsesWizard(bootstrap.role, selectablePartners),
    [bootstrap.role, selectablePartners],
  );
  const discountPage = hasWizard && wizardStep === 2;

  const selectedPartners = useMemo(
    () => selectablePartners.filter((p) => selectedKeys.includes(partnerSelectionKey(p))),
    [selectablePartners, selectedKeys],
  );

  const filteredPartners = useMemo(
    () => selectablePartners.filter((p) => partnerMatchesSearch(p, partnerSearchQuery)),
    [partnerSearchQuery, selectablePartners],
  );

  const issuerLimitsControlledByRecipient = useMemo(
    () => selectedPartners.length > 0 && selectedPartners.every((p) => p.recipientPolicy != null),
    [selectedPartners],
  );

  const branchLine = branchLabelForCreate(bootstrap, branchId);

  const ensurePartnerCategoryDefaults = useCallback((partner: AvailablePartner) => {
    for (const cat of partner.categories) {
      const fieldKey = categoryFieldKey(partner.storeUserId, cat.category);
      const pool = resolvePoolPercent({
        category: cat.category,
        categoryLabel: cat.categoryLabel,
        poolPercent: cat.poolPercent,
        isSelfScan: partner.isSelfScan,
      });
      if (!isCategoryIssuable(cat, partner.isSelfScan)) {
        setSelectedCategoryKeys((prev) =>
          prev[fieldKey] === false ? prev : { ...prev, [fieldKey]: false },
        );
        continue;
      }
      setSelectedCategoryKeys((prev) =>
        prev[fieldKey] === undefined ? { ...prev, [fieldKey]: true } : prev,
      );
      setDiscountDrafts((prev) =>
        prev[fieldKey]?.trim() ? prev : { ...prev, [fieldKey]: defaultCategoryDiscountDraft(pool) },
      );
    }
  }, []);

  const load = useCallback(async () => {
    setLoadState("loading");
    setBlockMessage("");
    setDraftHydrated(false);
    if (fixtureCreateSeed) {
      const partnerStub: AvailablePartner = {
        storeUserId: "fixture-store",
        storeName: "RemCard Showcase",
        partnershipId: "fixture-ps",
        isSelfScan: false,
        city: null,
        programReady: true,
        categories: [
          {
            category: "doors",
            categoryLabel: fixtureCreateSeed.programLabel,
            discountPercent: 10,
            issuerPercent: 3,
            poolPercent: 10,
            issuable: true,
          },
        ],
      };
      setPartners([partnerStub]);
      const key = partnerSelectionKey(partnerStub);
      setSelectedKeys([key]);
      ensurePartnerCategoryDefaults(partnerStub);
      setClients([{ id: "fixture-client", label: fixtureCreateSeed.clientLabel }]);
      setClientId("fixture-client");
      setLoadState("ready");
      setDraftHydrated(true);
      return;
    }
    try {
      const partnersPayload = await miniAppFetchCertificateOptions(platform, {
        branchId,
        embeddedContext,
      });
      if (partnersPayload.miniOptionsBlocked) {
        setBlockMessage(partnersPayload.miniOptionsBlocked);
        setLoadState("blocked");
        return;
      }
      setNeedsClient(partnersPayload.needsClient);
      setNeedsBranch(partnersPayload.needsBranch);
      if (partnersPayload.certificateRecommendationIssuerReady === false) {
        const missing = partnersPayload.certificateRecommendationIssuerMissing ?? [];
        setBlockMessage(
          missing.length
            ? missing.map((m) => m.message).join(" ")
            : "Профиль выпускающего не готов. Завершите настройку в полном кабинете.",
        );
        setLoadState("blocked");
        return;
      }
      const rows = [...(partnersPayload.partners ?? [])];
      if (partnersPayload.selfScanPartner) rows.push(partnersPayload.selfScanPartner);
      setPartners(rows);
      const clientRowsFromApi = (partnersPayload.miniClients ?? []).map((c) => ({
        id: c.id,
        label: c.displayName?.trim() || "Клиент",
      }));

      if (partnersPayload.needsClient && !clientRowsFromApi.length) {
        setBlockMessage("Нет клиентов для выпуска. Добавьте клиента в кабинете PROF.");
        setLoadState("blocked");
        return;
      }
      setClients(clientRowsFromApi);
      setClientId((current) => clientRowsFromApi.some((row) => row.id === current)
        ? current
        : partnersPayload.needsClient ? clientRowsFromApi[0]?.id ?? "" : "");

      if (partnersPayload.needsBranch && !branchId) {
        setBlockMessage("Выберите филиал выпуска на главном экране.");
        setLoadState("blocked");
        return;
      }

      const selectable = filterSelectablePartners(rows);
      if (!selectable.length) {
        setBlockMessage("Нет доступных программ для выпуска. Добавьте партнёрство в полном кабинете.");
        setLoadState("blocked");
        return;
      }

      const saved = loadMiniCertificateCreateDraft(draftScope);
      if (saved) {
        const reconciled = reconcileMiniCertificateDraftPartnerKeys({
          selectedKeys: saved.selectedKeys,
          discountDrafts: saved.discountDrafts,
          selectedCategoryKeys: saved.selectedCategoryKeys,
          partnerKeys: miniCertificatePartnerKeySet(rows),
          categoryKeys: miniCertificateCategoryKeySet(rows),
        });
        setSelectedKeys(reconciled.selectedKeys);
        setDiscountDrafts(reconciled.discountDrafts);
        setSelectedCategoryKeys(reconciled.selectedCategoryKeys);
        setPartnerSearchQuery(saved.partnerSearchQuery);
        setWizardStep(saved.wizardStep === 2 && miniCertificateUsesWizard(bootstrap.role, selectable) ? 2 : 1);
        if (saved.clientId && clientRowsContain(partnersPayload.miniClients, saved.clientId)) {
          setClientId(saved.clientId);
        }
        setStalePartnersNotice(reconciled.stalePartnerKeys.length > 0);
      } else if (selectable.length === 1 && !miniCertificateUsesWizard(bootstrap.role, selectable)) {
        const only = selectable[0];
        const key = partnerSelectionKey(only);
        setSelectedKeys([key]);
        ensurePartnerCategoryDefaults(only);
      }

      setLoadState("ready");
      setDraftHydrated(true);
    } catch (err) {
      setBlockMessage(
        err instanceof RemcardApiError
          ? err.message
          : "Не удалось загрузить данные для выпуска. Проверьте подключение к PROF.",
      );
      setLoadState("blocked");
    }
  }, [
    bootstrap.role,
    branchId,
    draftScope,
    embeddedContext,
    ensurePartnerCategoryDefaults,
    fixtureCreateSeed,
    platform,
  ]);

  function clientRowsContain(
    rows: Array<{ id: string }> | undefined,
    id: string,
  ): boolean {
    return Boolean(rows?.some((c) => c.id === id));
  }

  useEffect(() => {
    void load();
    refreshOpenAttempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when branch or actor changes
  }, [draftScopeKey]);

  useEffect(() => {
    if (loadState !== "ready" || !draftHydrated || fixtureCreateSeed) return;
    saveMiniCertificateCreateDraft(draftScope, {
      wizardStep,
      selectedKeys,
      discountDrafts,
      selectedCategoryKeys,
      partnerSearchQuery,
      clientId,
    });
  }, [
    clientId,
    discountDrafts,
    draftHydrated,
    draftScope,
    fixtureCreateSeed,
    loadState,
    partnerSearchQuery,
    selectedCategoryKeys,
    selectedKeys,
    wizardStep,
  ]);

  function togglePartner(partner: AvailablePartner) {
    const key = partnerSelectionKey(partner);
    const adding = !selectedKeys.includes(key);
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
    if (adding) {
      ensurePartnerCategoryDefaults(partner);
    }
    setSubmitError("");
    setUncertainSubmit(false);
  }

  function toggleCategory(key: string, nextSelected: boolean, poolPercent: number | null) {
    setSelectedCategoryKeys((prev) => ({ ...prev, [key]: nextSelected }));
    if (nextSelected && !discountDrafts[key]?.trim()) {
      setDiscountDrafts((prev) => ({
        ...prev,
        [key]: defaultCategoryDiscountDraft(poolPercent),
      }));
    }
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  }

  function applyFullDiscountToClient(fieldKey: string, pool: number | null) {
    if (pool === null) return;
    setSelectedCategoryKeys((prev) => ({ ...prev, [fieldKey]: true }));
    setDiscountDrafts((prev) => ({ ...prev, [fieldKey]: String(pool) }));
  }

  function goToDiscountsStep() {
    setSubmitError("");
    if (needsClient && !clientId) {
      setSubmitError("Выберите клиента");
      return;
    }
    if (selectedPartners.length === 0) {
      setSubmitError("Выберите хотя бы одного партнёра");
      return;
    }
    setWizardStep(2);
  }

  function buildSubmitBody():
    | { ok: true; body: CreateCertificateBody & { agentClientId?: string; branchId?: string } }
    | { ok: false; message: string; fieldErrors?: Record<string, string> } {
    if (needsClient && !clientId) {
      return { ok: false, message: "Выберите клиента" };
    }
    const payloadResult = buildCreateCertificatePayload({
      selectedPartners,
      discountDrafts,
      selectedCategoryKeys: hasWizard ? selectedCategoryKeys : undefined,
      requireTenthStep: miniCertificateRequireTenthStep(bootstrap.role),
      maxUsages: issuerLimitsControlledByRecipient ? undefined : 0,
    });
    if (!payloadResult.ok) {
      return {
        ok: false,
        message: payloadResult.formError ?? "Проверьте условия документа",
        fieldErrors: payloadResult.fieldErrors,
      };
    }
    return {
      ok: true,
      body: {
        ...payloadResult.body,
        ...(clientId ? { agentClientId: clientId } : {}),
        ...(branchId && needsBranch ? { branchId } : {}),
      },
    };
  }

  async function postCertificateAttempt(
    record: MiniCertificateCreateAttemptRecord,
    wasRetry: boolean,
  ) {
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    markMiniCertificateCreateAttemptInFlight(draftScope, record.idempotencyKey);
    try {
      const cert = await miniAppCreateCertificate(platform, record.body, record.idempotencyKey, {
        branchId,
        embeddedContext,
      });
      clearMiniCertificateCreateAttempt(draftScope);
      clearMiniCertificateCreateDraft(draftScope);
      setOpenAttempt(null);
      setUncertainSubmit(false);
      onCreated(cert);
    } catch (err) {
      const outcome = classifyMiniCertificateCreateFailure(err, wasRetry);
      if (outcome.kind === "success") {
        return;
      }
      if (outcome.kind === "uncertain" || outcome.kind === "unknown_persist") {
        markMiniCertificateCreateAttemptUnknown(draftScope, record.idempotencyKey);
        refreshOpenAttempt();
        setSubmitError(
          (outcome.kind === "unknown_persist" ? outcome.message : undefined) ??
            "Результат выпуска неизвестен. Нажмите «Проверить результат» с тем же ключом Idempotency-Key.",
        );
        return;
      }
      if (outcome.kind === "conflict") {
        markMiniCertificateCreateAttemptUnknown(draftScope, record.idempotencyKey);
        refreshOpenAttempt();
        setSubmitError(outcome.message ?? MINI_CERT_ATTEMPT_USE_RETRY);
        return;
      }
      clearMiniCertificateCreateAttempt(draftScope);
      refreshOpenAttempt();
      setUncertainSubmit(false);
      if (err instanceof RemcardApiError) {
        const code =
          err.body && typeof err.body === "object"
            ? (err.body as { code?: string }).code
            : undefined;
        if (err.status === 422 && code === "MINI_LIMIT_EXCEEDED") {
          setSubmitError(
            err.message ||
              "Превышен лимит пула % для выбранного филиала. Уменьшите условия программы или смените точку.",
          );
        } else {
          setSubmitError(outcome.message);
        }
      } else {
        setSubmitError(outcome.message);
      }
    } finally {
      submitInFlightRef.current = false;
      setSubmitting(false);
    }
  }

  async function submitFresh() {
    if (fixtureCreateSeed && fixtureSubmitCertificate) {
      clearMiniCertificateCreateAttempt(draftScope);
      clearMiniCertificateCreateDraft(draftScope);
      onCreated(fixtureSubmitCertificate);
      return;
    }
    if (submitInFlightRef.current || submitting) return;
    if (attemptLocked) {
      setSubmitError(MINI_CERT_ATTEMPT_USE_RETRY);
      return;
    }
    setSubmitError("");
    setFieldErrors({});
    const built = buildSubmitBody();
    if (!built.ok) {
      setSubmitError(built.message);
      if (built.fieldErrors) setFieldErrors(built.fieldErrors);
      return;
    }
    const began = beginMiniCertificateCreateAttempt({ scope: draftScope, body: built.body });
    if (!began.ok) {
      if (began.reason === "storage") {
        setSubmitError(MINI_CERT_ATTEMPT_STORAGE_FAILED);
        return;
      }
      if (began.reason === "body_mismatch") {
        setSubmitError(MINI_CERT_ATTEMPT_BODY_MISMATCH);
        refreshOpenAttempt();
        return;
      }
      setSubmitError(MINI_CERT_ATTEMPT_USE_RETRY);
      refreshOpenAttempt();
      return;
    }
    setOpenAttempt(began.record);
    await postCertificateAttempt(began.record, false);
  }

  async function checkResult() {
    if (submitInFlightRef.current || submitting) return;
    const prepared = prepareMiniCertificateCreateRetry(draftScope);
    if (!prepared.ok) {
      setSubmitError("Нет сохранённой попытки для проверки результата.");
      refreshOpenAttempt();
      return;
    }
    await postCertificateAttempt(prepared.record, true);
  }

  const subpageTitle = discountPage
    ? "Скидки по категориям"
    : hasWizard
      ? "Создать сертификат"
      : "Новый сертификат";

  const subpageLead = discountPage
    ? "Задайте скидку клиенту по каждой выбранной категории."
    : hasWizard
      ? "Выберите партнёров с согласованными условиями."
      : "Настройте условия и выпустите документ.";

  function handleSubpageBack() {
    if (submitInFlightRef.current || submitting) {
      return;
    }
    if (discountPage) {
      setWizardStep(1);
      return;
    }
    onBack();
  }

  const body = (
    <form
      className={styles.miniCreateForm}
      data-testid="mini-create-form"
      onSubmit={(e) => e.preventDefault()}
    >
      {needsBranch && branchLine ? (
        <p className={styles.scanNotice} data-testid="mini-cert-branches-line">
          Филиал выпуска: {branchLine}
        </p>
      ) : null}
      {needsClient || clients.length > 0 ? (
        <label className={styles.miniField}>
          <span className={styles.miniFieldLabel}>{needsClient ? "Клиент" : "Клиент (необязательно)"}</span>
          <select
            className={styles.miniSelect}
            value={clientId}
            data-testid="mini-cert-client"
            disabled={discountPage && hasWizard}
            onChange={(e) => setClientId(e.target.value)}
          >
            {!needsClient ? <option value="">Без привязки к клиенту</option> : null}
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {stalePartnersNotice ? (
        <p className={styles.scanNotice} role="status">
          Некоторые ранее выбранные партнёры больше недоступны и были сняты.
        </p>
      ) : null}
      {hasWizard ? (
        <ol className={styles.certProgress} aria-label="Шаги создания сертификата">
          <li className={discountPage ? undefined : styles.certProgressCurrent}>
            <b>1</b> Партнёры
          </li>
          <li className={discountPage ? styles.certProgressCurrent : undefined}>
            <b>2</b> Скидки
          </li>
        </ol>
      ) : null}

      {!discountPage ? (
        <section data-testid="mini-cert-step-partners">
          {hasWizard ? (
            <label className={styles.miniField}>
              <span className={styles.miniFieldLabel}>Найти партнёра</span>
              <input
                type="search"
                className={styles.miniSearch}
                value={partnerSearchQuery}
                data-testid="mini-cert-partner-search"
                placeholder="Название, город, товар"
                onChange={(e) => setPartnerSearchQuery(e.target.value)}
              />
            </label>
          ) : null}
          <div className={styles.partnerPick}>
            {filteredPartners.map((partner) => {
              const key = partnerSelectionKey(partner);
              const selected = selectedKeys.includes(key);
              return (
                <label
                  key={key}
                  className={`${styles.partnerOption} ${selected ? styles.partnerOptionSelected : ""}`}
                  data-testid={`mini-cert-partner-${key}`}
                >
                  <input type="checkbox" checked={selected} onChange={() => togglePartner(partner)} />
                  <span className={styles.partnerOptionText}>
                    <strong>{partner.storeName}</strong>
                    <small>
                      {partner.city ? `${partner.city} · ` : ""}
                      {partner.categories
                        .filter((c) => isCategoryIssuable(c, partner.isSelfScan))
                        .map((c) => displayCategoryLabel(c.category, c.categoryLabel))
                        .join(", ")}
                    </small>
                  </span>
                </label>
              );
            })}
          </div>
          {hasWizard ? (
            <p className={styles.scanNotice} data-testid="mini-cert-selected-count">
              Выбрано партнёров: {selectedPartners.length}
            </p>
          ) : null}
          {hasWizard ? (
            <button
              type="button"
              className={styles.primaryBtn}
              data-testid="mini-cert-next-discounts"
              disabled={selectedPartners.length === 0}
              onClick={goToDiscountsStep}
            >
              Далее: скидки
            </button>
          ) : null}
        </section>
      ) : null}

      {discountPage || !hasWizard ? (
        <section data-testid="mini-cert-step-discounts">
          {selectedPartners.map((partner) => (
            <div key={partnerSelectionKey(partner)} className={styles.discountPartnerBlock}>
              <h3 className={styles.discountPartnerTitle}>{partner.storeName}</h3>
              {partner.categories.map((cat) => {
                const key = categoryFieldKey(partner.storeUserId, cat.category);
                const pool = resolvePoolPercent({
                  category: cat.category,
                  categoryLabel: cat.categoryLabel,
                  poolPercent: cat.poolPercent,
                  isSelfScan: partner.isSelfScan,
                });
                const rowBlocked = !isCategoryIssuable(cat, partner.isSelfScan);
                const categorySelected = !rowBlocked && selectedCategoryKeys[key] === true;
                const draftValue =
                  discountDrafts[key] ??
                  (cat.discountPercent != null ? String(cat.discountPercent) : "");
                const issuerPreview = categorySelected
                  ? previewIssuerPercent(
                      {
                        category: cat.category,
                        categoryLabel: cat.categoryLabel,
                        poolPercent: cat.poolPercent,
                        isSelfScan: partner.isSelfScan,
                      },
                      draftValue,
                      miniCertificateRequireTenthStep(bootstrap.role)
                        ? { requireTenthStep: true }
                        : undefined,
                    )
                  : null;
                return (
                  <div
                    key={key}
                    className={`${styles.discountRow} ${rowBlocked ? styles.discountRowBlocked : ""}`}
                    data-testid={`mini-cert-category-${key}`}
                  >
                    {hasWizard ? (
                      <label className={styles.discountRowToggle}>
                        <input
                          type="checkbox"
                          checked={categorySelected}
                          disabled={rowBlocked}
                          onChange={(e) => toggleCategory(key, e.target.checked, pool)}
                        />
                        <span>{displayCategoryLabel(cat.category, cat.categoryLabel)}</span>
                      </label>
                    ) : (
                      <strong>{displayCategoryLabel(cat.category, cat.categoryLabel)}</strong>
                    )}
                    {pool !== null ? (
                      <p className={styles.scanNotice}>Согласовано {pool}%</p>
                    ) : (
                      <p className={styles.scanBad} role="alert">
                        Нет согласованного процента для категории
                      </p>
                    )}
                    <label className={styles.miniField}>
                      <span className={styles.miniFieldLabel}>Скидка клиенту, %</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        className={styles.miniSearch}
                        disabled={rowBlocked || (hasWizard && !categorySelected)}
                        value={draftValue}
                        onChange={(e) => {
                          const next = e.target.value;
                          setDiscountDrafts((prev) => ({ ...prev, [key]: next }));
                          if (fieldErrors[key]) {
                            setFieldErrors((prev) => {
                              const copy = { ...prev };
                              delete copy[key];
                              return copy;
                            });
                          }
                        }}
                      />
                    </label>
                    {fieldErrors[key] ? (
                      <p className={styles.scanBad} role="alert">
                        {fieldErrors[key]}
                      </p>
                    ) : null}
                    {!partner.isSelfScan && pool !== null && categorySelected ? (
                      <p className={styles.scanNotice}>
                        Ваше вознаграждение: {issuerPreview != null ? `${issuerPreview}%` : "—"}
                      </p>
                    ) : null}
                    {!rowBlocked && pool !== null ? (
                      <button
                        type="button"
                        className={styles.textLinkBtn}
                        data-testid={`mini-cert-all-to-client-${key}`}
                        onClick={() => applyFullDiscountToClient(key, pool)}
                      >
                        Всё клиенту
                      </button>
                    ) : null}
                    {fieldErrors[key] && pool !== null && draftValue.trim() !== "" ? (
                      <p className={styles.scanNotice}>{formatDiscountLimitError(pool)}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </section>
      ) : null}

      {submitError && (discountPage || !hasWizard) ? (
        <p className={styles.scanBad} role="alert" data-testid="mini-cert-submit-error">
          {submitError}
        </p>
      ) : null}
      {uncertainSubmit ? (
        <p className={styles.scanNotice} data-testid="mini-cert-uncertain-submit">
          Попытка и Idempotency-Key сохранены в сессии браузера. Новый выпуск заблокирован, пока не
          проверите результат с исходным ключом.
          {openAttempt?.idempotencyKey ? (
            <span data-testid="mini-cert-stored-idempotency-key"> {openAttempt.idempotencyKey}</span>
          ) : null}
        </p>
      ) : null}

      {discountPage ? (
        <div className={styles.certButtonRow}>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={submitting}
            onClick={() => {
              if (submitInFlightRef.current || submitting) return;
              setWizardStep(1);
            }}
          >
            Назад
          </button>
          {uncertainSubmit ? (
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={submitting}
              data-testid="mini-cert-check-result"
              onClick={() => void checkResult()}
            >
              {submitting ? "Проверка…" : "Проверить результат"}
            </button>
          ) : (
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={submitting || attemptLocked}
              data-testid="mini-create-submit"
              onClick={() => void submitFresh()}
            >
              {submitting ? "Выпуск…" : "Выпустить сертификат"}
            </button>
          )}
        </div>
      ) : !hasWizard ? (
        uncertainSubmit ? (
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={submitting}
            data-testid="mini-cert-check-result"
            onClick={() => void checkResult()}
          >
            {submitting ? "Проверка…" : "Проверить результат"}
          </button>
        ) : (
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={submitting || attemptLocked || selectedPartners.length === 0}
            data-testid="mini-create-submit"
            onClick={() => void submitFresh()}
          >
            {submitting ? "Выпуск…" : "Выпустить сертификат"}
          </button>
        )
      ) : null}
    </form>
  );

  if (loadState === "loading") {
    return (
      <MiniAppSubpage title={subpageTitle} lead={subpageLead} onBack={onBack}>
        <p className={styles.scanNotice}>Загрузка программ…</p>
      </MiniAppSubpage>
    );
  }

  if (loadState === "blocked") {
    return (
      <MiniAppSubpage title={subpageTitle} onBack={onBack}>
        <div className={styles.blockedPanel} role="alert">
          <p>{blockMessage}</p>
        </div>
      </MiniAppSubpage>
    );
  }

  return (
    <MiniAppSubpage
      title={subpageTitle}
      lead={subpageLead}
      backLabel={discountPage ? "← Назад" : undefined}
      onBack={handleSubpageBack}
    >
      {body}
    </MiniAppSubpage>
  );
}
