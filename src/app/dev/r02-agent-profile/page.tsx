import { AgentProfileWizard } from "@/components/profile/agent/AgentProfileWizard";
import { AgentPayoutRequisitesPanel } from "@/components/profile/agent/AgentPayoutRequisitesPanel";
import styles from "@/components/profile/agent/AgentProfileWizard.module.css";

export const dynamic = "force-dynamic";

/** Dev-only layout shell for R02 visual checks (API requires backend + gates). */
export default function R02AgentProfileFixturePage() {
  return (
    <main style={{ padding: "1rem", maxWidth: 1200, margin: "0 auto" }}>
      <p className={styles.intro}>
        Fixture R02: подключите backend с PROF_R02_AGENT_PROFILE_ENABLED и авторизацией PRO agent.
      </p>
      <AgentProfileWizard userId="fixture-user-id" disabled={false} />
      <div style={{ marginTop: "2rem" }}>
        <AgentPayoutRequisitesPanel disabled={false} />
      </div>
    </main>
  );
}
