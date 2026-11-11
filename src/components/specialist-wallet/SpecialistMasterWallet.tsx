"use client";

import { AgentPayoutRequisitesPanel } from "@/components/profile/agent/AgentPayoutRequisitesPanel";
import { WalletAccrualsWorkspace } from "@/components/wallet-accruals/WalletAccrualsWorkspace";
import agentStyles from "@/components/profile/agent/AgentProfileWizard.module.css";
import { WalletPrototypeShell } from "@/components/wallet-prototype-shell/WalletPrototypeShell";
import type { ReactNode } from "react";
import type { WalletEmptyViewerProps } from "@/lib/wallet-empty/viewer-role";
import walletStyles from "@/components/specialist-wallet/specialist-wallet.module.css";

type Props = WalletEmptyViewerProps & {
  /** Override settlements tab content (dev-fixture preview). */
  settlementsSlot?: ReactNode;
  /** Server-derived actor scope; required for live wallet (dev fixture may omit). */
  walletScopeKey?: string;
};

export function SpecialistMasterWallet({
  settlementsSlot,
  walletEmptyViewerRole,
  walletScopeKey,
}: Props) {
  const resolvedScopeKey = walletScopeKey ?? "specialist:preview";
  return (
    <WalletPrototypeShell
      shellTestId="specialist-master-wallet"
      settlementsTabTestId="specialist-wallet-tab-settlements"
      requisitesTabTestId="specialist-wallet-tab-requisites"
      requisitesScopeTestId="specialist-wallet-requisites-scope"
      settlements={
        settlementsSlot ?? (
          <WalletAccrualsWorkspace
            key={resolvedScopeKey}
            scopeKey={resolvedScopeKey}
            walletEmptyViewerRole={walletEmptyViewerRole}
            masterLedger={{ ledgerScopeKey: `${resolvedScopeKey}:ledger` }}
          />
        )
      }
      requisites={
        <div className={`${agentStyles.agentScope} ${walletStyles.requisitesScope}`}>
          <AgentPayoutRequisitesPanel variant="wallet" />
        </div>
      }
    />
  );
}
