"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
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

function partnerKey(partner: AvailablePartner): string {
  return `${partner.storeUserId}:${partner.partnershipId ?? "self"}`;
}

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
};

export function CertificateCreateForm({
  agentR03 = false,
  agentClientId,
  successHrefBase = "/recommendations",
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
    () => new Set(selectablePartners.map((p) => partnerKey(p))),
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
        partnerKeys: partnerKeySet,
      });
      setSelectedKeys(reconciled.selectedKeys);
      setDiscountDrafts(reconciled.discountDrafts);
      setValidityPreset(saved.validityPreset as ValidityPreset);
      setStalePartnerKeys(reconciled.stalePartnerKeys);
    } else if (hydratedScopeKey != null) {
      setSelectedKeys([]);
      setDiscountDrafts({});
      setValidityPreset(DEFAULT_VALIDITY);
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
    });
  }, [
    activeScopeKey,
    discountDrafts,
    hydratedScopeKey,
    loadState,
    persistableScope,
    selectedKeys,
    validityPreset,
  ]);

  const selectedPartners = useMemo(
    () => selectablePartners.filter((p) => selectedKeys.includes(partnerKey(p))),
    [selectablePartners, selectedKeys],
  );

  function togglePartner(partner: AvailablePartner) {
    const key = partnerKey(partner);
    if (partner.programReady === false) {
      return;
    }
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  }

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
      const result = agentR03
        ? await createAgentCertificate(body)
        : await remcardFetch<StoreCertificate>("/api/store/certificate", {
            method: "POST",
            body,
          });
      setCreated(result);
      if (persistableScope) clearRecommendationCreateDraft(persistableScope);
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

  if (created) {
    return <CertificateResultView certificate={created} />;
  }

  return (
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
                  const key = partnerKey(partner);
                  const disabled = partner.programReady === false || partner.categories.length === 0;
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
            {submitting ? "Создание…" : agentR03 ? "Создать сертификат" : "Создать рекомендацию"}
          </Button>
        </>
      ) : null}
    </>
  );
}
