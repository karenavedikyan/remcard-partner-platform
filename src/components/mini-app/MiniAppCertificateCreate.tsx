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
  hashAgentCreatePayload,
  resolveCreateIdempotencySession,
  type CreateIdempotencySession,
} from "@/lib/agent-r03/create-idempotency";
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

function isUncertainCreateFailure(error: unknown): boolean {
  if (!(error instanceof RemcardApiError)) return true;
  if (error.status === 0) return true;
  if (error.status >= 502 && error.status <= 504) return true;
  return false;
}

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
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [stalePartnersNotice, setStalePartnersNotice] = useState(false);

  const idempotencyRef = useRef<CreateIdempotencySession | null>(null);

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

      if (partnersPayload.needsClient) {
        if (!clientRowsFromApi.length) {
          setBlockMessage("Нет клиентов для выпуска. Добавьте клиента в кабинете PROF.");
          setLoadState("blocked");
          return;
        }
        setClients(clientRowsFromApi);
        if (!clientId) setClientId(clientRowsFromApi[0].id);
      }

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
    clientId,
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

  async function submit() {
    if (fixtureCreateSeed && fixtureSubmitCertificate) {
      clearMiniCertificateCreateDraft(draftScope);
      onCreated(fixtureSubmitCertificate);
      return;
    }
    if (submitting) return;
    if (needsClient && !clientId) {
      setSubmitError("Выберите клиента");
      return;
    }
    setSubmitError("");
    setFieldErrors({});

    const payloadResult = buildCreateCertificatePayload({
      selectedPartners,
      discountDrafts,
      selectedCategoryKeys: hasWizard ? selectedCategoryKeys : undefined,
      requireTenthStep: miniCertificateRequireTenthStep(bootstrap.role),
      maxUsages: issuerLimitsControlledByRecipient ? undefined : 0,
    });

    if (!payloadResult.ok) {
      setSubmitError(payloadResult.formError ?? "Проверьте условия документа");
      setFieldErrors(payloadResult.fieldErrors);
      return;
    }

    setSubmitting(true);
    setUncertainSubmit(false);
    try {
      const body: CreateCertificateBody & { agentClientId?: string; branchId?: string } = {
        ...payloadResult.body,
        ...(needsClient ? { agentClientId: clientId } : {}),
        ...(branchId && needsBranch ? { branchId } : {}),
      };
      const payloadHash = hashAgentCreatePayload(body);
      const session = resolveCreateIdempotencySession(idempotencyRef.current, payloadHash);
      idempotencyRef.current = session;
      const cert = await miniAppCreateCertificate(platform, body, session.key, {
        branchId,
        embeddedContext,
      });
      idempotencyRef.current = null;
      clearMiniCertificateCreateDraft(draftScope);
      onCreated(cert);
    } catch (err) {
      const uncertain = isUncertainCreateFailure(err);
      setUncertainSubmit(uncertain);
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
          setSubmitError(
            uncertain
              ? "Сеть прервала выпуск. Повторите только если документ не появился в кабинете — защита от дублей сохранена."
              : err.message,
          );
        }
      } else {
        setSubmitError(
          "Сеть прервала выпуск. Повторите только если документ не появился в кабинете — защита от дублей сохранена.",
        );
      }
    } finally {
      setSubmitting(false);
    }
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
      {needsClient ? (
        <label className={styles.miniField}>
          <span className={styles.miniFieldLabel}>Клиент</span>
          <select
            className={styles.miniSelect}
            value={clientId}
            data-testid="mini-cert-client"
            disabled={discountPage && hasWizard}
            onChange={(e) => setClientId(e.target.value)}
          >
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
          Ключ идемпотентности сохранён — повторная отправка с теми же условиями не создаст дубль
          на стороне PROF.
        </p>
      ) : null}

      {discountPage ? (
        <div className={styles.certButtonRow}>
          <button type="button" className={styles.secondaryBtn} onClick={() => setWizardStep(1)}>
            Назад
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={submitting}
            data-testid="mini-create-submit"
            onClick={() => void submit()}
          >
            {submitting ? "Выпуск…" : "Выпустить сертификат"}
          </button>
        </div>
      ) : !hasWizard ? (
        <button
          type="button"
          className={styles.primaryBtn}
          disabled={submitting || selectedPartners.length === 0}
          data-testid="mini-create-submit"
          onClick={() => void submit()}
        >
          {submitting ? "Выпуск…" : "Выпустить сертификат"}
        </button>
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