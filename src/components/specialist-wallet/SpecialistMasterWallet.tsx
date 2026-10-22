"use client";

import { useState, type ReactNode } from "react";
import { AgentPayoutRequisitesPanel } from "@/components/profile/agent/AgentPayoutRequisitesPanel";
import { SpecialistSettlementsWorkspace } from "@/components/specialist-wallet/SpecialistSettlementsWorkspace";
import agentStyles from "@/components/profile/agent/AgentProfileWizard.module.css";
import walletStyles from "@/components/specialist-wallet/specialist-wallet.module.css";

type WalletTab = "settlements" | "requisites";

type Props = {
  /** Override settlements tab content (dev-fixture preview). */
  settlementsSlot?: ReactNode;
};

export function SpecialistMasterWallet({ settlementsSlot }: Props) {
  const [tab, setTab] = useState<WalletTab>("settlements");

  return (
    <div className={walletStyles.scope} data-testid="specialist-master-wallet">
      <div className={walletStyles.tabs} role="tablist" aria-label="Кошелёк">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "settlements"}
          className={`${walletStyles.tab} ${tab === "settlements" ? walletStyles.tabActive : ""}`}
          onClick={() => setTab("settlements")}
          data-testid="specialist-wallet-tab-settlements"
        >
          Взаиморасчёты
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "requisites"}
          className={`${walletStyles.tab} ${tab === "requisites" ? walletStyles.tabActive : ""}`}
          onClick={() => setTab("requisites")}
          data-testid="specialist-wallet-tab-requisites"
        >
          Реквизиты
        </button>
      </div>
      <div className={walletStyles.panel}>
        {tab === "settlements" ? (
          settlementsSlot ?? <SpecialistSettlementsWorkspace />
        ) : (
          <div
            className={`${agentStyles.agentScope} ${walletStyles.requisitesScope}`}
            data-testid="specialist-wallet-requisites-scope"
          >
            <AgentPayoutRequisitesPanel />
          </div>
        )}
      </div>
    </div>
  );
}
