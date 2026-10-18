"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import type { CabinetReadiness } from "@/lib/cabinet-readiness";
import {
  hasPendingRegistrationConsents,
  loginConsentRequirements,
  registrationConsentRequirements,
} from "@/lib/cabinet-readiness";
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
  messengerLoginUrl,
  resolveAuthFlowFromReadiness,
  resolveDestinationAfterAuth,
  sanitizeReturnTo,
  sessionRetryMessage,
  type AuthFlowStep,
  type AuthLoginProvider,
} from "@/lib/auth-flow";
import { getMaxBotLoginUrl, getTelegramBotLoginUrl } from "@/lib/auth-config";
import { BrandMark } from "@/components/layout/BrandMark";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "./OtpInput";
import { ConsentStep } from "./ConsentStep";
import styles from "./auth.module.css";

type AuthFlowProps = {
  returnTo?: string | null;
  reason?: string;
  /** Legacy hint only; session is always checked on mount. */
  initialStep?: AuthFlowStep;
  /** Agent registration via /join uses finish step instead of legacy onboarding. */
  registrationAgentJoin?: boolean;
  layout?: "full" | "embedded";
  onAuthenticated?: (userId: string) => void;
};

type RetryKind = "network" | "server" | "session_lost";

const REASON_MESSAGES: Record<string, string> = {
  session: "Сессия завершилась. Войдите снова.",
  blocked: "Аккаунт заблокирован.",
  role: "Для доступа нужен профиль партнёра.",
};

