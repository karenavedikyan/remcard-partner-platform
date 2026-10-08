"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RemcardApiError } from "@/lib/api-client";
import type { ConsentRequirement } from "@/lib/cabinet-readiness";
import { isDocumentVersionMismatch } from "@/lib/auth-consent";
import { consentRequirementKey, fetchReadinessSafe } from "@/lib/auth-session";
import {
  buildSessionRecoveryLoginHref,
  resolveDestinationAfterAuth,
} from "@/lib/auth-flow";
import { getLegalSiteUrl } from "@/lib/auth-config";
import { ONBOARDING_STAGES } from "@/lib/onboarding-stages";
import {
  PARTNER_TYPE_OPTIONS,
  type PartnerTypeOption,
} from "@/lib/onboarding-partner-types";
import {
  displayNameMatchesSaved,
  readSavedDisplayName,
  saveDisplayNameViaAuthMe,
  saveOfferConsent,
  saveProProfile,
  ensureOrganizationForDraft,
  verifyOnboardingComplete,
  type OnboardingSaveProgress,
} from "@/lib/onboarding-save";
import { storeCategoryChips } from "@/lib/store-categories";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import styles from "./auth.module.css";

type OnboardingFormProps = {
  returnTo: string | null;
  initialCity?: string | null;
  initialDisplayName?: string | null;
};

type RetryKind = "network" | "server" | "session_lost" | null;

const STORE_CATEGORY_CHIPS = storeCategoryChips();

