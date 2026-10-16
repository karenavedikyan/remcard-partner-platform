"use client";

import { useState } from "react";
import { AgentPayoutRequisitesPanel } from "@/components/profile/agent/AgentPayoutRequisitesPanel";
import { AgentReceivablesHub } from "@/components/agent-r05/AgentReceivablesHub";
import walletStyles from "./agent-receivables-wallet.module.css";

type WalletTab = "settlements" | "requisites";

export function AgentReceivablesWallet() {
  const [tab, setTab] = useState<WalletTab>("settlements");

  return (
    <div className={walletStyles.scope} data-testid="agent-r05-wallet">
      <div className={walletStyles.tabs} role="tablist" aria-label="Кошелёк">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "settlements"}
          className={`${walletStyles.tab} ${tab === "settlements" ? walletStyles.tabActive : ""}`}
          onClick={() => setTab("settlements")}
          data-testid="agent-r05-tab-settlements"
        >
          Взаиморасчёты
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "requisites"}
          className={`${walletStyles.tab} ${tab === "requisites" ? walletStyles.tabActive : ""}`}
          onClick={() => setTab("requisites")}
          data-testid="agent-r05-tab-requisites"
        >
          Реквизиты
        </button>
      </div>
      {tab === "settlements" ? (
        <AgentReceivablesHub />
      ) : (
        <AgentPayoutRequisitesPanel disabled />
      )}
    </div>
  );
}
