"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { displayCategoryLabel } from "@/lib/category-display";
import { getAuthMe, RemcardApiError, remcardFetch } from "@/lib/api-client";
import {
  buildCreateCertificatePayload,
  categoryFieldKey,
  partnershipTermsHref,
  previewIssuerPercent,
  resolvePoolPercent,
} from "@/lib/certificate-percent";
import type { CategoryValidationFailureReason } from "@/lib/certificate-percent";
import type {
  AvailablePartner,
  AvailablePartnersResponse,
  CertificateRecommendationIssuerMissingField,
  StoreCertificate,
} from "@/lib/certificate-types";
import {
  clearRecommendationCreateDraft,
  loadRecommendationCreateDraft,
  reconcileRecommendationDraftWithPartners,
  saveRecommendationCreateDraft,
  serializeRecommendationCreateDraftScope,
  type RecommendationCreateDraftScope,
} from "@/lib/recommendation-create-draft";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import {
  ctaLabelForIssuerCode,
  ctaLabelForIssuerFocus,
  profileHrefForIssuerFocus,
  profileHrefForIssuerMissing,
} from "@/lib/recommendation-profile-focus";
import { createAgentCertificate } from "@/lib/agent-r03/api";
import { patchSpecialistIssuerCertificate } from "@/lib/specialist-certificates/api";
import {
  hashAgentCreatePayload,
  resolveCreateIdempotencySession,
  type CreateIdempotencySession,
} from "@/lib/agent-r03/create-idempotency";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import { storeCertificateDisplayCode } from "@/lib/certificate-url";
import {
  defaultCategoryDiscountDraft,
  partnerMatchesSearch,
  partnerSelectionKey,
} from "@/lib/specialist-certificate-create-ui";
import agentStyles from "@/components/agent-r03/agent-r03.module.css";
import { CertificateResultView } from "./CertificateResultView";
import styles from "./recommendations.module.css";

type ValidityPreset = "1" | "3" | "6" | "12" | "unlimited";

const RETURN_PATH = "/recommendations/new";

const DEFAULT_VALIDITY: ValidityPreset = "3";

type DraftScopeResolution =
  | { status: "pending" }
  | { status: "no-session" }
  | { status: "error"; message: string }
  | { status: "ready"; scope: RecommendationCreateDraftScope };

const VALIDITY_OPTIONS: Array<{ value: ValidityPreset; label: string }> = [
  { value: "1", label: "1 месяц" },
  { value: "3", label: "3 месяца" },
  { value: "6", label: "6 месяцев" },
  { value: "12", label: "12 месяцев" },
  { value: "unlimited", label: "Без ограничения" },
];

function validityToIso(value: ValidityPreset): string | undefined {
  if (value === "unlimited") {
    return undefined;
  }
  const date = new Date();
  date.setMonth(date.getMonth() + Number(value));
  return date.toISOString();
}

type CertificateCreateFormProps = {
  agentR03?: boolean;
  agentClientId?: string;
  successHrefBase?: string;
  issuerUi?: "default" | "specialist";
  presentation?: "dialog" | "page";
  onRequestClose?: () => void;
  /** Fired once after successful POST (including when alias PATCH fails). */
  onCertificateCreated?: (certificate: StoreCertificate) => void;
  /** Reload parent list after alias persisted (initial PATCH or retry). */
  onListRefresh?: () => void;
};

