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
      <main className={styles.page}>
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
      <main className={styles.page}>
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
      <main className={styles.page}>
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
      <main className={styles.page}>
        <section className={styles.card}>
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
      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.brandBlock}>
          <div className={styles.logoMark} aria-hidden>
            R
          </div>
          <div>
            <div className={styles.brandTitle}>
              rem<span>card</span>.
            </div>
            <div className={styles.brandSubtitle}>для партнёров</div>
          </div>
        </div>

        <span className={styles.eyebrow}>Вход в кабинет</span>
        <h1 id="login-title" className={styles.title}>
          Войти в RemCard
        </h1>
        <p className={styles.lead}>
          Получите одноразовый код в Telegram или MAX и введите его здесь. Используется тот же
          аккаунт, что и на основном сайте RemCard.
        </p>

        {reasonMessage ? <p className={styles.error}>{reasonMessage}</p> : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

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

        <div className={styles.orDivider} aria-hidden>
          или
        </div>

        <form onSubmit={(event) => void submitCode(event)}>
          <OtpInput
            value={code}
            onChange={setCode}
            disabled={loading}
            aria-label="Шестизначный код из Telegram или MAX"
          />
          <Button type="submit" disabled={loading || code.length !== 6}>
            {loading ? "Проверяем…" : "Продолжить"}
          </Button>
        </form>

        <p className={styles.notice}>
          Код действует ограниченное время и используется один раз. Если код не пришёл
          автоматически, отправьте боту команду /login.
        </p>
      </section>
    </main>
  );
}
