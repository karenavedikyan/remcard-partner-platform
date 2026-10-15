"use client";

import { useCallback, useEffect, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { activateAgentActivity, fetchAgentProfileStatus } from "@/lib/agent-profile/api";
import type { AgentProfileStatusResponse } from "@/lib/agent-profile/types";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { AgentProfileWizard } from "./AgentProfileWizard";
import { AgentPayoutRequisitesPanel } from "./AgentPayoutRequisitesPanel";
import styles from "./AgentProfileWizard.module.css";

type AgentProfileSectionProps = {
  userId: string;
  partnerActivities: string[];
  basicsEditable: boolean;
  onActivitiesChange?: (activities: string[]) => void;
};

export function AgentProfileSection({
  userId,
  partnerActivities,
  basicsEditable,
  onActivitiesChange,
}: AgentProfileSectionProps) {
  const [status, setStatus] = useState<AgentProfileStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"profile" | "requisites">("profile");
  const [activating, setActivating] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setStatus(await fetchAgentProfileStatus());
    } catch (caught) {
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось проверить профиль агента",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus, partnerActivities.join(",")]);

  if (loading) return null;
  if (!status?.featureEnabled) return null;

  const hasAgent = status.hasAgentActivity || partnerActivities.includes("AGENT");

  if (!hasAgent) {
    return (
      <Panel title="Рекомендую товары и услуги">
        <p className={styles.intro}>
          Для агентов и рекомендателей: отдельный пошаговый профиль, черновик и реквизиты для
          выплат. Включение не меняет права на финансы и сканер.
        </p>
        {error ? <p className={styles.bannerError}>{error}</p> : null}
        <Button
          type="button"
          disabled={!basicsEditable || activating}
          data-testid="agent-activity-enable"
          onClick={async () => {
            setActivating(true);
            try {
              const res = await activateAgentActivity();
              onActivitiesChange?.(res.user.partnerActivities ?? ["AGENT"]);
              await loadStatus();
            } catch (caught) {
              setError(
                caught instanceof RemcardApiError ? caught.message : "Не удалось включить деятельность",
              );
            } finally {
              setActivating(false);
            }
          }}
        >
          Включить деятельность «Агент»
        </Button>
      </Panel>
    );
  }

  if (!status.eligible) {
    return (
      <Panel title="Профиль агента">
        <p className={styles.intro}>
          Агентский профиль доступен владельцу аккаунта с включённой деятельностью «Агент». Текущий
          режим: {status.ineligibleReason ?? "недоступен"}.
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="Профиль агента" hint="Отдельно от legacy-профиля магазина или компании.">
      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "profile"}
          className={`${styles.tab} ${tab === "profile" ? styles.tabActive : ""}`}
          onClick={() => setTab("profile")}
        >
          Профиль
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "requisites"}
          className={`${styles.tab} ${tab === "requisites" ? styles.tabActive : ""}`}
          onClick={() => setTab("requisites")}
        >
          Реквизиты
        </button>
      </div>
      {tab === "profile" ? (
        <AgentProfileWizard
          userId={userId}
          disabled={!basicsEditable}
          onProfileComplete={() => void loadStatus()}
        />
      ) : (
        <AgentPayoutRequisitesPanel disabled={!basicsEditable} />
      )}
    </Panel>
  );
}
