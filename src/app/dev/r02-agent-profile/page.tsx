import { notFound } from "next/navigation";
import { AgentProfileWizard } from "@/components/profile/agent/AgentProfileWizard";
import { AgentPayoutRequisitesPanel } from "@/components/profile/agent/AgentPayoutRequisitesPanel";
import styles from "@/components/profile/agent/AgentProfileWizard.module.css";

export const dynamic = "force-dynamic";

export default function R02AgentProfileFixturePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main style={{ padding: "1rem", maxWidth: 1200, margin: "0 auto" }}>
      <p className={styles.intro}>
        Fixture R02 (dev only): подключите backend с PROF_R02_AGENT_PROFILE_ENABLED и auth.
      </p>
      <AgentProfileWizard userId="fixture-user-id" disabled={false} />
      <div style={{ marginTop: "2rem" }}>
        <AgentPayoutRequisitesPanel disabled={false} />
      </div>
    </main>
  );
}