function openMessengerForLogin(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function AuthFlow({
  returnTo,
  reason,
  registrationAgentJoin,
  layout = "full",
  onAuthenticated,
}: AuthFlowProps) {
  const router = useRouter();
  const submitLock = useRef(false);
  const codeConsumedRef = useRef(false);
  const flowActiveRef = useRef(true);
  const [step, setStep] = useState<AuthFlowStep>("checking_session");
  const [provider, setProvider] = useState<AuthLoginProvider>("MAX");
  const [code, setCode] = useState("");
  const [readiness, setReadiness] = useState<CabinetReadiness | null>(null);
  const [error, setError] = useState("");
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [retryKind, setRetryKind] = useState<RetryKind>("network");
  const [consentResetToken, setConsentResetToken] = useState(0);
  const [resendStatus, setResendStatus] = useState("");

  const telegramBotUrl = getTelegramBotLoginUrl();
  const maxBotUrl = getMaxBotLoginUrl();

  const finishFlow = useCallback(
    (r: CabinetReadiness) => {
      if (!flowActiveRef.current) return;
      const destination = resolveDestinationAfterAuth(r, returnTo ?? null, {
        registrationAgentJoin,
      });
      router.replace(destination);
      router.refresh();
    },
    [registrationAgentJoin, returnTo, router],
  );

  const applyReadiness = useCallback(
    (r: CabinetReadiness) => {
      setReadiness(r);
      if (registrationAgentJoin && hasPendingRegistrationConsents(r)) {
        setStep("consents");
        return;
      }
      const next = resolveAuthFlowFromReadiness(r);
      if (next === "complete") {
        finishFlow(r);
        return;
      }
      if (next === "onboarding") {
        const inviteReturn = sanitizeReturnTo(returnTo ?? null);
        if (inviteReturn?.startsWith("/invite/")) {
          router.replace(inviteReturn);
          router.refresh();
          return;
        }
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
    [finishFlow, registrationAgentJoin, returnTo, router],
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
        setStep("provider");
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

  const runSessionCheck = useCallback(async (isActive: () => boolean) => {
    setError("");
    const meResult = await fetchAuthMeSafe();
    if (!isActive()) return;
    if (!meResult.ok) {
      handleSessionFailure(meResult.kind, meResult.status);
      setBooting(false);
      return;
    }
    if (meResult.data.user?.id) {
      onAuthenticated?.(meResult.data.user.id);
    }
    const blocked = mapPostLoginBlocked(meResult.data.user ?? null);
    if (!isActive()) return;
    if (blocked) {
      setError(blocked);
      setStep("blocked");
      setBooting(false);
      return;
    }

    setStep("loading_readiness");
    const readinessResult = await fetchReadinessSafe();
    if (!isActive()) return;
    if (!readinessResult.ok) {
      handleSessionFailure(readinessResult.kind, readinessResult.status);
      setBooting(false);
      return;
    }
    applyReadiness(readinessResult.data);
    setBooting(false);
  }, [applyReadiness, handleSessionFailure, onAuthenticated]);

  const runSessionCheckRef = useRef(runSessionCheck);
  runSessionCheckRef.current = runSessionCheck;

  useEffect(() => {
    flowActiveRef.current = true;
    let active = true;
    const isActive = () => active && flowActiveRef.current;
    void runSessionCheckRef.current(isActive);
    return () => {
      active = false;
      flowActiveRef.current = false;
    };
  }, []);

  const retrySessionCheck = useCallback(async () => {
    if (submitLock.current || loading || booting) return;
    submitLock.current = true;
    setLoading(true);
    setError("");
    try {
      await runSessionCheck(() => true);
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

  const chooseProvider = useCallback(
    (next: AuthLoginProvider) => {
      setProvider(next);
      setError("");
      setResendStatus("");
      setStep("code");
      openMessengerForLogin(messengerLoginUrl(next, maxBotUrl, telegramBotUrl));
    },
    [maxBotUrl, telegramBotUrl],
  );

  const resendCode = useCallback(() => {
    setError("");
    openMessengerForLogin(messengerLoginUrl(provider, maxBotUrl, telegramBotUrl));
    setResendStatus("Откройте бота и запросите новый код командой /login, если сообщение не пришло.");
  }, [maxBotUrl, provider, telegramBotUrl]);

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
        if (meResult.data.user?.id) {
          onAuthenticated?.(meResult.data.user.id);
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
    [applyReadiness, code, handleSessionFailure, loading, onAuthenticated],
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
        const pending = registrationAgentJoin
          ? registrationConsentRequirements(r)
          : loginConsentRequirements(r);
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

        const stillPending = registrationAgentJoin
          ? registrationConsentRequirements(refreshed)
          : loginConsentRequirements(refreshed);
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
    [applyReadiness, loading, readiness, registrationAgentJoin, reloadReadiness],
  );

  const reasonMessage = reason ? REASON_MESSAGES[reason] : null;
  const pendingConsents = readiness
    ? registrationAgentJoin
      ? registrationConsentRequirements(readiness)
      : loginConsentRequirements(readiness)
    : [];

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
            <Button type="button" onClick={() => setStep("provider")} disabled={loading}>
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
            {error ||
              mapAccessDeniedMessage(
                readiness ?? {
                  nextStep: "ready",
                  missingConsents: [],
                  needsProfileOnboarding: false,
                  canAccessCabinet: false,
                  isEmployee: false,
                  isAdmin: false,
                },
              )}
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
                setStep("provider");
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

  const providerStep = (
    <>
      {reasonMessage ? <p className={styles.error}>{reasonMessage}</p> : null}
      <span className={styles.eyebrow}>Вход в кабинет</span>
      <h1 className={styles.title}>
        {registrationAgentJoin ? "Осталось подтвердить вход" : "С возвращением"}
      </h1>
      <p className={styles.lead}>
        {registrationAgentJoin
          ? "Подтвердите вход через MAX или Telegram, затем примите условия."
          : "Выберите способ, уже привязанный к вашему аккаунту. Повторно проходить регистрацию не нужно."}
      </p>
      <div className={styles.entryProviders}>
        <Button
          type="button"
          className={styles.providerButton}
          onClick={() => chooseProvider("MAX")}
        >
          <span className={styles.providerMark} aria-hidden="true">
            M
          </span>
          Продолжить с MAX
          <span className={styles.providerArrow} aria-hidden="true">
            ↗
          </span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={styles.providerButton}
          onClick={() => chooseProvider("TELEGRAM")}
        >
          <span className={styles.providerMark} aria-hidden="true">
            T
          </span>
          Продолжить с Telegram
          <span className={styles.providerArrow} aria-hidden="true">
            ↗
          </span>
        </Button>
      </div>
      {!registrationAgentJoin ? (
        <p className={styles.entryFootnote}>
          <Link href="/join">Нет аккаунта? Регистрация</Link>
        </p>
      ) : null}
    </>
  );

  const codeStep = (
    <>
      {reasonMessage ? <p className={styles.error}>{reasonMessage}</p> : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <span className={styles.eyebrow}>
        {registrationAgentJoin ? "Подтверждение входа" : "Повторный вход"} · {provider}
      </span>
      <h1 className={styles.title}>Введите одноразовый код</h1>
      <p className={styles.lead}>
        Код приходит от бота {provider === "MAX" ? "MAX" : "Telegram"}. Откройте мессенджер, если
        ещё не запросили код командой /login.
      </p>
      <form onSubmit={(event) => void submitCode(event)}>
        <OtpInput
          value={code}
          onChange={setCode}
          disabled={loading}
          fieldLabel="Код из 6 цифр"
          aria-label="Код из сообщения"
        />
        <Button type="submit" disabled={loading || code.length !== 6}>
          {loading ? "Проверяем…" : "Подтвердить и продолжить"}
        </Button>
      </form>
      <div className={styles.codeActions}>
        <Button
          type="button"
          variant="text"
          onClick={() => {
            setError("");
            setResendStatus("");
            setStep("provider");
          }}
          disabled={loading}
        >
          Другой способ входа
        </Button>
        <Button type="button" variant="text" onClick={resendCode} disabled={loading}>
          Получить код повторно
        </Button>
      </div>
      <p className={styles.codeHint} role="status">
        {resendStatus ||
          "Код подтверждает вход, а не создаёт новый аккаунт при каждом посещении."}
      </p>
    </>
  );

  const stepBody = step === "provider" ? providerStep : codeStep;

  if (layout === "embedded") {
    return (
      <section className={styles.embeddedAuth} aria-labelledby="embedded-auth-title">
        <h2 id="embedded-auth-title" className={styles.embeddedAuthTitle}>
          {step === "provider" ? "Подтвердите вход" : "Введите одноразовый код"}
        </h2>
        {stepBody}
      </section>
    );
  }

  return (
    <main className={styles.entryFlowPage}>
      <header className={styles.entryHeader}>
        <BrandMark />
        <ThemeToggle />
      </header>
      <div className={styles.entryFlowBody}>
        <section className={styles.entrySingleCard} aria-labelledby="login-entry-title">
          <div id="login-entry-title" className={styles.srOnly}>
            {step === "provider" ? "Выбор способа входа" : "Ввод кода"}
          </div>
          {stepBody}
        </section>
      </div>
    </main>
  );
}