export function OnboardingForm({
  returnTo,
  initialCity,
  initialDisplayName,
}: OnboardingFormProps) {
  const router = useRouter();
  const submitLock = useRef(false);
  const displayNameDirtyRef = useRef(false);
  const progressRef = useRef<OnboardingSaveProgress>({
    offerSaved: false,
    displayNameSaved: false,
    profileSaved: false,
  });

  const [partnerType, setPartnerType] = useState<PartnerTypeOption | "">("");
  const [city, setCity] = useState(initialCity?.trim() ?? "");
  const [representativeName, setRepresentativeName] = useState(initialDisplayName?.trim() ?? "");
  const [organizationName, setOrganizationName] = useState("");
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [allStages, setAllStages] = useState(false);
  const [storeCategories, setStoreCategories] = useState<string[]>([]);
  const [offerChecked, setOfferChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [readinessLoading, setReadinessLoading] = useState(true);
  const [error, setError] = useState("");
  const [readinessError, setReadinessError] = useState("");
  const [retryKind, setRetryKind] = useState<RetryKind>(null);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [offerRequirement, setOfferRequirement] = useState<ConsentRequirement | null>(null);
  const [offerKey, setOfferKey] = useState("");

  const legalBase = getLegalSiteUrl();

  const loadReadiness = useCallback(async () => {
    setReadinessLoading(true);
    setReadinessError("");
    setRetryKind(null);
    const result = await fetchReadinessSafe();
    if (!result.ok) {
      if (result.kind === "unauthorized") {
        setRetryKind("session_lost");
        setReadinessError("Сессия завершилась. Войдите снова.");
      } else if (result.kind === "network") {
        setRetryKind("network");
        setReadinessError("Не удалось связаться с сервером. Повторите проверку.");
      } else {
        setRetryKind("server");
        setReadinessError("Временная ошибка сервера. Повторите проверку.");
      }
      setReadinessLoading(false);
      return null;
    }
    const offer = result.data.missingConsents.find((c) => c.kind === "PUBLIC_OFFER_PRO") ?? null;
    const nextKey = offer ? consentRequirementKey(offer) : "";
    if (nextKey !== offerKey) {
      setOfferChecked(false);
      setOfferKey(nextKey);
    }
    if (!offer) {
      progressRef.current.offerSaved = true;
    }
    setOfferRequirement(offer);
    setReadinessLoading(false);
    return result.data;
  }, [offerKey]);

  useEffect(() => {
    void loadReadiness();
  }, [loadReadiness]);

  useEffect(() => {
    progressRef.current.profileSaved = false;
  }, [partnerType, city, allStages, selectedStages, storeCategories, representativeName, organizationName]);

  useEffect(() => {
    if (initialDisplayName?.trim()) {
      return;
    }
    void (async () => {
      try {
        const saved = await readSavedDisplayName();
        if (saved && !displayNameDirtyRef.current) {
          setRepresentativeName(saved);
          progressRef.current.displayNameSaved = true;
        }
      } catch {
        // ignore bootstrap read errors
      }
    })();
  }, [initialDisplayName]);

  function toggleStage(id: string) {
    setAllStages(false);
    setSelectedStages((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function toggleAllStages() {
    if (allStages) {
      setAllStages(false);
      setSelectedStages([]);
    } else {
      setAllStages(true);
      setSelectedStages(ONBOARDING_STAGES.map((s) => s.id));
    }
  }

  function toggleStoreCategory(value: string) {
    setStoreCategories((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  const runVerification = useCallback(async (): Promise<boolean> => {
    const verified = await verifyOnboardingComplete();
    if (verified.ok) {
      setAwaitingVerification(false);
      setRetryKind(null);
      setError("");
      router.replace(resolveDestinationAfterAuth(verified.readiness, returnTo));
      router.refresh();
      return true;
    }

    setAwaitingVerification(true);
    setError(verified.message);
    if (verified.kind === "unauthorized") {
      setRetryKind("session_lost");
    } else if (verified.kind === "network") {
      setRetryKind("network");
    } else if (verified.kind === "server") {
      setRetryKind("server");
    } else {
      setRetryKind(null);
      setAwaitingVerification(false);
    }
    return false;
  }, [returnTo, router]);

  async function handleRetryVerification() {
    if (submitLock.current || loading) return;
    submitLock.current = true;
    setLoading(true);
    setError("");
    try {
      await runVerification();
    } finally {
      setLoading(false);
      submitLock.current = false;
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitLock.current || loading) return;

    if (awaitingVerification) {
      await handleRetryVerification();
      return;
    }

    const trimmedCity = city.trim();
    if (!partnerType) {
      setError("Выберите тип партнёра.");
      return;
    }
    if (!trimmedCity) {
      setError("Укажите город работы.");
      return;
    }

    const repName = representativeName.trim();
    if (repName.length < 2 || repName === "Пользователь") {
      setError("Укажите имя представителя (минимум 2 символа, не «Пользователь»).");
      return;
    }

    if (partnerType === "MASTER") {
      if (!allStages && selectedStages.length === 0) {
        setError("Выберите хотя бы одну специализацию или «Все этапы».");
        return;
      }
    } else {
      if (organizationName.trim().length < 2) {
        setError("Укажите название организации (минимум 2 символа).");
        return;
      }
      if (storeCategories.length === 0) {
        setError("Выберите хотя бы одну категорию товаров.");
        return;
      }
    }

    const needsOffer = Boolean(offerRequirement?.legalDocumentId) && !progressRef.current.offerSaved;
    if (needsOffer && !offerChecked) {
      setError("Примите публичную оферту для партнёров.");
      return;
    }
    if (offerRequirement && !offerRequirement.legalDocumentId) {
      setError("Документ оферты временно недоступен. Повторите проверку.");
      return;
    }

    submitLock.current = true;
    setLoading(true);
    setError("");
    setRetryKind(null);

    const draft = {
      partnerType,
      city: trimmedCity,
      displayName: repName,
      organizationName: organizationName.trim(),
      allStages,
      selectedStages,
      storeCategories,
    };

    try {
      if (needsOffer && offerRequirement) {
        await saveOfferConsent(offerRequirement);
        progressRef.current.offerSaved = true;
        setOfferChecked(false);
      }

      const savedName = await readSavedDisplayName();
      if (!displayNameMatchesSaved(savedName, draft.displayName)) {
        await saveDisplayNameViaAuthMe(draft.displayName);
        const confirmed = await readSavedDisplayName();
        if (!displayNameMatchesSaved(confirmed, draft.displayName)) {
          throw new RemcardApiError(500, "Не удалось подтвердить имя представителя.", null);
        }
      }
      progressRef.current.displayNameSaved = true;

      if (!progressRef.current.profileSaved) {
        await saveProProfile(draft);
        await ensureOrganizationForDraft(draft);
        progressRef.current.profileSaved = true;
      }

      await runVerification();
    } catch (caught) {
      if (isDocumentVersionMismatch(caught)) {
        progressRef.current.offerSaved = false;
        setOfferChecked(false);
        void loadReadiness();
        setError(
          caught instanceof RemcardApiError
            ? caught.message
            : "Документ обновился. Ознакомьтесь с новой версией и примите снова.",
        );
        return;
      }
      if (caught instanceof RemcardApiError) {
        const code = (caught.body as { errorCode?: string } | null)?.errorCode;
        if (code === "PUBLIC_OFFER_PRO_REQUIRED") {
          progressRef.current.offerSaved = false;
          setError("Сначала примите публичную оферту.");
        } else if (caught.status === 401) {
          setRetryKind("session_lost");
          setError("Сессия завершилась. Войдите снова.");
        } else {
          setError(caught.message || "Не удалось завершить регистрацию.");
        }
      } else if (caught instanceof Error) {
        setError(caught.message);
      } else {
        setError("Не удалось завершить регистрацию.");
      }
      void loadReadiness();
    } finally {
      setLoading(false);
      submitLock.current = false;
    }
  }

  const repReady =
    representativeName.trim().length >= 2 && representativeName.trim() !== "Пользователь";
  const masterReady = repReady && (allStages || selectedStages.length > 0);
  const storeReady =
    repReady && organizationName.trim().length >= 2 && storeCategories.length > 0;
  const profileFieldsReady =
    partnerType === "MASTER" ? masterReady : partnerType ? storeReady : false;
  const offerReady =
    !offerRequirement ||
    progressRef.current.offerSaved ||
    (offerRequirement.legalDocumentId && offerChecked);
  const canSubmit =
    Boolean(partnerType) &&
    city.trim().length > 0 &&
    profileFieldsReady &&
    offerReady &&
    !readinessLoading &&
    retryKind !== "session_lost";

  const showSessionLost = retryKind === "session_lost";

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="onboarding-title">
        <span className={styles.eyebrow}>RemCard PROF</span>
        <h1 id="onboarding-title" className={styles.title}>
          Регистрация партнёра
        </h1>
        <p className={styles.lead}>
          Заполните профиль и примите оферту. Роль и доступ определяются на сервере.
        </p>

        {readinessError ? (
          <p className={styles.error} role="alert">
            {readinessError}
          </p>
        ) : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        {showSessionLost ? (
          <Link className={styles.botLink} href={buildSessionRecoveryLoginHref(returnTo)}>
            Войти снова
          </Link>
        ) : readinessError && (retryKind === "network" || retryKind === "server") ? (
          <Button type="button" onClick={() => void loadReadiness()} disabled={readinessLoading}>
            {readinessLoading ? "Проверяем…" : "Повторить проверку"}
          </Button>
        ) : awaitingVerification && (retryKind === "network" || retryKind === "server") ? (
          <Button type="button" onClick={() => void handleRetryVerification()} disabled={loading}>
            {loading ? "Проверяем…" : "Повторить проверку"}
          </Button>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)}>
            <div style={{ marginBottom: "var(--space-4)" }}>
              <p className={styles.fieldLabel}>Тип партнёра</p>
              <div className={styles.stageGrid}>
                {PARTNER_TYPE_OPTIONS.map((option) => (
                  <label key={option.value} className={styles.stageRow}>
                    <input
                      type="radio"
                      name="partnerType"
                      value={option.value}
                      checked={partnerType === option.value}
                      onChange={() => setPartnerType(option.value)}
                      disabled={loading}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      <br />
                      <span style={{ fontSize: "0.875rem", opacity: 0.85 }}>
                        {option.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "var(--space-4)" }}>
              <TextField
                label="Город работы"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                disabled={loading}
                required
              />
            </div>

            {partnerType ? (
              <div style={{ marginBottom: "var(--space-4)" }}>
                <TextField
                  label="Имя представителя"
                  value={representativeName}
                  onChange={(event) => {
                    displayNameDirtyRef.current = true;
                    setRepresentativeName(event.target.value);
                  }}
                  disabled={loading}
                  required
                  hint="Как к вам обращаться в кабинете и переписке. Можно изменить позже в профиле."
                />
              </div>
            ) : null}

            {partnerType === "MASTER" ? (
              <div style={{ marginBottom: "var(--space-4)" }}>
                <p className={styles.fieldLabel}>Специализации</p>
                <label className={styles.consentRow}>
                  <input
                    type="checkbox"
                    checked={allStages}
                    onChange={toggleAllStages}
                    disabled={loading}
                  />
                  <span>Все этапы строительства</span>
                </label>
                <div className={styles.stageGrid}>
                  {ONBOARDING_STAGES.map((stage) => (
                    <label key={stage.id} className={styles.stageRow}>
                      <input
                        type="checkbox"
                        checked={allStages || selectedStages.includes(stage.id)}
                        onChange={() => toggleStage(stage.id)}
                        disabled={loading || allStages}
                      />
                      <span>
                        {stage.icon} {stage.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {partnerType === "STORE" || partnerType === "COMPANY" ? (
              <>
                <div style={{ marginBottom: "var(--space-4)" }}>
                  <TextField
                    label={partnerType === "STORE" ? "Название магазина" : "Название компании"}
                    value={organizationName}
                    onChange={(event) => setOrganizationName(event.target.value)}
                    disabled={loading}
                    required
                    hint="Юридическое или коммерческое название организации — отдельно от имени представителя."
                  />
                </div>
                <div style={{ marginBottom: "var(--space-4)" }}>
                  <p className={styles.fieldLabel}>Категории товаров</p>
                  <div className={styles.stageGrid}>
                    {STORE_CATEGORY_CHIPS.map((cat) => (
                      <label key={cat.value} className={styles.stageRow}>
                        <input
                          type="checkbox"
                          checked={storeCategories.includes(cat.value)}
                          onChange={() => toggleStoreCategory(cat.value)}
                          disabled={loading}
                        />
                        <span>{cat.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            {offerRequirement?.legalDocumentId && !progressRef.current.offerSaved ? (
              <fieldset className={styles.consentBlock} disabled={loading}>
                <label className={styles.consentRow}>
                  <input
                    type="checkbox"
                    checked={offerChecked}
                    onChange={(event) => setOfferChecked(event.target.checked)}
                  />
                  <span>
                    Я принимаю{" "}
                    <a
                      href={`${legalBase}/legal/public-offer-pro`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      публичную оферту для партнёров
                    </a>
                    {offerRequirement.version ? ` (версия ${offerRequirement.version})` : null}
                    {offerRequirement.status === "stale" ? " — документ обновлён" : null}
                  </span>
                </label>
              </fieldset>
            ) : offerRequirement && !offerRequirement.legalDocumentId ? (
              <p className={styles.error} role="alert">
                Документ оферты временно недоступен.{" "}
                <button type="button" onClick={() => void loadReadiness()} disabled={readinessLoading}>
                  Повторить проверку
                </button>
              </p>
            ) : null}

            <Button type="submit" disabled={loading || !canSubmit}>
              {loading
                ? awaitingVerification
                  ? "Проверяем…"
                  : "Сохраняем…"
                : awaitingVerification
                  ? "Повторить проверку"
                  : "Продолжить"}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
