"use client";

import { useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { enableR02AgentActivity } from "@/lib/agent-profile/api";
import styles from "./SpecialistAgentActivityCompact.module.css";

type Props = {
  basicsEditable: boolean;
  onActivitiesChange: (activities: string[]) => void;
};

export function SpecialistAgentActivityCompact({ basicsEditable, onActivitiesChange }: Props) {
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");

  return (
    <details
      className={styles.root}
      data-testid="specialist-agent-activity-compact"
    >
      <summary>Дополнительно: деятельность «Агент / рекомендатель»</summary>
      <p className={styles.hint}>
        Необязательно для специалиста. Отдельный профиль для рекомендаций партнёров; права на
        финансы и сканер не меняются.
      </p>
      {error ? <p className={styles.error}>{error}</p> : null}
      <button
        type="button"
        className={styles.btn}
        disabled={!basicsEditable || activating}
        data-testid="agent-activity-enable"
        onClick={() => {
          void (async () => {
            setActivating(true);
            setError("");
            try {
              const res = await enableR02AgentActivity();
              onActivitiesChange(res.user.partnerActivities ?? ["AGENT"]);
            } catch (caught) {
              setError(
                caught instanceof RemcardApiError
                  ? caught.message
                  : "Не удалось включить деятельность",
              );
            } finally {
              setActivating(false);
            }
          })();
        }}
      >
        {activating ? "Включение…" : "Включить деятельность «Агент»"}
      </button>
    </details>
  );
}
