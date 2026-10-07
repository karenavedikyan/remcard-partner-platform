"use client";

import { FormEvent, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { RemcardApiError, getAuthMe, remcardFetch } from "@/lib/api-client";
import {
  EMPTY_LOGIN_CONSENTS,
  recordRequiredLoginConsents,
  validateRequiredLoginConsents,
  type RequiredLoginConsents,
} from "@/lib/auth-consent";
import { mapVerifyCodeError, resolvePostLoginPath } from "@/lib/auth-flow";
import { getLegalSiteUrl, getTelegramBotLoginUrl } from "@/lib/auth-config";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "./OtpInput";
import styles from "./auth.module.css";

type VerifyCodeResponse = {
  user?: {
    id: string;
    role?: string;
  };
};

type LoginFormProps = {
  returnTo?: string | null;
  reason?: string;
};

const REASON_MESSAGES: Record<string, string> = {
  session: "Сессия завершилась. Войдите снова.",
  blocked: "Аккаунт заблокирован.",
  role: "Для доступа нужен профиль партнёра.",
};

export function LoginForm({ returnTo, reason }: LoginFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [consents, setConsents] = useState<RequiredLoginConsents>(EMPTY_LOGIN_CONSENTS);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const legalBase = getLegalSiteUrl();
  const botUrl = getTelegramBotLoginUrl();

  const submit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (loading) {
        return;
      }

      const consentError = validateRequiredLoginConsents(consents);
      if (consentError) {
        setError(consentError);
        return;
      }
      if (code.length !== 6) {
        setError("Введите 6-значный код из бота.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        await remcardFetch<VerifyCodeResponse>("/api/auth/verify-code", {
          method: "POST",
          body: { code },
        });

        const me = await getAuthMe();
        if (!me.user) {
          setError("Сессия не подтверждена. Повторите вход.");
          return;
        }

        await recordRequiredLoginConsents(async (kind) => {
          await remcardFetch("/api/account/consent", {
            method: "POST",
            body: { kind },
          });
        });

        const destination = resolvePostLoginPath(me.user, returnTo ?? null);
        router.replace(destination);
        router.refresh();
      } catch (caught) {
        if (caught instanceof RemcardApiError) {
          setError(mapVerifyCodeError(caught.status, caught.body));
        } else {
          setError("Не удалось выполнить вход.");
        }
      } finally {
        setLoading(false);
      }
    },
    [code, consents, loading, returnTo, router],
  );

  const reasonMessage = reason ? REASON_MESSAGES[reason] : null;

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="login-title">
        <span className={styles.eyebrow}>RemCard PROF</span>
        <h1 id="login-title" className={styles.title}>
          Войти в RemCard
        </h1>
        <p className={styles.lead}>
          Получите одноразовый код в Telegram-боте и введите его здесь. Используется тот же аккаунт,
          что и на основном сайте RemCard.
        </p>

        {reasonMessage ? <p className={styles.error}>{reasonMessage}</p> : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <a className={styles.botLink} href={botUrl} target="_blank" rel="noopener noreferrer">
          Получить код в Telegram
        </a>

        <form onSubmit={(event) => void submit(event)}>
          <OtpInput value={code} onChange={setCode} disabled={loading} />

          <fieldset className={styles.consentBlock} disabled={loading}>
            <legend className="sr-only">Обязательные согласия</legend>
            <label className={styles.consentRow}>
              <input
                type="checkbox"
                checked={consents.personalData}
                onChange={(event) =>
                  setConsents((prev) => ({ ...prev, personalData: event.target.checked }))
                }
              />
              <span>
                Я даю согласие на{" "}
                <a href={`${legalBase}/privacy`} target="_blank" rel="noopener noreferrer">
                  обработку персональных данных
                </a>
              </span>
            </label>
            <label className={styles.consentRow}>
              <input
                type="checkbox"
                checked={consents.terms}
                onChange={(event) =>
                  setConsents((prev) => ({ ...prev, terms: event.target.checked }))
                }
              />
              <span>
                Я принимаю{" "}
                <a href={`${legalBase}/terms`} target="_blank" rel="noopener noreferrer">
                  пользовательское соглашение
                </a>
              </span>
            </label>
          </fieldset>

          <Button type="submit" disabled={loading || code.length !== 6}>
            {loading ? "Проверяем…" : "Войти"}
          </Button>
        </form>

        <p className={styles.notice}>
          Код действует ограниченное время и используется один раз. Мы не сохраняем код на этом
          устройстве.
        </p>
      </section>
    </main>
  );
}
