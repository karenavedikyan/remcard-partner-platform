"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { getLegalSiteUrl } from "@/lib/auth-config";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import styles from "./auth.module.css";

type OnboardingFormProps = {
  returnTo: string | null;
};

export function OnboardingForm({ returnTo }: OnboardingFormProps) {
  const router = useRouter();
  const [city, setCity] = useState("Краснодар");
  const [acceptedOffer, setAcceptedOffer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const legalBase = getLegalSiteUrl();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!acceptedOffer) {
      setError("Примите публичную оферту для партнёров.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await remcardFetch("/api/account/consent", {
        method: "POST",
        body: { kind: "PUBLIC_OFFER_PRO" },
      });
      await remcardFetch("/api/pro/profile", {
        method: "PATCH",
        body: {
          city: city.trim() || "Краснодар",
          specializations: ["all"],
        },
      });
      router.replace(returnTo ?? "/");
      router.refresh();
    } catch (caught) {
      if (caught instanceof RemcardApiError) {
        const code = (caught.body as { errorCode?: string } | null)?.errorCode;
        if (code === "PUBLIC_OFFER_PRO_REQUIRED") {
          setError("Сначала примите публичную оферту.");
        } else {
          setError(caught.message || "Не удалось завершить регистрацию.");
        }
      } else {
        setError("Не удалось завершить регистрацию.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="onboarding-title">
        <span className={styles.eyebrow}>RemCard PROF</span>
        <h1 id="onboarding-title" className={styles.title}>
          Регистрация партнёра
        </h1>
        <p className={styles.lead}>
          Заполните минимальные данные профиля и примите оферту. Роль и доступ определяются на
          сервере — мы не назначаем права автоматически.
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
            />
          </div>

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
              </span>
            </label>
          </fieldset>

          <Button type="submit" disabled={loading || !acceptedOffer}>
            {loading ? "Сохраняем…" : "Продолжить"}
          </Button>
        </form>
      </section>
    </main>
  );
}
