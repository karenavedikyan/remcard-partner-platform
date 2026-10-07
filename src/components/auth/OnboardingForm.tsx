"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthMe, remcardFetch, RemcardApiError } from "@/lib/api-client";
import type { CabinetReadiness, ConsentRequirement } from "@/lib/cabinet-readiness";
import { recordConsentRequirements } from "@/lib/auth-consent";
import { resolveDestinationAfterAuth } from "@/lib/auth-flow";
import { getLegalSiteUrl } from "@/lib/auth-config";
import { ONBOARDING_STAGES } from "@/lib/onboarding-stages";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import styles from "./auth.module.css";

type OnboardingFormProps = {
  returnTo: string | null;
  initialCity?: string | null;
};

export function OnboardingForm({ returnTo, initialCity }: OnboardingFormProps) {
  const router = useRouter();
  const submitLock = useRef(false);
  const [city, setCity] = useState(initialCity?.trim() ?? "");
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [allStages, setAllStages] = useState(false);
  const [acceptedOffer, setAcceptedOffer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offerRequirement, setOfferRequirement] = useState<ConsentRequirement | null>(null);

  const legalBase = getLegalSiteUrl();

  const loadReadiness = useCallback(async () => {
    try {
      const data = await remcardFetch<CabinetReadiness>("/api/account/cabinet-readiness");
      const offer = data.missingConsents.find((c) => c.kind === "PUBLIC_OFFER_PRO") ?? null;
      setOfferRequirement(offer);
      if (!offer) {
        setAcceptedOffer(true);
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    void loadReadiness();
  }, [loadReadiness]);

  function toggleStage(id: string) {
    setAllStages(false);
    setSelectedStages((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function toggleAll() {
    if (allStages) {
      setAllStages(false);
      setSelectedStages([]);
    } else {
      setAllStages(true);
      setSelectedStages(ONBOARDING_STAGES.map((s) => s.id));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitLock.current || loading) return;

    const trimmedCity = city.trim();
    if (!trimmedCity) {
      setError("Укажите город работы.");
      return;
    }
    if (!allStages && selectedStages.length === 0) {
      setError("Выберите хотя бы одну специализацию или «Все этапы».");
      return;
    }
    if (offerRequirement && !acceptedOffer) {
      setError("Примите публичную оферту для партнёров.");
      return;
    }

    submitLock.current = true;
    setLoading(true);
    setError("");

    try {
      if (offerRequirement) {
        await recordConsentRequirements([offerRequirement], new Set(["PUBLIC_OFFER_PRO"]));
      }

      await remcardFetch("/api/pro/profile", {
        method: "PATCH",
        body: {
          city: trimmedCity,
          specializations: allStages ? ["all"] : selectedStages,
        },
      });

      const me = await getAuthMe();
      const readiness = await loadReadiness();
      if (!readiness || !me.user) {
        setError("Профиль сохранён, но статус не подтверждён. Обновите страницу.");
        return;
      }
      if (readiness.needsProfileOnboarding || me.user.role !== "PRO") {
        setError("Завершите оставшиеся поля профиля.");
        return;
      }

      router.replace(resolveDestinationAfterAuth(readiness, returnTo));
      router.refresh();
    } catch (caught) {
      if (caught instanceof RemcardApiError) {
        const code = (caught.body as { errorCode?: string } | null)?.errorCode;
        if (code === "PUBLIC_OFFER_PRO_REQUIRED") {
          setError("Сначала примите публичную оферту.");
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

  const canSubmit =
    city.trim().length > 0 &&
    (allStages || selectedStages.length > 0) &&
    (!offerRequirement || acceptedOffer);

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

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <form onSubmit={(event) => void handleSubmit(event)}>
          <div style={{ marginBottom: "var(--space-4)" }}>
            <TextField
              label="Город работы"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div style={{ marginBottom: "var(--space-4)" }}>
            <p className={styles.fieldLabel}>Специализации</p>
            <label className={styles.consentRow}>
              <input
                type="checkbox"
                checked={allStages}
                onChange={toggleAll}
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

          {offerRequirement ? (
            <fieldset className={styles.consentBlock} disabled={loading}>
              <label className={styles.consentRow}>
                <input
                  type="checkbox"
                  checked={acceptedOffer}
                  onChange={(event) => setAcceptedOffer(event.target.checked)}
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
                </span>
              </label>
            </fieldset>
          ) : null}

          <Button type="submit" disabled={loading || !canSubmit}>
            {loading ? "Сохраняем…" : "Продолжить"}
          </Button>
        </form>
      </section>
    </main>
  );
}
