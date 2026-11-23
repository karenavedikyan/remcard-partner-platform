"use client";

import { MiniAppProfBrand } from "./MiniAppProfBrand";
import styles from "./mini-app.module.css";
import {
  miniAppCabinetBlockedMessage,
  miniAppLaunchInvalidMessage,
  miniAppProfContinueUrl,
  miniAppSessionRecoveryMessage,
  type MiniAppCabinetNextStep,
} from "@/lib/mini-app/auth-copy";

type OnboardingProps = {
  message: string;
  profLoginUrl: string;
  profRegisterUrl: string;
  onOpenExternal: (url: string) => void;
  onLoginByCode: () => void;
};

export function MiniAppMaxUnlinkedScreen({
  message,
  profLoginUrl,
  profRegisterUrl,
  onOpenExternal,
  onLoginByCode,
}: OnboardingProps) {
  return (
    <div className={styles.shell} data-testid="mini-app-max-unlinked">
      <MiniAppProfBrand />
      <h1 className={styles.heroTitle}>Аккаунт MAX не привязан</h1>
      <p>{message}</p>
      <button type="button" className={styles.primaryBtn} onClick={() => onOpenExternal(profRegisterUrl)}>
        Зарегистрироваться в PROF
      </button>
      <button type="button" className={styles.secondaryBtn} onClick={() => onOpenExternal(profLoginUrl)}>
        Войти и привязать MAX
      </button>
      <button type="button" className={styles.textLinkBtn} data-testid="mini-app-login-by-code" onClick={onLoginByCode}>
        Войти по коду из MAX
      </button>
    </div>
  );
}

type RecoveryProps = {
  onRetrySession: () => void;
  onLoginByCode: () => void;
  busy?: boolean;
};

export function MiniAppMaxRecoveryScreen({ onRetrySession, onLoginByCode, busy }: RecoveryProps) {
  return (
    <div className={styles.shell} data-testid="mini-app-max-recovery">
      <MiniAppProfBrand />
      <h1 className={styles.heroTitle}>Повторите вход</h1>
      <p>{miniAppSessionRecoveryMessage()}</p>
      <button
        type="button"
        className={styles.primaryBtn}
        data-testid="mini-app-retry-login"
        disabled={busy}
        onClick={onRetrySession}
      >
        {busy ? "Повтор…" : "Повторить автоматический вход"}
      </button>
      <button
        type="button"
        className={styles.secondaryBtn}
        data-testid="mini-app-login-by-code"
        disabled={busy}
        onClick={onLoginByCode}
      >
        Войти по коду
      </button>
    </div>
  );
}

export function MiniAppLaunchInvalidScreen() {
  return (
    <div className={styles.shell} data-testid="mini-app-launch-invalid">
      <MiniAppProfBrand />
      <h1 className={styles.heroTitle}>Откройте снова из MAX</h1>
      <p role="alert">{miniAppLaunchInvalidMessage()}</p>
    </div>
  );
}

type CabinetProps = {
  nextStep?: MiniAppCabinetNextStep;
  message?: string;
  onOpenExternal: (url: string) => void;
};

export function MiniAppCabinetBlockedScreen({ nextStep, message, onOpenExternal }: CabinetProps) {
  const text = message?.trim() || miniAppCabinetBlockedMessage(nextStep);
  const href = miniAppProfContinueUrl(nextStep);
  const cta =
    nextStep === "profile" ? "Заполнить профиль на сайте" : "Продолжить регистрацию на сайте";
  return (
    <div className={styles.shell} data-testid="mini-app-cabinet-blocked">
      <MiniAppProfBrand />
      <h1 className={styles.heroTitle}>Кабинет не готов</h1>
      <p role="status">{text}</p>
      <button type="button" className={styles.primaryBtn} data-testid="mini-app-cabinet-continue" onClick={() => onOpenExternal(href)}>
        {cta}
      </button>
    </div>
  );
}