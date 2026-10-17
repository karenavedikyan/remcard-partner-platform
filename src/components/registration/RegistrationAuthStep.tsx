"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import { getMaxBotLoginUrl, getTelegramBotLoginUrl } from "@/lib/auth-config";
import {
  mapVerifyCodeError,
  sessionRetryMessage,
} from "@/lib/auth-flow";
import { fetchAuthMeSafe, fetchReadinessSafe } from "@/lib/auth-session";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/auth/OtpInput";
import entryStyles from "./registration-entry.module.css";

type Phase = "providers" | "code";

type Props = {
  roleLabel: string;
  displayName: string;
  city: string;
  onBackToData: () => void;
  onAuthenticated: (userId: string) => void;
  onCodeVerified: () => void;
};

export function RegistrationAuthStep({
  roleLabel,
  displayName,
  city,
  onBackToData,
  onAuthenticated,
  onCodeVerified,
}: Props) {
  const [phase, setPhase] = useState<Phase>("providers");
  const [provider, setProvider] = useState<"MAX" | "TELEGRAM" | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submitLock = useRef(false);

  const maxBotUrl = getMaxBotLoginUrl();
  const telegramBotUrl = getTelegramBotLoginUrl();

  const openProvider = useCallback((p: "MAX" | "TELEGRAM", url: string) => {
    setProvider(p);
    setPhase("code");
    setError("");
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  useEffect(() => {
    if (phase !== "code") return;
    void fetchAuthMeSafe().then((me) => {
      if (me.ok && me.data.user?.id) onAuthenticated(me.data.user.id);
    });
  }, [phase, onAuthenticated]);

  const submitCode = async (event: React.FormEvent) => {
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
      await remcardFetch("/api/auth/verify-code", { method: "POST", body: { code } });
      setCode("");
      const meResult = await fetchAuthMeSafe();
      if (!meResult.ok) {
        setError(sessionRetryMessage(meResult.kind === "network" ? "network" : "server"));
        return;
      }
      if (meResult.data.user?.id) onAuthenticated(meResult.data.user.id);
      const readinessResult = await fetchReadinessSafe();
      if (!readinessResult.ok) {
        setError(sessionRetryMessage(readinessResult.kind === "network" ? "network" : "server"));
        return;
      }
      onCodeVerified();
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
  };

  if (phase === "providers") {
    return (
      <section className={entryStyles.entrySingle} aria-labelledby="reg-auth-title">
        <span className={entryStyles.eyebrow}>Регистрация · {roleLabel}</span>
        <h1 id="reg-auth-title" className={entryStyles.entryTitle}>
          Осталось подтвердить вход
        </h1>
        <p className={entryStyles.entryLead}>
          Ваши данные сохранены в этом браузере. Подтвердите вход через MAX или Telegram, затем примите
          условия.
        </p>
        <dl className={entryStyles.dataSummary}>
          <div>
            <dt>Ваше имя</dt>
            <dd>{displayName}</dd>
          </div>
          <div>
            <dt>Город</dt>
            <dd>{city}</dd>
          </div>
        </dl>
        <div className={entryStyles.providerList}>
          <Button
            type="button"
            className={entryStyles.providerBtn}
            onClick={() => openProvider("MAX", maxBotUrl)}
          >
            <span className={entryStyles.providerMark} aria-hidden="true">
              M
            </span>
            Продолжить с MAX
            <span className={entryStyles.providerArrow} aria-hidden="true">
              ↗
            </span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className={entryStyles.providerBtn}
            onClick={() => openProvider("TELEGRAM", telegramBotUrl)}
          >
            <span className={entryStyles.providerMark} aria-hidden="true">
              T
            </span>
            Продолжить с Telegram
            <span className={entryStyles.providerArrow} aria-hidden="true">
              ↗
            </span>
          </Button>
        </div>
        <Button type="button" variant="secondary" onClick={onBackToData}>
          Вернуться к данным
        </Button>
      </section>
    );
  }

  return (
    <section className={entryStyles.entrySingle} aria-labelledby="reg-code-title">
      <span className={entryStyles.eyebrow}>Подтверждение входа · {provider ?? "…"}</span>
      <h1 id="reg-code-title" className={entryStyles.entryTitle}>
        Введите одноразовый код
      </h1>
      <p className={entryStyles.entryLead}>
        Код приходит от бота {provider}. Откройте диалог, получите код и введите его ниже.
      </p>
      {error ? (
        <p className={entryStyles.fieldHelp} role="alert" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
      <form onSubmit={(e) => void submitCode(e)}>
        <OtpInput value={code} onChange={setCode} disabled={loading} aria-label="Код из сообщения" />
        <div className={entryStyles.formFooter}>
          <Button type="submit" disabled={loading || code.length !== 6}>
            {loading ? "Проверяем…" : "Подтвердить и продолжить"}
          </Button>
        </div>
      </form>
      <div className={entryStyles.codeActionsRow}>
        <Button type="button" variant="secondary" onClick={() => setPhase("providers")}>
          Другой способ входа
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (provider === "MAX") window.open(maxBotUrl, "_blank", "noopener,noreferrer");
            if (provider === "TELEGRAM") window.open(telegramBotUrl, "_blank", "noopener,noreferrer");
          }}
        >
          Получить код повторно
        </Button>
      </div>
    </section>
  );
}
