"use client";

import { useEffect, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { fetchAgentR03Status } from "@/lib/agent-r03/api";
import type { AgentR03Status } from "@/lib/agent-r03/types";
import { fetchEmployeeIssuerStatusSafe } from "@/lib/employee-issuer/api";
import type { EmployeeIssuerStatus } from "@/lib/employee-issuer/types";
import { OwnerIssuerModeProvider } from "@/components/specialist-certificates/OwnerIssuerModeContext";
import { Button } from "@/components/ui/Button";
import styles from "./agent-r03.module.css";

export const AGENT_EMPLOYEE_NO_ACCESS_NOTE =
  "У вас нет права выпускать сертификаты работодателя. Обратитесь к владельцу.";

export function AgentR03Gate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AgentR03Status | null>(null);
  const [employee, setEmployee] = useState<EmployeeIssuerStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await fetchAgentR03Status();
        if (cancelled) return;
        setStatus(s);
        if (s.featureEnabled && !s.eligible) {
          // Not the agent owner: the agent's employee (persisted rights) works in the employer's issuer screens.
          const e = await fetchEmployeeIssuerStatusSafe();
          if (!cancelled) setEmployee(e);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof RemcardApiError ? caught.message : "Не удалось проверить доступ",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
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
  if (status?.featureEnabled && status.eligible) {
    return <>{children}</>;
  }
  if (employee?.applicable && employee.workspace === "agent") {
    if (!employee.canIssue) {
      return (
        <p className={styles.empty} data-testid="agent-employee-no-access">
          {AGENT_EMPLOYEE_NO_ACCESS_NOTE}
        </p>
      );
    }
    return (
      <OwnerIssuerModeProvider
        mode="legacy"
        canIssueCertificates
        agentEmployee
        employerLabel={employee.employerDisplayName ?? null}
      >
        {children}
      </OwnerIssuerModeProvider>
    );
  }
  return (
    <p className={styles.empty}>
      Раздел недоступен. R03 включается отдельным флагом для агента-владельца.
    </p>
  );
}
