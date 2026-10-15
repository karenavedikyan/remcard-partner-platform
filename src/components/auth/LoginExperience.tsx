"use client";

import { useEffect, useState } from "react";
import { AuthFlow } from "@/components/auth/AuthFlow";
import { AdminPasswordLoginForm } from "@/components/auth/AdminPasswordLoginForm";
import { fetchProfAdminCapabilities } from "@/lib/prof-admin-api";
import styles from "./auth.module.css";

type Props = {
  returnTo?: string | null;
  reason?: string;
  initialStep?: "consents";
  initialMode?: "partner" | "admin";
};

export function LoginExperience({ returnTo, reason, initialStep, initialMode = "partner" }: Props) {
  const [mode, setMode] = useState<"partner" | "admin">(initialMode);
  const [adminEnabled, setAdminEnabled] = useState(false);

  useEffect(() => {
    void fetchProfAdminCapabilities()
      .then((c) => setAdminEnabled(Boolean(c.adminPasswordLogin)))
      .catch(() => setAdminEnabled(false));
  }, []);

  return (
    <div className={styles.shell}>
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
        {adminEnabled ? (
          <button
            type="button"
            role="tab"
            aria-selected={mode === "admin"}
            className={mode === "admin" ? styles.modeTabActive : styles.modeTab}
            onClick={() => setMode("admin")}
          >
            Вход администратора
          </button>
        ) : null}
      </div>
      {mode === "partner" ? (
        <AuthFlow returnTo={returnTo} reason={reason} initialStep={initialStep} />
      ) : (
        <AdminPasswordLoginForm returnTo={returnTo} />
      )}
    </div>
  );
}
