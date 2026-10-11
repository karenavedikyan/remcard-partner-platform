"use client";

import { useEffect, useState } from "react";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import { broadcastSignOutAll, subscribeSessionBroadcast } from "@/lib/session-broadcast";
import { Button } from "@/components/ui/Button";
import { LogoutButton } from "./LogoutButton";
import styles from "./auth.module.css";

type AccountSessionActionsProps = {
  logoutClassName?: string;
  signOutAllClassName?: string;
  layout?: "stack" | "inline";
};

const UNSAVED_PROFILE_KEY = "remcard-profile-unsaved";

export function AccountSessionActions({
  logoutClassName,
  signOutAllClassName,
  layout = "stack",
}: AccountSessionActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return subscribeSessionBroadcast(() => {
      window.location.href = "/login?reason=signed_out_all";
    });
  }, []);

  function requestSignOutAll() {
    if (typeof window !== "undefined" && window.sessionStorage.getItem(UNSAVED_PROFILE_KEY) === "1") {
      const ok = window.confirm(
        "Есть несохранённые изменения в профиле. Выйти со всех устройств и потерять их?",
      );
      if (!ok) return;
    }
    setError("");
    setDialogOpen(true);
  }

  async function confirmSignOutAll() {
    setLoading(true);
    setError("");
    try {
      await remcardFetch("/api/auth/sign-out-all-sessions", { method: "POST", body: {} });
      broadcastSignOutAll();
      window.location.href = "/login?reason=signed_out_all";
    } catch (caught) {
      const message =
        caught instanceof RemcardApiError
          ? caught.message
          : "Не удалось выйти со всех устройств";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const wrapClass = layout === "stack" ? styles.accountSessionStack : styles.accountSessionInline;

  return (
    <>
      <div className={wrapClass}>
        <LogoutButton className={logoutClassName} />
        <Button
          type="button"
          variant="text"
          className={signOutAllClassName}
          data-testid="sign-out-all-devices"
          onClick={requestSignOutAll}
          disabled={loading}
        >
          Выйти со всех устройств
        </Button>
      </div>

      {dialogOpen ? (
        <div className={styles.sessionDialogBackdrop} role="presentation">
          <div
            className={styles.sessionDialogPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sign-out-all-title"
          >
            <h3 id="sign-out-all-title">Выйти со всех устройств?</h3>
            <p className={styles.sessionDialogCopy}>
              Вы выйдете из аккаунта RemCard на всех устройствах, включая это. Для продолжения
              потребуется войти снова. Данные и права доступа сохранятся.
            </p>
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            <div className={styles.sessionDialogActions}>
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)} disabled={loading}>
                Отмена
              </Button>
              <Button type="button" onClick={() => void confirmSignOutAll()} disabled={loading}>
                {loading ? "Выход…" : "Выйти со всех устройств"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
