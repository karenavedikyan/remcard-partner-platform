"use client";

import { useEffect, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { fetchAgentR03Status } from "@/lib/agent-r03/api";
import type { AgentR03Status } from "@/lib/agent-r03/types";
import { Button } from "@/components/ui/Button";
import styles from "./agent-r03.module.css";

export function AgentR03Gate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AgentR03Status | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchAgentR03Status()
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            caught instanceof RemcardApiError ? caught.message : "Не удалось проверить доступ",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className={styles.loading}>Загрузка…</p>;
  if (error) {
    return (
      <div className={styles.errorBlock}>
        <p role="alert">{error}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Повторить
        </Button>
      </div>
    );
  }
  if (!status?.featureEnabled || !status.eligible) {
    return (
      <p className={styles.empty}>
        Раздел недоступен. R03 включается отдельным флагом для агента-владельца.
      </p>
    );
  }
  return <>{children}</>;
}
