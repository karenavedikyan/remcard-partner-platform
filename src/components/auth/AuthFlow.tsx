"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import type { CabinetReadiness } from "@/lib/cabinet-readiness";
import { loginConsentRequirements } from "@/lib/cabinet-readiness";
import {
  isDocumentVersionMismatch,
  recordConsentRequirements,
} from "@/lib/auth-consent";
import {
  fetchAuthMeSafe,
  fetchReadinessSafe,
  type SessionFetchKind,
} from "@/lib/auth-session";
import {
  mapAccessDeniedMessage,
  mapPostLoginBlocked,
  mapVerifyCodeError,
  resolveAuthFlowFromReadiness,
  resolveDestinationAfterAuth,
  sessionRetryMessage,
  type AuthFlowStep,
} from "@/lib/auth-flow";
import { getMaxBotLoginUrl, getTelegramBotLoginUrl } from "@/lib/auth-config";
import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "./OtpInput";
import { ConsentStep } from "./ConsentStep";
import styles from "./auth.module.css";

type AuthFlowProps = {
  returnTo?: string | null;
  reason?: string;
  /** Legacy hint only; session is always checked on mount. */
  initialStep?: AuthFlowStep;
};

type RetryKind = "network" | "server" | "session_lost";

const REASON_MESSAGES: Record<string, string> = {
  session: "Сессия завершилась. Войдите снова.",
  blocked: "Аккаунт заблокирован.",
  role: "Для доступа нужен профиль партнёра.",
};

