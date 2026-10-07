"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthMe, remcardFetch, RemcardApiError } from "@/lib/api-client";
import type { CabinetReadiness, ConsentRequirement } from "@/lib/cabinet-readiness";
import {
  isDocumentVersionMismatch,
  recordConsentRequirements,
} from "@/lib/auth-consent";
import { consentRequirementKey, fetchReadinessSafe } from "@/lib/auth-session";
import { resolveDestinationAfterAuth } from "@/lib/auth-flow";
import { getLegalSiteUrl } from "@/lib/auth-config";
import { ONBOARDING_STAGES } from "@/lib/onboarding-stages";
import {
  PARTNER_TYPE_OPTIONS,
  type PartnerTypeOption,
} from "@/lib/onboarding-partner-types";
import { storeCategoryChips } from "@/lib/store-categories";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import styles from "./auth.module.css";

type OnboardingFormProps = {
  returnTo: string | null;
  initialCity?: string | null;
};

const STORE_CATEGORY_CHIPS = storeCategoryChips();

export function OnboardingForm({ returnTo, initialCity }: OnboardingFormProps) {
  const router = useRouter();
  const submitLock = useRef(false);
  const [partnerType, setPartnerType] = useState<PartnerTypeOption | "">("");
  const [city, setCity] = useState(initialCity?.trim() ?? "");
  const [displayName, setDisplayName] = useState("");
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [allStages, setAllStages] = useState(false);
  const [storeCategories, setStoreCategories] = useState<string[]>([]);
  const [offerChecked, setOfferChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [readinessLoading, setReadinessLoading] = useState(true);
  const [error, setError] = useState("");
  const [readinessError, setReadinessError] = useState("");
  const [offerRequirement, setOfferRequirement] = useState<ConsentRequirement | null>(null);
  const [offerKey, setOfferKey] = useState("");

  const legalBase = getLegalSiteUrl();

  const loadReadiness = useCallback(async () => {
    setReadinessLoading(true);
    setReadinessError("");
    const result = await fetchReadinessSafe();
    if (!result.ok) {
      setReadinessError(
        result.kind === "network"
          ? "Не удалось связаться с сервером. Повторите проверку."
          : "Не удалось проверить статус. Повторите проверку.",
      );
      setReadinessLoading(false);
      return null;
    }
    const offer = result.data.missingConsents.find((c) => c.kind === "PUBLIC_OFFER_PRO") ?? null;
    const nextKey = offer ? consentRequirementKey(offer) : "";
    if (nextKey !== offerKey) {
      setOfferChecked(false);
      setOfferKey(nextKey);
    }
    setOfferRequirement(offer);
    setReadinessLoading(false);
    return result.data;
  }, [offerKey]);

  useEffect(() => {
    void loadReadiness();
  }, [loadReadiness]);

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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitLock.current || loading) return;

    const trimmedCity = city.trim();
    if (!partnerType) {
      setError("Выберите тип партнёра.");
      return;
    }
    if (!trimmedCity) {
      setError("Укажите город работы.");
      return;
    }

    if (partnerType === "MASTER") {
      if (!allStages && selectedStages.length === 0) {
        setError("Выберите хотя бы одну специализацию или «Все этапы».");
        return;
      }
    } else {
      const trimmedName = displayName.trim();
      if (trimmedName.length < 2) {
        setError("Укажите название магазина или компании (минимум 2 символа).");
        return;
      }
      if (storeCategories.length === 0) {
        setError("Выберите хотя бы одну категорию товаров.");
        return;
      }
    }

    if (offerRequirement) {
      if (!offerRequirement.legalDocumentId) {
        setError("Документ оферты временно недоступен. Повторите проверку.");
        return;
      }
      if (!offerChecked) {
        setError("Примите публичную оферту для партнёров.");
        return;
      }
    }

    submitLock.current = true;
    setLoading(true);
    setError("");

    try {
      if (offerRequirement?.legalDocumentId) {
        await recordConsentRequirements(
          [offerRequirement],
          new Set([consentRequirementKey(offerRequirement)]),
        );
      }

      const body: Record<string, unknown> = {
        city: trimmedCity,
        partnerType,
      };

      if (partnerType === "MASTER") {
        body.specializations = allStages ? ONBOARDING_STAGES.map((s) => s.id) : selectedStages;
      } else {
        body.displayName = displayName.trim();
        body.storeCategories = storeCategories;
      }

      await remcardFetch("/api/pro/profile", {
        method: "PATCH",
        body,
      });

      const me = await getAuthMe();
      const readiness = await loadReadiness();
      if (!readiness || !me.user) {
        setError("Профиль сохранён, но статус не подтверждён. Повторите проверку.");
        return;
      }
      if (readiness.needsProfileOnboarding) {
        setError("Завершите оставшиеся поля профиля.");
        return;
      }
      if (!readiness.canAccessCabinet && me.user.role !== "PRO") {
        setError("Профиль сохранён, но доступ ещё не открыт. Повторите проверку.");
        return;
      }

      router.replace(resolveDestinationAfterAuth(readiness, returnTo));
      router.refresh();
    } catch (caught) {
      if (isDocumentVersionMismatch(caught)) {
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
          setError("Сначала примите публичную оферту.");
        } else if (caught.status === 401) {
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

  const masterReady = allStages || selectedStages.length > 0;
  const storeReady =
    displayName.trim().length >= 2 && storeCategories.length > 0;
  const profileFieldsReady =
    partnerType === "MASTER" ? masterReady : partnerType ? storeReady : false;
  const offerReady = !offerRequirement || (offerRequirement.legalDocumentId && offerChecked);
  const canSubmit =
    Boolean(partnerType) &&
    city.trim().length > 0 &&
    profileFieldsReady &&
    offerReady &&
    !readinessLoading;

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

        {readinessError ? (
          <Button type="button" onClick={() => void loadReadiness()} disabled={readinessLoading}>
            {readinessLoading ? "Проверяем…" : "Повторить проверку"}
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
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    disabled={loading}
                    required
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

            {offerRequirement?.legalDocumentId ? (
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
            ) : offerRequirement ? (
              <p className={styles.error} role="alert">
                Документ оферты временно недоступен.{" "}
                <button type="button" onClick={() => void loadReadiness()} disabled={readinessLoading}>
                  Повторить проверку
                </button>
              </p>
            ) : null}

            <Button type="submit" disabled={loading || !canSubmit}>
              {loading ? "Сохраняем…" : "Продолжить"}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
