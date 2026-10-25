"use client";

import type { BusinessClientsPartnerType } from "@/lib/business-clients/gate";
import { businessWalletPageCopy } from "@/lib/business-wallet/copy";
import { AgentPayoutRequisitesPanel } from "@/components/profile/agent/AgentPayoutRequisitesPanel";
import { SpecialistSettlementsWorkspace } from "@/components/specialist-wallet/SpecialistSettlementsWorkspace";
import agentStyles from "@/components/profile/agent/AgentProfileWizard.module.css";
import walletStyles from "@/components/specialist-wallet/specialist-wallet.module.css";
import { useState, type ReactNode } from "react";

type WalletTab = "settlements" | "requisites";

type Props = {
  partnerType: BusinessClientsPartnerType;
  /** Stable owner id for settlements load / modal cleanup (not only STORE vs COMPANY). */
  ownerUserId: string;
  settlementsSlot?: ReactNode;
};

export function BusinessOwnerWallet({ partnerType, ownerUserId, settlementsSlot }: Props) {
  const copy = businessWalletPageCopy(partnerType);
  const [tab, setTab] = useState<WalletTab>("settlements");

  const workspace =
    settlementsSlot ?? (
      <SpecialistSettlementsWorkspace
        scopeKey={`${partnerType}:${ownerUserId}`}
        payableSummaryLabel={copy.payableSummaryLabel}
        payableDirectionLabel={copy.payableDirectionLabel}
        payableHint={copy.payableHint}
      />
    );

  return (
    <div className={walletStyles.scope} data-testid="business-owner-wallet">
      <div className={walletStyles.tabs} role="tablist" aria-label="Кошелёк">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "settlements"}
          className={`${walletStyles.tab} ${tab === "settlements" ? walletStyles.tabActive : ""}`}
          onClick={() => setTab("settlements")}
          data-testid="business-wallet-tab-settlements"
        >
          Взаиморасчёты
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "requisites"}
          className={`${walletStyles.tab} ${tab === "requisites" ? walletStyles.tabActive : ""}`}
          onClick={() => setTab("requisites")}
          data-testid="business-wallet-tab-requisites"
        >
          Реквизиты
        </button>
      </div>
      <div className={walletStyles.panel}>
        {tab === "settlements" ? workspace : (
          <div
            className={`${agentStyles.agentScope} ${walletStyles.requisitesScope}`}
            data-testid="business-wallet-requisites-scope"
          >
            <AgentPayoutRequisitesPanel />
          </div>
        )}
      </div>
    </div>
  );
}
