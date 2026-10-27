"use client";

import { AccountSessionMenu } from "@/components/account-session/AccountSessionMenu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import styles from "./Admin.module.css";

export type AdminAccountIdentity = {
  displayName: string;
  staffRole: "ADMIN" | "OWNER";
};

/** Shared platform controls only. Partner inbox/context must not be mounted here. */
export function AdminAccountControls({ identity }: { identity: AdminAccountIdentity | null }) {
  return (
    <div className={styles.accountControls} role="group" aria-label="Аккаунт и внешний вид">
      <ThemeToggle />
      {identity ? (
        <AccountSessionMenu
          displayName={identity.displayName}
          roleLabel={identity.staffRole === "OWNER" ? "Владелец платформы" : "Администратор платформы"}
          signInMode="admin"
        />
      ) : null}
    </div>
  );
}
