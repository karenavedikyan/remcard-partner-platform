"use client";

import { IconLogOut, IconMonitorOff } from "@/components/account-session/AccountSessionIcons";
import { LogoutAllConfirmDialog } from "@/components/account-session/LogoutAllConfirmDialog";
import { useAccountSessionExit } from "@/components/account-session/useAccountSessionExit";
import { Button } from "@/components/ui/Button";
import styles from "@/components/account-session/account-session.module.css";

export function ProfileSessionActions() {
  const {
    pending,
    error,
    confirmAllOpen,
    exitCurrent,
    openConfirmAll,
    closeConfirmAll,
    confirmExitAll,
  } = useAccountSessionExit();

  return (
    <>
      <section
        className={styles.profileSection}
        aria-labelledby="session-profile-title"
        data-testid="profile-session-actions"
      >
        <div>
          <h2 id="session-profile-title">Вход в аккаунт</h2>
          <p>Завершите сеанс на этом устройстве или на всех сразу.</p>
          {error && !confirmAllOpen ? (
            <p className={styles.dialogMuted} role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className={styles.profileButtons}>
          <Button
            type="button"
            variant="secondary"
            className={styles.profileBtn}
            data-testid="profile-logout"
            disabled={Boolean(pending)}
            onClick={() => void exitCurrent()}
          >
            <IconLogOut width={18} height={18} />
            {pending === "current" ? "Выход…" : "Выйти"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className={styles.profileBtn}
            data-testid="profile-logout-all"
            disabled={Boolean(pending)}
            onClick={() => openConfirmAll()}
          >
            <IconMonitorOff width={18} height={18} />
            Выйти на всех устройствах
          </Button>
        </div>
      </section>
      <LogoutAllConfirmDialog
        open={confirmAllOpen}
        pending={pending === "all"}
        error={error}
        onCancel={closeConfirmAll}
        onConfirm={() => void confirmExitAll()}
      />
    </>
  );
}
