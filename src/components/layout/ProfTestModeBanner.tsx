"use client";

import { useRouter } from "next/navigation";
import { remcardFetch } from "@/lib/api-client";
import styles from "./ProfTestModeBanner.module.css";
import type { ProfTestSessionInfo } from "@/lib/types";

export type { ProfTestSessionInfo };

type Props = {
  session: ProfTestSessionInfo;
};

export function ProfTestModeBanner({ session }: Props) {
  const router = useRouter();
  if (!session.active) return null;

  const typeLabel =
    session.partnerActivities?.includes("AGENT")
      ? "Агент"
      : session.partnerType ?? "Партнёр";

  return (
    <div className={styles.banner} role="status" data-testid="prof-test-mode-banner">
      <span>
        Тестовый режим · {session.displayName} · {typeLabel}
      </span>
      <button
        type="button"
        className={styles.btn}
        onClick={async () => {
          try {
            await remcardFetch("/api/pro/admin/test-users/return", { method: "POST" });
            router.replace("/admin/test-users");
            router.refresh();
          } catch {
            router.replace("/login?mode=admin&returnTo=%2Fadmin%2Ftest-users");
          }
        }}
      >
        Вернуться в управление тестами
      </button>
    </div>
  );
}
