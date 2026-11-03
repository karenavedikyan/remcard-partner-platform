"use client";

import { useEffect, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { fetchAgentR04Status, type AgentR04Status } from "@/lib/agent-r04/api";
import { Button } from "@/components/ui/Button";
import { CabinetPageLoadingSkeleton } from "@/components/layout/CabinetPageLoadingSkeleton";
import { CABINET_TAB_LOADING_HEADINGS } from "@/lib/cabinet-loading-copy";
import styles from "./agent-r04.module.css";

export function AgentR04Gate({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const [status, setStatus] = useState<AgentR04Status | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchAgentR04Status()
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

  if (loading) {
    return <CabinetPageLoadingSkeleton {...CABINET_TAB_LOADING_HEADINGS["/partners"]} />;
  }
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
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
