"use client";

import { useCallback, useEffect, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { fetchAgentProfileStatus } from "@/lib/agent-profile/api";
import type { AgentProfileStatusResponse } from "@/lib/agent-profile/types";
import { Panel } from "@/components/ui/Panel";
import { AgentProfileWizard } from "./AgentProfileWizard";
import { isPureAgentActivities } from "@/lib/agent-profile/mode";
import { AgentPayoutRequisitesPanel } from "./AgentPayoutRequisitesPanel";
import styles from "./AgentProfileWizard.module.css";

export type AgentProfileSectionLayout =
  | "default"
  /** Pure agent overview: wizard/summary + bank block, no nested tabs. */
  | "parity-overview"
  /** Pure agent basics tab: edit wizard only. */
  | "parity-basics";

type AgentProfileSectionProps = {
  userId: string;
  partnerActivities: string[];
  basicsEditable: boolean;
  layout?: AgentProfileSectionLayout;
  onExitEditMode?: () => void;
};

export function AgentProfileSection({
  userId,
  partnerActivities,
  basicsEditable,
  layout = "default",
  onExitEditMode,
}: AgentProfileSectionProps) {
  const [status, setStatus] = useState<AgentProfileStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"profile" | "requisites">("profile");

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
  if (!status?.featureEnabled) {
    return error ? <p className={styles.bannerError}>{error}</p> : null;
  }

  const hasAgent = status.hasAgentActivity || partnerActivities.includes("AGENT");

  if (!hasAgent) {
    return null;
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

  const pureAgent = isPureAgentActivities(partnerActivities);
  const parityOverview = layout === "parity-overview";
  const parityBasics = layout === "parity-basics";

  const wizard = (
    <AgentProfileWizard
      userId={userId}
      disabled={!basicsEditable}
      onProfileComplete={() => void loadStatus()}
      startInEditMode={parityBasics}
      onExitEditMode={parityBasics ? onExitEditMode : undefined}
    />
  );

  if (parityOverview) {
    return (
      <div className={styles.agentScope} data-testid="agent-profile-scope">
        {wizard}
        <AgentPayoutRequisitesPanel disabled={!basicsEditable} />
      </div>
    );
  }

  if (parityBasics) {
    return (
      <div className={styles.agentScope} data-testid="agent-profile-scope">
        {wizard}
      </div>
    );
  }

  return (
    <Panel
      title="Профиль агента"
      hint={
        pureAgent
          ? undefined
          : "Заполняется отдельно от основных данных партнёра в этом разделе."
      }
    >
      <div className={styles.agentScope} data-testid="agent-profile-scope">
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
        {tab === "profile" ? wizard : <AgentPayoutRequisitesPanel disabled={!basicsEditable} />}
      </div>
    </Panel>
  );
}