export function AuthFlow({ returnTo, reason }: AuthFlowProps) {
  const router = useRouter();
  const submitLock = useRef(false);
  const codeConsumedRef = useRef(false);
  const [step, setStep] = useState<AuthFlowStep>("checking_session");
  const [code, setCode] = useState("");
  const [readiness, setReadiness] = useState<CabinetReadiness | null>(null);
  const [error, setError] = useState("");
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [retryKind, setRetryKind] = useState<RetryKind>("network");
  const [consentResetToken, setConsentResetToken] = useState(0);

  const telegramBotUrl = getTelegramBotLoginUrl();
  const maxBotUrl = getMaxBotLoginUrl();

  const finishFlow = useCallback(
    (r: CabinetReadiness) => {
      const destination = resolveDestinationAfterAuth(r, returnTo ?? null);
      if (destination.startsWith("/onboarding")) {
        router.replace(destination);
      } else {
        router.replace(destination);
      }
      router.refresh();
    },
    [returnTo, router],
  );

  const applyReadiness = useCallback(
    (r: CabinetReadiness) => {
      setReadiness(r);
      const next = resolveAuthFlowFromReadiness(r);
      if (next === "complete") {
        finishFlow(r);
        return;
      }
      if (next === "onboarding") {
        finishFlow(r);
        return;
      }
      if (next === "access_denied") {
        setError(mapAccessDeniedMessage(r));
        setStep("access_denied");
        return;
      }
      setStep("consents");
    },
    [finishFlow],
  );

  const handleSessionFailure = useCallback(
    (kind: SessionFetchKind, status?: number) => {
      if (kind === "unauthorized") {
        if (codeConsumedRef.current) {
          setRetryKind("session_lost");
          setError(sessionRetryMessage("session_lost"));
          setStep("session_retry");
          return;
        }
        setStep("code");
        return;
      }
      if (kind === "blocked") {
        setError("Аккаунт заблокирован.");
        setStep("blocked");
        return;
      }
      if (status === 401) {
        setRetryKind("session_lost");
        setError(sessionRetryMessage("session_lost"));
        setStep("session_retry");
        return;
      }
      setRetryKind(kind === "network" ? "network" : "server");
      setError(sessionRetryMessage(kind === "network" ? "network" : "server"));
      setStep("session_retry");
    },
    [],
  );

  const runSessionCheck = useCallback(async () => {
    setError("");
    const meResult = await fetchAuthMeSafe();
    if (!meResult.ok) {
      handleSessionFailure(meResult.kind, meResult.status);
      setBooting(false);
      return;
    }
    const blocked = mapPostLoginBlocked(meResult.data.user ?? null);
    if (blocked) {
      setError(blocked);
      setStep("blocked");
      setBooting(false);
      return;
    }

    setStep("loading_readiness");
    const readinessResult = await fetchReadinessSafe();
    if (!readinessResult.ok) {
      handleSessionFailure(readinessResult.kind, readinessResult.status);
      setBooting(false);
      return;
    }
    applyReadiness(readinessResult.data);
    setBooting(false);
  }, [applyReadiness, handleSessionFailure]);

  const runSessionCheckRef = useRef(runSessionCheck);
  runSessionCheckRef.current = runSessionCheck;

  useEffect(() => {
    void runSessionCheckRef.current();
  }, []);

  const retrySessionCheck = useCallback(async () => {
    if (submitLock.current || loading || booting) return;
    submitLock.current = true;
    setLoading(true);
    setError("");
    try {
      await runSessionCheck();
    } finally {
      setLoading(false);
      submitLock.current = false;
    }
  }, [booting, loading, runSessionCheck]);

  const reloadReadiness = useCallback(async (): Promise<CabinetReadiness | null> => {
    const result = await fetchReadinessSafe();
    if (!result.ok) {
      handleSessionFailure(result.kind, result.status);
      return null;
    }
    setReadiness(result.data);
    return result.data;
  }, [handleSessionFailure]);

  const submitCode = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (submitLock.current || loading) return;
      if (code.length !== 6) {
        setError("Введите 6-значный код из бота.");
        return;
      }

      submitLock.current = true;
      setLoading(true);
      setError("");

      try {
        await remcardFetch("/api/auth/verify-code", {
          method: "POST",
          body: { code },
        });
        codeConsumedRef.current = true;
        setCode("");

        const meResult = await fetchAuthMeSafe();
        if (!meResult.ok) {
          handleSessionFailure(meResult.kind, meResult.status);
          return;
        }
        const blocked = mapPostLoginBlocked(meResult.data.user ?? null);
        if (blocked) {
          setError(blocked);
          setStep("blocked");
          return;
        }

        setStep("loading_readiness");
        const readinessResult = await fetchReadinessSafe();
        if (!readinessResult.ok) {
          handleSessionFailure(readinessResult.kind, readinessResult.status);
          return;
        }
        applyReadiness(readinessResult.data);
      } catch (caught) {
        if (caught instanceof RemcardApiError) {
          setError(mapVerifyCodeError(caught.status, caught.body));
        } else {
          setError("Не удалось выполнить вход.");
        }
      } finally {
        setLoading(false);
        submitLock.current = false;
      }
    },
    [applyReadiness, code, handleSessionFailure, loading],
  );

  const submitConsents = useCallback(
    async (acceptedKeys: Set<string>) => {
      if (submitLock.current || loading) return;
      submitLock.current = true;
      setLoading(true);
      setError("");

      try {
        const r = readiness ?? (await reloadReadiness());
        if (!r) {
          return;
        }
        const pending = loginConsentRequirements(r);
        if (pending.length === 0) {
          applyReadiness(r);
          return;
        }

        const submittable = pending.filter((req) => req.legalDocumentId);
        if (submittable.length < pending.length) {
          setError("Документ временно недоступен. Повторите проверку.");
          return;
        }

        await recordConsentRequirements(submittable, acceptedKeys);
        const refreshed = await reloadReadiness();
        if (!refreshed) {
          return;
        }

        const stillPending = loginConsentRequirements(refreshed);
        if (stillPending.length > 0) {
          setConsentResetToken((value) => value + 1);
          setStep("consents");
          return;
        }

        applyReadiness(refreshed);
      } catch (caught) {
        if (isDocumentVersionMismatch(caught)) {
          setError(
            caught instanceof RemcardApiError
              ? caught.message
              : "Документ обновился. Ознакомьтесь с новой версией и примите снова.",
          );
          setConsentResetToken((value) => value + 1);
          void reloadReadiness();
          return;
        }
        if (caught instanceof RemcardApiError && caught.status === 401) {
          setRetryKind("session_lost");
          setError(sessionRetryMessage("session_lost"));
          setStep("session_retry");
          return;
        }
        if (caught instanceof RemcardApiError) {
          setError(caught.message);
        } else if (caught instanceof Error) {
          setError(caught.message);
        } else {
          setError("Не удалось сохранить согласия.");
        }
        void reloadReadiness();
      } finally {
        setLoading(false);
        submitLock.current = false;
      }
    },
    [applyReadiness, loading, readiness, reloadReadiness],
  );

  const reasonMessage = reason ? REASON_MESSAGES[reason] : null;
  const pendingConsents = readiness ? loginConsentRequirements(readiness) : [];

  if (booting || step === "checking_session" || step === "loading_readiness") {
    return (
      <main className={styles.centerPage}>
        <section className={styles.card}>
          <p className={styles.lead}>
            {step === "checking_session" ? "Проверяем сессию…" : "Проверяем статус…"}
          </p>
        </section>
      </main>
    );
  }

  if (step === "blocked") {
    return (
      <main className={styles.centerPage}>
        <section className={styles.card}>
          <p className={styles.error} role="alert">
            {error || "Аккаунт заблокирован."}
          </p>
        </section>
      </main>
    );
  }

  if (step === "session_retry") {
    return (
      <main className={styles.centerPage}>
        <section className={styles.card}>
          <p className={styles.error} role="alert">
            {error}
          </p>
          {retryKind === "session_lost" ? (
            <Button type="button" onClick={() => setStep("code")} disabled={loading}>
              Войти снова
            </Button>
          ) : (
            <Button type="button" onClick={() => void retrySessionCheck()} disabled={loading}>
              {loading ? "Проверяем…" : "Повторить проверку"}
            </Button>
          )}
        </section>
      </main>
    );
  }

  if (step === "consents") {
    return (
      <ConsentStep
        key={consentResetToken}
        requirements={pendingConsents}
        error={error}
        loading={loading}
        onSubmit={(accepted) => void submitConsents(accepted)}
        onRetryReadiness={() => void retrySessionCheck()}
      />
    );
  }

  if (step === "access_denied") {
    return (
      <main className={styles.centerPage}>
        <section className={styles.card}>
          <BrandMark />
          <span className={styles.eyebrow}>RemCard PROF</span>
          <h1 className={styles.title}>Доступ ограничен</h1>
          <p className={styles.error} role="alert">
            {error || mapAccessDeniedMessage(readiness ?? {
              nextStep: "ready",
              missingConsents: [],
              needsProfileOnboarding: false,
              canAccessCabinet: false,
              isEmployee: false,
              isAdmin: false,
            })}
          </p>
          <div className={styles.actions}>
            <Button type="button" onClick={() => void retrySessionCheck()} disabled={loading}>
              {loading ? "Проверяем…" : "Повторить проверку"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                try {
                  await remcardFetch("/api/auth/logout", { method: "POST" });
                } catch {
                  // ignore logout errors; user can still re-enter code
                }
                codeConsumedRef.current = false;
                setReadiness(null);
                setError("");
                setStep("code");
              }}
              disabled={loading}
            >
              Выйти
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.entryHeader}>
        <BrandMark />
      </header>

      <div className={styles.entryLayout}>
        <section className={styles.mobileIntro} aria-labelledby="mobile-intro-title">
          <h1 id="mobile-intro-title" className={styles.mobileIntroTitle}>
            Ваши рекомендации могут приносить доход
          </h1>
          <p className={styles.mobileIntroLead}>
            Рекомендуйте партнёров, получайте вознаграждение за покупки и привлекайте клиентов по
            рекомендациям.
          </p>
        </section>

        <section className={styles.entryStory} aria-labelledby="story-title">
          <span className={styles.eyebrow}>Партнёрская программа RemCard PROF</span>
          <h1 id="story-title" className={styles.storyTitle}>
            Ваши рекомендации могут приносить доход
          </h1>
          <p className={styles.storyLead}>
            Рекомендуйте клиентам партнёров и получайте вознаграждение за покупки на согласованных
            условиях. Принимайте рекомендации других участников и привлекайте клиентов в свой бизнес.
          </p>
          <ul className={styles.benefitList}>
            <li className={styles.benefitItem}>
              <strong>Договаривайтесь напрямую</strong>
              <p>Выбирайте партнёров и согласовывайте условия сотрудничества.</p>
            </li>
            <li className={styles.benefitItem}>
              <strong>Давайте клиентам больше пользы</strong>
              <p>Оформляйте рекомендации со скидкой по условиям партнёрства.</p>
            </li>
            <li className={styles.benefitItem}>
              <strong>Держите расчёты под контролем</strong>
              <p>Смотрите покупки, начисления и кто кому должен.</p>
            </li>
          </ul>
          <p className={styles.storyClosing}>
            Начните с профиля. Затем выберите партнёра и согласуйте условия.
          </p>
        </section>

        <section className={styles.entryForm} aria-labelledby="login-title">
          <h1 id="login-title" className={styles.title}>
            Присоединяйтесь к RemCard PROF
          </h1>
          <p className={styles.lead}>
            Впервые здесь? Начните регистрацию. Уже есть аккаунт? Войдите тем же способом, которым
            пользовались раньше.
          </p>

          {reasonMessage ? <p className={styles.error}>{reasonMessage}</p> : null}
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <span className={styles.codeStepLabel}>Шаг 1. Получите код</span>
          <div className={styles.botLinks}>
            <a
              className={`${styles.botLink} ${styles.botLinkPrimary}`}
              href={telegramBotUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Получить код в Telegram
            </a>
            <a className={styles.botLink} href={maxBotUrl} target="_blank" rel="noopener noreferrer">
              Получить код в MAX
            </a>
          </div>
          <p className={styles.botStepHint}>
            Откроется бот. Получите код и вернитесь на эту страницу.
          </p>

          <div className={styles.codeStep}>
            <span className={styles.codeStepLabel}>Шаг 2. Введите код</span>
            <form onSubmit={(event) => void submitCode(event)}>
              <OtpInput
                value={code}
                onChange={setCode}
                disabled={loading}
                aria-label="Код из сообщения"
              />
              <Button type="submit" disabled={loading || code.length !== 6}>
                {loading ? "Проверяем…" : "Продолжить"}
              </Button>
            </form>
          </div>

          <p className={styles.notice}>Нет кода? Отправьте боту команду /login.</p>
        </section>
      </div>
    </main>
  );
}
