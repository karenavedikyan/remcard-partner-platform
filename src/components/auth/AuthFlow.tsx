"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthMe, remcardFetch, RemcardApiError } from "@/lib/api-client";
import type { CabinetReadiness } from "@/lib/cabinet-readiness";
import { loginConsentRequirements } from "@/lib/cabinet-readiness";
import { recordConsentRequirements } from "@/lib/auth-consent";
import {
  mapPostLoginBlocked,
  mapVerifyCodeError,
  resolveDestinationAfterAuth,
  resolveStepFromReadiness,
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
  initialStep?: AuthFlowStep;
};

const REASON_MESSAGES: Record<string, string> = {
  session: "Сессия завершилась. Войдите снова.",
  blocked: "Аккаунт заблокирован.",
  role: "Для доступа нужен профиль партнёра.",
};

export function AuthFlow({ returnTo, reason, initialStep }: AuthFlowProps) {
  const router = useRouter();
  const submitLock = useRef(false);
  const [step, setStep] = useState<AuthFlowStep>(initialStep ?? "code");
  const [code, setCode] = useState("");
  const [readiness, setReadiness] = useState<CabinetReadiness | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(Boolean(initialStep && initialStep !== "code"));

  const botUrl = getTelegramBotLoginUrl();

  const loadReadiness = useCallback(async (): Promise<CabinetReadiness | null> => {
    try {
      const data = await remcardFetch<CabinetReadiness>("/api/account/cabinet-readiness");
      setReadiness(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!booting) return;
    void (async () => {
      const me = await getAuthMe();
      if (!me.user) {
        setStep("code");
        setBooting(false);
        return;
      }
      const blocked = mapPostLoginBlocked(me.user);
      if (blocked) {
        setError(blocked);
        setBooting(false);
        return;
      }
      const r = await loadReadiness();
      const next = resolveStepFromReadiness(r, true);
      if (next === "done" && r) {
        router.replace(resolveDestinationAfterAuth(r, returnTo ?? null));
        router.refresh();
        return;
      }
      setStep(next);
      setBooting(false);
    })();
  }, [booting, loadReadiness, returnTo, router]);

  const finishFlow = useCallback(
    async (r: CabinetReadiness) => {
      const destination = resolveDestinationAfterAuth(r, returnTo ?? null);
      router.replace(destination);
      router.refresh();
    },
    [returnTo, router],
  );

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

        const me = await getAuthMe();
        const blocked = mapPostLoginBlocked(me.user ?? null);
        if (blocked) {
          setError(blocked);
          return;
        }

        setCode("");
        const r = await loadReadiness();
        if (!r) {
          setError("Не удалось проверить статус аккаунта.");
          setStep("consents");
          return;
        }
        if (resolveStepFromReadiness(r, true) === "done") {
          await finishFlow(r);
          return;
        }
        setStep("consents");
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
    [code, finishFlow, loadReadiness, loading],
  );

  const submitConsents = useCallback(
    async (acceptedKinds: Set<string>) => {
      if (submitLock.current || loading) return;
      submitLock.current = true;
      setLoading(true);
      setError("");

      try {
        const r = readiness ?? (await loadReadiness());
        if (!r) {
          setError("Не удалось проверить статус аккаунта.");
          return;
        }
        const pending = loginConsentRequirements(r);
        if (pending.length === 0) {
          await finishFlow(r);
          return;
        }
        await recordConsentRequirements(pending, acceptedKinds);
        const refreshed = await loadReadiness();
        if (!refreshed) {
          setError("Согласие сохранено, но статус не подтверждён. Обновите страницу.");
          return;
        }
        await finishFlow(refreshed);
      } catch (caught) {
        if (caught instanceof RemcardApiError) {
          setError(caught.message);
        } else if (caught instanceof Error) {
          setError(caught.message);
        } else {
          setError("Не удалось сохранить согласия.");
        }
        void loadReadiness();
      } finally {
        setLoading(false);
        submitLock.current = false;
      }
    },
    [finishFlow, loadReadiness, loading, readiness],
  );

  const reasonMessage = reason ? REASON_MESSAGES[reason] : null;
  const pendingConsents = readiness ? loginConsentRequirements(readiness) : [];

  if (booting) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <p className={styles.lead}>Проверяем сессию…</p>
        </section>
      </main>
    );
  }

  if (step === "consents") {
    return (
      <ConsentStep
        requirements={pendingConsents}
        error={error}
        loading={loading}
        onSubmit={(accepted) => void submitConsents(accepted)}
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