export function CertificateCreateForm({
  agentR03 = false,
  agentClientId,
  successHrefBase = "/recommendations",
  issuerUi = "default",
  presentation = "page",
  onRequestClose,
  onCertificateCreated,
  onListRefresh,
}: CertificateCreateFormProps = {}) {
  const returnPath = agentR03 ? "/certificates/new" : RETURN_PATH;
  const [partners, setPartners] = useState<AvailablePartner[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [validityPreset, setValidityPreset] = useState<ValidityPreset>(DEFAULT_VALIDITY);
  const [discountDrafts, setDiscountDrafts] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fieldErrorReasons, setFieldErrorReasons] = useState<
    Record<string, CategoryValidationFailureReason>
  >({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<StoreCertificate | null>(null);
  const [scopeResolution, setScopeResolution] = useState<DraftScopeResolution>({ status: "pending" });
  const [hydratedScopeKey, setHydratedScopeKey] = useState<string | null>(null);
  const [issuerReady, setIssuerReady] = useState<boolean | null>(null);
  const [issuerMissing, setIssuerMissing] = useState<
    CertificateRecommendationIssuerMissingField[]
  >([]);
  const [stalePartnerKeys, setStalePartnerKeys] = useState<string[]>([]);
  const scopeResolveGenerationRef = useRef(0);
  const createIdempotencyRef = useRef<CreateIdempotencySession | null>(null);
  const [specialistStep, setSpecialistStep] = useState<1 | 2>(1);
  const [partnerSearchQuery, setPartnerSearchQuery] = useState("");
  const [selectedCategoryKeys, setSelectedCategoryKeys] = useState<Record<string, boolean>>({});
  const [privateAlias, setPrivateAlias] = useState("");
  const [aliasSaveNotice, setAliasSaveNotice] = useState<string | null>(null);
  const [aliasSavePending, setAliasSavePending] = useState(false);
  const [pendingAliasValue, setPendingAliasValue] = useState<string | null>(null);
  const specialistWizard = issuerUi === "specialist";
  const specialistDialog = specialistWizard && presentation === "dialog";

  useEffect(() => {
    if (!specialistDialog) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting && !created) {
        onRequestClose?.();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [created, onRequestClose, specialistDialog, submitting]);

  const resolveDraftScope = useCallback(async () => {
    const generation = ++scopeResolveGenerationRef.current;
    setScopeResolution({ status: "pending" });
    setHydratedScopeKey(null);
    try {
      const me = await getAuthMe();
      if (!me.user?.id) {
        if (generation === scopeResolveGenerationRef.current) {
          setScopeResolution({ status: "no-session" });
        }
        return;
      }
      const ctx = await remcardFetch<ProContextSnapshot>("/api/pro/context");
      if (generation !== scopeResolveGenerationRef.current) return;
      setScopeResolution({
        status: "ready",
        scope: {
          userId: me.user.id,
          organizationId: ctx.organization?.id ?? null,
          branchId: ctx.activeBranch?.id ?? null,
        },
      });
    } catch (caught) {
      if (generation !== scopeResolveGenerationRef.current) return;
      setScopeResolution({
        status: "error",
        message:
          caught instanceof RemcardApiError
            ? caught.message
            : "Не удалось определить рабочий контекст. Черновик формы не сохранится, пока контекст недоступен.",
      });
    }
  }, []);

  const loadPartners = useCallback(async () => {
    setLoadState("loading");
    setLoadError("");
    try {
      const data = await remcardFetch<AvailablePartnersResponse>(
        "/api/store/certificate/available-partners",
      );
      setIssuerReady(data.certificateRecommendationIssuerReady !== false);
      setIssuerMissing(data.certificateRecommendationIssuerMissing ?? []);
      const rows = [...(data.partners ?? [])];
      if (data.selfScanPartner) {
        rows.push(data.selfScanPartner);
      }
      setPartners(rows);
      setLoadState("loaded");
    } catch (caught) {
      setPartners([]);
      setLoadState("error");
      setLoadError(
        caught instanceof RemcardApiError
          ? caught.message
          : "Не удалось загрузить партнёров для документа",
      );
    }
  }, []);

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);

  useEffect(() => {
    void resolveDraftScope();
  }, [resolveDraftScope]);

  const persistableScope =
    scopeResolution.status === "ready" ? scopeResolution.scope : null;
  const activeScopeKey = persistableScope
    ? serializeRecommendationCreateDraftScope(persistableScope)
    : null;

  const selectablePartners = useMemo(
    () => partners.filter((p) => p.programReady !== false && p.categories.length > 0),
    [partners],
  );

  const partnerKeySet = useMemo(
    () => new Set(selectablePartners.map((p) => partnerSelectionKey(p))),
    [selectablePartners],
  );

  useEffect(() => {
    if (loadState !== "loaded" || !persistableScope || !activeScopeKey) return;
    if (hydratedScopeKey === activeScopeKey) return;

    const saved = loadRecommendationCreateDraft(persistableScope);
    if (saved) {
      const reconciled = reconcileRecommendationDraftWithPartners({
        selectedKeys: saved.selectedKeys,
        discountDrafts: saved.discountDrafts,
        selectedCategoryKeys: saved.selectedCategoryKeys,
        partnerKeys: partnerKeySet,
      });
      setSelectedKeys(reconciled.selectedKeys);
      setDiscountDrafts(reconciled.discountDrafts);
      setSelectedCategoryKeys(reconciled.selectedCategoryKeys);
      setPartnerSearchQuery(saved.partnerSearchQuery ?? "");
      setSpecialistStep(saved.specialistStep === 2 ? 2 : 1);
      setValidityPreset(saved.validityPreset as ValidityPreset);
      setPrivateAlias(saved.privateAlias ?? "");
      setStalePartnerKeys(reconciled.stalePartnerKeys);
    } else if (hydratedScopeKey != null) {
      setSelectedKeys([]);
      setDiscountDrafts({});
      setSelectedCategoryKeys({});
      setPartnerSearchQuery("");
      setSpecialistStep(1);
      setValidityPreset(DEFAULT_VALIDITY);
      setPrivateAlias("");
      setStalePartnerKeys([]);
    }
    setHydratedScopeKey(activeScopeKey);
  }, [activeScopeKey, hydratedScopeKey, loadState, partnerKeySet, persistableScope]);

  useEffect(() => {
    if (loadState !== "loaded" || !persistableScope || !activeScopeKey) return;
    if (hydratedScopeKey !== activeScopeKey) return;
    saveRecommendationCreateDraft(persistableScope, {
      selectedKeys,
      discountDrafts,
      validityPreset,
      partnerSearchQuery: specialistWizard ? partnerSearchQuery : undefined,
      specialistStep: specialistWizard ? specialistStep : undefined,
      selectedCategoryKeys: specialistWizard ? selectedCategoryKeys : undefined,
      privateAlias: specialistWizard ? privateAlias.slice(0, 100) : undefined,
    });
  }, [
    activeScopeKey,
    discountDrafts,
    hydratedScopeKey,
    loadState,
    partnerSearchQuery,
    persistableScope,
    privateAlias,
    selectedCategoryKeys,
    selectedKeys,
    specialistStep,
    specialistWizard,
    validityPreset,
  ]);

  const selectedPartners = useMemo(
    () => selectablePartners.filter((p) => selectedKeys.includes(partnerSelectionKey(p))),
    [selectablePartners, selectedKeys],
  );

  const filteredSelectablePartners = useMemo(
    () => selectablePartners.filter((p) => partnerMatchesSearch(p, partnerSearchQuery)),
    [partnerSearchQuery, selectablePartners],
  );

  const pendingPartners = useMemo(
    () => partners.filter((p) => p.programReady === false || p.categories.length === 0),
    [partners],
  );

  function ensurePartnerCategoryDefaults(partner: AvailablePartner) {
    for (const cat of partner.categories) {
      const fieldKey = categoryFieldKey(partner.storeUserId, cat.category);
      const pool = resolvePoolPercent({
        category: cat.category,
        categoryLabel: cat.categoryLabel,
        poolPercent: cat.poolPercent,
        isSelfScan: partner.isSelfScan,
      });
      setSelectedCategoryKeys((prev) =>
        prev[fieldKey] === undefined ? { ...prev, [fieldKey]: true } : prev,
      );
      setDiscountDrafts((prev) =>
        prev[fieldKey]?.trim()
          ? prev
          : { ...prev, [fieldKey]: defaultCategoryDiscountDraft(pool) },
      );
    }
  }

  function togglePartner(partner: AvailablePartner) {
    const key = partnerSelectionKey(partner);
    if (partner.programReady === false) {
      return;
    }
    const adding = !selectedKeys.includes(key);
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
    if (adding && specialistWizard) {
      ensurePartnerCategoryDefaults(partner);
    }
  }

  useEffect(() => {
    if (!specialistWizard) return;
    for (const partner of selectedPartners) {
      ensurePartnerCategoryDefaults(partner);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only fill undefined category slots
  }, [selectedPartners, specialistWizard]);

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
      setFieldErrorReasons((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  }

  function goToSpecialistDiscountsStep() {
    setSubmitError("");
    if (selectedPartners.length === 0) {
      setSubmitError("Выберите хотя бы одного партнёра");
      return;
    }
    setSpecialistStep(2);
  }

  const tenthStepOptions = specialistWizard ? { requireTenthStep: true as const } : undefined;

  function applyFullDiscountToClient(fieldKey: string, pool: number | null) {
    if (pool === null) return;
    setSelectedCategoryKeys((prev) => ({ ...prev, [fieldKey]: true }));
    setDiscountDrafts((prev) => ({ ...prev, [fieldKey]: String(pool) }));
  }

  const partnersInviteHref = useMemo(() => {
    const params = new URLSearchParams();
    if (agentClientId) params.set("clientId", agentClientId);
    params.set("returnTo", "/recommendations");
    const qs = params.toString();
    return qs ? `/partners?${qs}` : "/partners";
  }, [agentClientId]);

  async function submit() {
    if (submitting || created) {
      return;
    }
    if (issuerReady === false) {
      setSubmitError(issuerMissing[0]?.message ?? "Заполните профиль для рекомендаций");
      return;
    }

    setSubmitError("");
    setFieldErrors({});
    setFieldErrorReasons({});

    const payloadResult = buildCreateCertificatePayload({
      selectedPartners,
      discountDrafts,
      selectedCategoryKeys: specialistWizard ? selectedCategoryKeys : undefined,
      requireTenthStep: specialistWizard,
      validUntil: validityToIso(validityPreset),
      maxUsages: 0,
    });

    if (!payloadResult.ok) {
      setSubmitError(payloadResult.formError ?? "Проверьте условия документа");
      setFieldErrors(payloadResult.fieldErrors);
      setFieldErrorReasons(payloadResult.fieldErrorReasons);
      return;
    }

    setSubmitting(true);
    try {
      const body = agentClientId
        ? { ...payloadResult.body, agentClientId }
        : payloadResult.body;
      let result: StoreCertificate;
      if (agentR03) {
        const payloadHash = hashAgentCreatePayload(body);
        const session = resolveCreateIdempotencySession(createIdempotencyRef.current, payloadHash);
        createIdempotencyRef.current = session;
        result = await createAgentCertificate(body, { idempotencyKey: session.key });
        createIdempotencyRef.current = null;
      } else {
        result = await remcardFetch<StoreCertificate>("/api/store/certificate", {
          method: "POST",
          body,
        });
      }
      setCreated(result);
      onCertificateCreated?.(result);
      if (persistableScope) clearRecommendationCreateDraft(persistableScope);

      const aliasTrimmed = specialistWizard ? privateAlias.trim() : "";
      if (specialistWizard && aliasTrimmed && result.id) {
        setPendingAliasValue(aliasTrimmed);
        try {
          await patchSpecialistIssuerCertificate(result.id, { userAlias: aliasTrimmed });
          setAliasSaveNotice(null);
          setPendingAliasValue(null);
          onListRefresh?.();
        } catch (aliasCaught) {
          setAliasSaveNotice("Сертификат создан, но название не сохранилось");
          setSubmitError("");
        }
      } else {
        setPendingAliasValue(null);
        setAliasSaveNotice(null);
      }
    } catch (caught) {
      if (caught instanceof RemcardApiError && caught.status === 422) {
        const payload = caught.body as {
          missingFields?: CertificateRecommendationIssuerMissingField[];
          errorCode?: string;
        } | null;
        if (payload?.errorCode === "ISSUER_NOT_READY" && payload.missingFields?.length) {
          setIssuerReady(false);
          setIssuerMissing(payload.missingFields);
        }
      }
      setSubmitError(
        caught instanceof RemcardApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Не удалось создать документ",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function retryAliasSave() {
    if (!created?.id || !pendingAliasValue?.trim() || aliasSavePending) {
      return;
    }
    setAliasSavePending(true);
    setAliasSaveNotice(null);
    try {
      await patchSpecialistIssuerCertificate(created.id, { userAlias: pendingAliasValue.trim() });
      setPendingAliasValue(null);
      onListRefresh?.();
    } catch (caught) {
      setAliasSaveNotice("Сертификат создан, но название не сохранилось");
      setSubmitError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить название",
      );
    } finally {
      setAliasSavePending(false);
    }
  }

  function wrapSpecialistShell(node: ReactNode) {
    const title = created
      ? "Сертификат RemCard"
      : specialistStep === 1
        ? "Создать сертификат"
        : "Скидки по категориям";
    const panelClass = specialistDialog
      ? `${agentStyles.r03Root} ${agentStyles.dialogPanel} ${styles.specialistCreatePanel}`
      : `${styles.specialistCreatePagePanel}`;

    const panel = (
      <div
        className={panelClass}
        role="dialog"
        aria-modal={specialistDialog ? true : undefined}
        aria-labelledby="specialist-cert-create-title"
        data-testid="specialist-certificate-create-dialog"
        onClick={specialistDialog ? (event) => event.stopPropagation() : undefined}
      >
        <div className={agentStyles.dialogTitleRow}>
          <h2 id="specialist-cert-create-title">{title}</h2>
          {specialistDialog ? (
            <button
              type="button"
              className={styles.specialistDialogCloseBtn}
              aria-label="Закрыть"
              disabled={submitting}
              onClick={() => onRequestClose?.()}
            >
              ×
            </button>
          ) : null}
        </div>
        {node}
      </div>
    );

    if (specialistDialog) {
      return (
        <div
          className={agentStyles.dialogBackdrop}
          role="presentation"
          onClick={() => {
            if (!submitting) onRequestClose?.();
          }}
        >
          {panel}
        </div>
      );
    }
    return <div className={styles.specialistCreatePageWrap}>{panel}</div>;
  }

  if (created) {
    const result = (
      <>
        {aliasSaveNotice ? (
          <div className={styles.errorBlock} data-testid="specialist-create-alias-notice">
            <p role="alert">{aliasSaveNotice}</p>
            {pendingAliasValue ? (
              <Button
                variant="secondary"
                disabled={aliasSavePending}
                data-testid="specialist-create-alias-retry"
                onClick={() => void retryAliasSave()}
              >
                {aliasSavePending ? "Сохранение…" : "Сохранить название"}
              </Button>
            ) : null}
          </div>
        ) : null}
        <CertificateResultView
          certificate={created}
          displayCode={storeCertificateDisplayCode(created)}
          showCreateSuccessBanner
          presentation={specialistWizard ? "specialist" : "default"}
          privateAlias={privateAlias.trim() || null}
        />
      </>
    );
    return specialistWizard ? wrapSpecialistShell(result) : result;
  }

  const formBody = (
    <>
      {loadState === "loading" ? <p className={styles.loading}>Загрузка партнёров…</p> : null}
      {loadState === "error" ? (
        <div className={styles.errorBlock}>
          <p role="alert">{loadError}</p>
          <Button variant="secondary" onClick={() => void loadPartners()}>
            Повторить
          </Button>
        </div>
      ) : null}

      {scopeResolution.status === "error" ? (
        <div className={styles.errorBlock} data-testid="recommendation-draft-scope-error">
          <p role="status">{scopeResolution.message}</p>
          <p className={styles.meta}>
            Введённые данные остаются на экране, но не сохраняются в черновик, пока не удастся
            загрузить контекст кабинета.
          </p>
          <Button variant="secondary" onClick={() => void resolveDraftScope()}>
            Повторить загрузку контекста
          </Button>
        </div>
      ) : null}

      {loadState === "loaded" ? (
        <>
          {stalePartnerKeys.length > 0 ? (
            <p className={styles.meta} role="status" data-testid="recommendation-draft-stale">
              Некоторые ранее выбранные партнёры больше недоступны и были сняты с формы.
            </p>
          ) : null}
          {issuerReady === false && issuerMissing.length > 0 ? (
            <section className={styles.readinessBlock} data-testid="recommendation-issuer-readiness">
              <h3>Чтобы рекомендовать партнёров</h3>
              <ul className={styles.readinessList}>
                {issuerMissing.map((field) => (
                  <li key={field.code}>
                    <span>{field.message}</span>{" "}
                    {field.code === "directionOrAgent" ? (
                      <span>
                        <Link href={profileHrefForIssuerFocus(RETURN_PATH, "directions")}>
                          {ctaLabelForIssuerFocus("directions")}
                        </Link>
                        {" · "}
                        <Link href={profileHrefForIssuerFocus(RETURN_PATH, "agentActivity")}>
                          {ctaLabelForIssuerFocus("agentActivity")}
                        </Link>
                      </span>
                    ) : (
                      <Link href={profileHrefForIssuerMissing(field.code, RETURN_PATH)}>
                        {ctaLabelForIssuerCode(field.code)}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {specialistWizard ? (
            <>
              <div className={styles.createSteps} aria-label="Шаги создания сертификата">
                <span className={specialistStep === 1 ? styles.createStepCurrent : styles.createStep}>
                  <b>1</b>Партнёры
                </span>
                <span className={specialistStep === 2 ? styles.createStepCurrent : styles.createStep}>
                  <b>2</b>Скидки
                </span>
              </div>

              {specialistStep === 1 ? (
                <section data-testid="specialist-certificate-create-step-1">
                  <p className={styles.meta}>
                    Выберите одного или нескольких партнёров с уже согласованными условиями.
                  </p>
                  <label className={styles.partnerSearchField}>
                    Найти партнёра
                    <input
                      type="search"
                      value={partnerSearchQuery}
                      data-testid="specialist-cert-partner-search"
                      placeholder="Название, город, товар или услуга"
                      onChange={(event) => setPartnerSearchQuery(event.target.value)}
                    />
                  </label>
                  {selectablePartners.length === 0 ? (
                    <p className={styles.meta}>
                      Нет доступных партнёрств для создания документа. Сначала оформите активное
                      партнёрство.
                    </p>
                  ) : filteredSelectablePartners.length === 0 ? (
                    <div className={styles.notice}>
                      <strong>Такого партнёра пока нет</strong>
                      <p className={styles.meta}>
                        Пригласите знакомую компанию. После принятия приглашения и согласования
                        условий она станет доступна для сертификата.
                      </p>
                    </div>
                  ) : (
                    <div className={styles.partnerPick}>
                      {filteredSelectablePartners.map((partner) => {
                        const key = partnerSelectionKey(partner);
                        const selected = selectedKeys.includes(key);
                        return (
                          <label
                            key={key}
                            className={`${styles.partnerOption} ${selected ? styles.partnerOptionSelected : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => togglePartner(partner)}
                            />
                            <span className={styles.partnerCardText}>
                              <strong className={styles.partnerCardName}>{partner.storeName}</strong>
                              <small className={styles.partnerCardMeta}>
                                {partner.city ? `${partner.city} · ` : ""}
                                {partner.categories
                                  .map((c) => displayCategoryLabel(c.category, c.categoryLabel))
                                  .join(", ")}
                              </small>
                              <span className={styles.partnerReadyChip}>Условия согласованы</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <div className={styles.inviteInline}>
                    <div>
                      <strong>Нужен новый партнёр?</strong>
                      <p className={styles.meta}>
                        Найдите его в RemCard или отправьте ссылку знакомому.
                      </p>
                    </div>
                    <Link href={partnersInviteHref}>
                      <Button variant="secondary" type="button">
                        Найти или пригласить
                      </Button>
                    </Link>
                  </div>
                  {pendingPartners.length > 0 ? (
                    <details className={styles.optionalBlock}>
                      <summary>Ожидают согласования</summary>
                      <div className={styles.optionalBlockBody}>
                        {pendingPartners.map((partner) => (
                          <p key={partnerSelectionKey(partner)} className={styles.meta}>
                            {partner.storeName} · ещё нельзя добавить в сертификат
                          </p>
                        ))}
                      </div>
                    </details>
                  ) : null}
                  <div className={styles.createFormFooter}>
                    <small data-testid="specialist-cert-selected-count">
                      Выбрано: {selectedPartners.length}
                    </small>
                    <Button
                      disabled={selectedPartners.length === 0 || issuerReady === false}
                      onClick={goToSpecialistDiscountsStep}
                    >
                      Далее: скидки
                    </Button>
                  </div>
                </section>
              ) : null}

              {specialistStep === 2 ? (
                <section data-testid="specialist-certificate-create-step-2">
                  <p className={styles.meta}>
                    Вы задаёте скидку клиенту. Остаток согласованного процента становится вашим
                    бонусом после покупки.
                  </p>
                  <div className={styles.conditionsGrid}>
                    {selectedPartners.map((partner) => (
                      <div key={partnerSelectionKey(partner)} className={styles.categoryGroupPanel}>
                        <h4 className={styles.categoryGroupTitle}>{partner.storeName}</h4>
                        <div className={styles.categoryRows}>
                        {partner.categories.map((cat) => {
                          const key = categoryFieldKey(partner.storeUserId, cat.category);
                          const pool = resolvePoolPercent({
                            category: cat.category,
                            categoryLabel: cat.categoryLabel,
                            poolPercent: cat.poolPercent,
                            isSelfScan: partner.isSelfScan,
                          });
                          const categorySelected = selectedCategoryKeys[key] === true;
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
                                tenthStepOptions,
                              )
                            : null;
                          const rowBlocked = pool === null;
                          const termsHref = partnershipTermsHref(partner.partnershipId);

                          return (
                            <div key={key} className={styles.categoryRow}>
                              <label className={styles.categoryAllocationHead}>
                                <input
                                  type="checkbox"
                                  checked={categorySelected}
                                  data-testid={`specialist-cert-category-${key}`}
                                  disabled={rowBlocked}
                                  onChange={(event) =>
                                    toggleCategory(key, event.target.checked, pool)
                                  }
                                />
                                <strong>{displayCategoryLabel(cat.category, cat.categoryLabel)}</strong>
                              </label>
                              <div className={styles.categoryAllocationFields}>
                                <div className={styles.allocationLimit}>
                                  <small>Согласовано</small>
                                  <strong>{pool != null ? `${pool}%` : "—"}</strong>
                                </div>
                                <TextField
                                  label="Скидка клиенту, %"
                                  type="number"
                                  inputMode="decimal"
                                  step="0.1"
                                  disabled={!categorySelected || rowBlocked || submitting}
                                  value={draftValue}
                                  error={fieldErrors[key]}
                                  onChange={(event) => {
                                    const next = event.target.value;
                                    setDiscountDrafts((prev) => ({ ...prev, [key]: next }));
                                    if (fieldErrors[key]) {
                                      setFieldErrors((prev) => {
                                        const copy = { ...prev };
                                        delete copy[key];
                                        return copy;
                                      });
                                      setFieldErrorReasons((prev) => {
                                        const copy = { ...prev };
                                        delete copy[key];
                                        return copy;
                                      });
                                    }
                                  }}
                                />
                                <div className={styles.allocationBonus}>
                                  <small>Ваш бонус</small>
                                  <strong>
                                    {categorySelected && issuerPreview != null
                                      ? `${issuerPreview}%`
                                      : "—"}
                                  </strong>
                                </div>
                              </div>
                              <div className={styles.categoryAllocationFooter}>
                                <p className={styles.conditionMeta}>
                                  Можно отдать клиенту весь процент.
                                </p>
                                <button
                                  type="button"
                                  className={styles.allClientAction}
                                  disabled={
                                    !categorySelected || rowBlocked || pool === null || submitting
                                  }
                                  data-testid={`specialist-cert-all-client-${key}`}
                                  onClick={() => applyFullDiscountToClient(key, pool)}
                                >
                                  Всё клиенту
                                </button>
                              </div>
                              {fieldErrorReasons[key] === "over_limit" && termsHref ? (
                                <p className={styles.termsLinkWrap}>
                                  <Link href={termsHref} className={styles.termsLink}>
                                    Изменить условия партнёрства
                                  </Link>
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <details className={styles.optionalBlock} data-testid="specialist-certificate-create-alias">
                    <summary>Название для себя · необязательно</summary>
                    <div className={styles.optionalBlockBody}>
                      <TextField
                        label="Название"
                        value={privateAlias}
                        disabled={submitting}
                        maxLength={100}
                        placeholder="Например, ремонт для Анны"
                        onChange={(event) => setPrivateAlias(event.target.value)}
                      />
                    </div>
                  </details>
                  <details className={styles.optionalBlock}>
                    <summary>Срок действия</summary>
                    <div className={styles.optionalBlockBody}>
                      <label className={styles.meta}>
                        Срок
                        <select
                          value={validityPreset}
                          disabled={submitting}
                          data-testid="recommendation-validity-preset"
                          onChange={(event) =>
                            setValidityPreset(event.target.value as ValidityPreset)
                          }
                        >
                          {VALIDITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </details>
                  <p className={styles.notice}>
                    Акционные модели не участвуют. Чтобы увеличить общий процент, сначала
                    согласуйте новые условия с партнёром.
                  </p>
                  {submitError ? (
                    <p className={styles.errorText} role="alert">
                      {submitError}
                    </p>
                  ) : null}
                  <div className={styles.createFormFooter}>
                    <Button variant="secondary" disabled={submitting} onClick={() => setSpecialistStep(1)}>
                      Назад
                    </Button>
                    <Button
                      disabled={submitting || issuerReady === false}
                      onClick={() => void submit()}
                    >
                      {submitting ? "Создание…" : "Создать сертификат"}
                    </Button>
                  </div>
                </section>
              ) : null}
            </>
          ) : (
            <>
              <section className={styles.formSection}>
                <h3>Партнёры</h3>
                {selectablePartners.length === 0 ? (
                  <p className={styles.meta}>
                    Нет доступных партнёрств для создания документа. Сначала оформите активное
                    партнёрство.
                  </p>
                ) : (
                  <div className={styles.partnerPick}>
                    {partners.map((partner) => {
                      const key = partnerSelectionKey(partner);
                      const disabled =
                        partner.programReady === false || partner.categories.length === 0;
                      const selected = selectedKeys.includes(key);
                      return (
                        <label
                          key={key}
                          className={`${styles.partnerOption} ${selected ? styles.partnerOptionSelected : ""} ${disabled ? styles.partnerOptionDisabled : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={disabled}
                            onChange={() => togglePartner(partner)}
                          />
                          <span>
                            <strong>{partner.storeName}</strong>
                            {partner.city ? ` · ${partner.city}` : ""}
                            {disabled && partner.programMissing?.length ? (
                              <span className={styles.conditionMeta}>
                                {" "}
                                — профиль партнёра не готов
                              </span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </section>

              {selectedPartners.length > 0 ? (
                <section className={styles.formSection}>
                  <h3>Условия для клиента</h3>
                  <p className={styles.meta}>
                    Общий процент задаётся в условиях партнёрства. Здесь вы распределяете его между
                    скидкой клиенту и своим вознаграждением.
                  </p>
                  <div className={styles.conditionsGrid}>
                    {selectedPartners.flatMap((partner) =>
                      partner.categories.map((cat) => {
                        const key = categoryFieldKey(partner.storeUserId, cat.category);
                        const pool = resolvePoolPercent({
                          category: cat.category,
                          categoryLabel: cat.categoryLabel,
                          poolPercent: cat.poolPercent,
                          isSelfScan: partner.isSelfScan,
                        });
                        const draftValue =
                          discountDrafts[key] ??
                          (cat.discountPercent != null ? String(cat.discountPercent) : "");
                        const issuerPreview = previewIssuerPercent(
                          {
                            category: cat.category,
                            categoryLabel: cat.categoryLabel,
                            poolPercent: cat.poolPercent,
                            isSelfScan: partner.isSelfScan,
                          },
                          draftValue,
                        );
                        const rowBlocked = pool === null;
                        const termsHref = partnershipTermsHref(partner.partnershipId);

                        return (
                          <div
                            key={key}
                            className={`${styles.conditionRow} ${rowBlocked ? styles.conditionRowBlocked : ""}`}
                          >
                            <strong>
                              {partner.storeName} —{" "}
                              {displayCategoryLabel(cat.category, cat.categoryLabel)}
                            </strong>
                            {pool !== null ? (
                              <p className={styles.agreedPercent}>
                                Согласованный процент: <strong>{pool}%</strong>
                              </p>
                            ) : (
                              <p className={styles.errorText} role="alert">
                                Нет согласованного процента для этой категории
                              </p>
                            )}
                            <TextField
                              label="Скидка клиенту, %"
                              type="number"
                              inputMode="decimal"
                              disabled={rowBlocked || submitting}
                              value={draftValue}
                              error={fieldErrors[key]}
                              onChange={(event) => {
                                const next = event.target.value;
                                setDiscountDrafts((prev) => ({ ...prev, [key]: next }));
                                if (fieldErrors[key]) {
                                  setFieldErrors((prev) => {
                                    const copy = { ...prev };
                                    delete copy[key];
                                    return copy;
                                  });
                                  setFieldErrorReasons((prev) => {
                                    const copy = { ...prev };
                                    delete copy[key];
                                    return copy;
                                  });
                                }
                              }}
                            />
                            {!partner.isSelfScan && pool !== null ? (
                              <p className={styles.conditionMeta}>
                                Ваше вознаграждение:{" "}
                                <strong>
                                  {issuerPreview != null ? `${issuerPreview}%` : "—"}
                                </strong>
                              </p>
                            ) : null}
                            {fieldErrorReasons[key] === "over_limit" && termsHref ? (
                              <p className={styles.termsLinkWrap}>
                                <Link href={termsHref} className={styles.termsLink}>
                                  Изменить условия партнёрства
                                </Link>
                              </p>
                            ) : null}
                            {partner.isSelfScan ? (
                              <p className={styles.conditionMeta}>
                                Самосканирование: только скидка клиенту, вознаграждение PROF — 0%
                              </p>
                            ) : null}
                          </div>
                        );
                      }),
                    )}
                  </div>
                </section>
              ) : null}

              <section className={styles.formSection}>
                <h3>Срок действия</h3>
                <label className={styles.meta}>
                  Срок
                  <select
                    value={validityPreset}
                    disabled={submitting}
                    data-testid="recommendation-validity-preset"
                    onChange={(event) => setValidityPreset(event.target.value as ValidityPreset)}
                  >
                    {VALIDITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              {submitError ? (
                <p className={styles.errorText} role="alert">
                  {submitError}
                </p>
              ) : null}

              <Button
                disabled={submitting || selectablePartners.length === 0 || issuerReady === false}
                onClick={() => void submit()}
              >
                {submitting
                  ? "Создание…"
                  : agentR03
                    ? "Создать сертификат"
                    : "Создать рекомендацию"}
              </Button>
            </>
          )}
        </>
      ) : null}
    </>
  );

  return specialistWizard ? wrapSpecialistShell(formBody) : formBody;
}
