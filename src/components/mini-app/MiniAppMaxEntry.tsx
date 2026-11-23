"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OtpInput } from "@/components/auth/OtpInput";
import type { MiniAppEmbeddedContext } from "@/lib/mini-app/embedded-context";
import { miniAppSendLoginCode, miniAppVerifyLoginCode } from "@/lib/mini-app/api";
import type { MiniAppPlatform } from "@/lib/mini-app/types";
import { MiniAppProfBrand } from "./MiniAppProfBrand";
import { MiniIconLock, MiniIconScan, MiniIconCertificate } from "./MiniAppIcons";
import styles from "./mini-app.module.css";

type Phase = "landing" | "code" | "success";

type Props = {
  platform: MiniAppPlatform;
  initData: string;
  embeddedContext: MiniAppEmbeddedContext;
  profRegisterUrl: string;
  profLoginUrl: string;
  onAuthenticated: () => void;
  onOpenExternal: (url: string) => void;
};

export function MiniAppMaxEntry({
  platform,
  initData,
  embeddedContext,
  profRegisterUrl,
  profLoginUrl,
  onAuthenticated,
  onOpenExternal,
}: Props) {
  const [phase, setPhase] = useState<Phase>("landing");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSec, setResendSec] = useState(0);
  const sentRef = useRef(false);

  useEffect(() => {
    if (resendSec <= 0) return;
    const t = window.setTimeout(() => setResendSec((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [resendSec]);

  const sendCode = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await miniAppSendLoginCode(platform, initData, { embeddedContext });
      if (r.status === "ok") {
        setPhase("code");
        setResendSec(r.resendAfterSec ?? 60);
        return;
      }
      setError(r.message);
    } finally {
      setLoading(false);
    }
  }, [embeddedContext, initData, platform]);

  const verify = useCallback(async () => {
    if (code.length !== 6) {
      setError("Введите 6-значный код из чата MAX");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await miniAppVerifyLoginCode(platform, initData, code, { embeddedContext });
      if (r.status === "ok") {
        setPhase("success");
        onAuthenticated();
        return;
      }
      setError(r.message);
    } finally {
      setLoading(false);
    }
  }, [code, embeddedContext, initData, onAuthenticated, platform]);

  useEffect(() => {
    if (phase !== "landing" || sentRef.current) return;
    sentRef.current = true;
  }, [phase]);

  if (phase === "code") {
    return (
      <div className={styles.shell} data-testid="mini-app-max-code">
        <MiniAppProfBrand />
        <h1 className={styles.heroTitle}>Код из MAX</h1>
        <p className={styles.heroIntro}>Введите шестизначный код, который пришёл в чат RemCard в MAX.</p>
        <OtpInput value={code} onChange={setCode} disabled={loading} aria-label="Код из MAX" />
        {error ? (
          <p className={styles.scanBad} role="alert">
            {error}
          </p>
        ) : null}
        <button type="button" className={styles.primaryBtn} disabled={loading} onClick={() => void verify()}>
          {loading ? "Проверка…" : "Войти в кабинет"}
        </button>
        <button
          type="button"
          className={styles.secondaryBtn}
          disabled={loading || resendSec > 0}
          onClick={() => void sendCode()}
        >
          {resendSec > 0 ? `Отправить снова (${resendSec} с)` : "Отправить код повторно"}
        </button>
        <button type="button" className={styles.textLinkBtn} onClick={() => setPhase("landing")}>
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className={styles.shell} data-testid="mini-app-max-entry">
      <div className={styles.maxEntryHero}>
        <div className={styles.maxEntryHeroTop}>
          <MiniAppProfBrand variant="onDark" />
        </div>
        <span className={styles.maxEntryPill}>Вход через MAX</span>
        <h1 className={styles.maxEntryTitle}>Войдите в кабинет</h1>
        <p className={styles.maxEntryLead}>
          Один раз подтвердите вход — дальше мини-кабинет откроется сразу.
        </p>
      </div>

      <p className={styles.maxStepsLabel}>ТРИ ШАГА</p>
      <div className={styles.maxStepsRow}>
        <MaxStepCard
          step="1"
          icon={<MiniIconScan />}
          text={
            <>
              <strong>Нажмите</strong> кнопку ниже
            </>
          }
        />
        <MaxStepCard
          step="2"
          icon={<MiniIconCertificate />}
          text={
            <>
              <strong>Получите код</strong> 6 цифр в чате
            </>
          }
        />
        <MaxStepCard
          step="3"
          icon={<MiniIconLock />}
          text={
            <>
              <strong>Введите код</strong> и вы в кабинете
            </>
          }
        />
      </div>

      {error ? (
        <p className={styles.scanBad} role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className={styles.primaryBtn}
        data-testid="mini-app-max-continue"
        disabled={loading}
        onClick={() => void sendCode()}
      >
        {loading ? "Отправка…" : "Продолжить с MAX →"}
      </button>

      <p className={styles.maxRegisterLine}>
        Нет аккаунта?{" "}
        <button type="button" className={styles.maxRegisterLink} onClick={() => onOpenExternal(profRegisterUrl)}>
          Зарегистрироваться
        </button>
      </p>

      <button type="button" className={styles.textLinkBtn} onClick={() => onOpenExternal(profLoginUrl)}>
        Открыть обычный кабинет PROF
      </button>
    </div>
  );
}

function MaxStepCard({
  step,
  icon,
  text,
}: {
  step: string;
  icon: React.ReactNode;
  text: React.ReactNode;
}) {
  return (
    <p className={styles.maxStepCard} data-testid={`mini-max-step-${step}`}>
      <span className={styles.maxStepIconWrap}>
        <span className={styles.maxStepBadge}>{step}</span>
        <span className={styles.maxStepIcon}>{icon}</span>
      </span>
      <span className={styles.maxStepText}>{text}</span>
    </p>
  );
}