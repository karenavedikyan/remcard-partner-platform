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
  isAuthFlowComplete,
  mapPostLoginBlocked,
  mapVerifyCodeError,
  resolveDestinationAfterAuth,
  sessionRetryMessage,
  type AuthFlowStep,
} from "@/lib/auth-flow";
import { getTelegramBotLoginUrl } from "@/lib/auth-config";
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

  const botUrl = getTelegramBotLoginUrl();

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
      if (isAuthFlowComplete(r)) {
        finishFlow(r);
        return;
      }
      if (r.needsProfileOnboarding) {
        finishFlow(r);
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

        <form onSubmit={(event) => void submitCode(event)}>
          <OtpInput value={code} onChange={setCode} disabled={loading} />
          <Button type="submit" disabled={loading || code.length !== 6}>
            {loading ? "Проверяем…" : "Продолжить"}
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
