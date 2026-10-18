"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthFlow } from "@/components/auth/AuthFlow";
import { AdminPasswordLoginForm } from "@/components/auth/AdminPasswordLoginForm";
import { fetchProfAdminCapabilities } from "@/lib/prof-admin-api";
import styles from "./auth.module.css";

export type AdminCapabilitiesState = "pending" | "enabled" | "disabled" | "error";

type Props = {
  returnTo?: string | null;
  reason?: string;
  initialStep?: "consents";
  initialMode?: "partner" | "admin";
  registrationAgentJoin?: boolean;
};

export function LoginExperience({
  returnTo,
  reason,
  initialStep,
  initialMode = "partner",
  registrationAgentJoin,
}: Props) {
  const [mode, setMode] = useState<"partner" | "admin">(initialMode);
  const [adminCaps, setAdminCaps] = useState<AdminCapabilitiesState>("pending");

  useEffect(() => {
    let cancelled = false;
    void fetchProfAdminCapabilities()
      .then((c) => {
        if (cancelled) return;
        setAdminCaps(c.adminPasswordLogin ? "enabled" : "disabled");
      })
      .catch(() => {
        if (!cancelled) setAdminCaps("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const adminTabVisible = adminCaps === "enabled" || (adminCaps === "pending" && mode === "admin");
  const showPartnerFlow = mode === "partner";
  const showAdminForm = mode === "admin" && adminCaps === "enabled";
  const showAdminPending = mode === "admin" && adminCaps === "pending";
  const showAdminBlocked = mode === "admin" && (adminCaps === "disabled" || adminCaps === "error");

  const modeTabs = (
    <div className={styles.modeTabs} role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={mode === "partner"}
        className={mode === "partner" ? styles.modeTabActive : styles.modeTab}
        onClick={() => setMode("partner")}
      >
        MAX / Telegram
      </button>
      {adminTabVisible ? (
        <button
          type="button"
          role="tab"
          aria-selected={mode === "admin"}
          className={mode === "admin" ? styles.modeTabActive : styles.modeTab}
          onClick={() => {
            if (adminCaps === "enabled") setMode("admin");
          }}
          disabled={adminCaps === "pending"}
          aria-disabled={adminCaps === "pending"}
        >
          Вход администратора
        </button>
      ) : null}
    </div>
  );

  if (showPartnerFlow) {
    return (
      <>
        <div className={styles.loginModeBar} data-testid="login-mode-bar-partner">
          {modeTabs}
        </div>
        <AuthFlow
          returnTo={returnTo}
          reason={reason}
          initialStep={initialStep}
          registrationAgentJoin={registrationAgentJoin}
          layout="full"
        />
      </>
    );
  }

  return (
    <div className={styles.shell} data-testid="login-shell-admin">
      {modeTabs}
      {showAdminPending ? (
        <p className={styles.adminStatus} role="status" data-testid="admin-login-pending">
          Проверяем доступ к входу администратора…
        </p>
      ) : null}
      {showAdminForm ? <AdminPasswordLoginForm returnTo={returnTo} /> : null}
      {showAdminBlocked ? (
        <div className={styles.adminBlocked} data-testid="admin-login-unavailable">
          <p role="alert">
            {adminCaps === "error"
              ? "Не удалось проверить доступ к входу администратора. Попробуйте позже или используйте вход партнёра."
              : "Вход администратора на этой площадке отключён."}
          </p>
          <button type="button" className={styles.modeTab} onClick={() => setMode("partner")}>
            Перейти к входу партнёра (MAX / Telegram)
          </button>
          <p>
            <Link href="/">На главную</Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
