"use client";

import { AgentPayoutRequisitesPanel } from "@/components/profile/agent/AgentPayoutRequisitesPanel";
import { WalletAccrualsWorkspace } from "@/components/wallet-accruals/WalletAccrualsWorkspace";
import agentStyles from "@/components/profile/agent/AgentProfileWizard.module.css";
import { WalletPrototypeShell } from "@/components/wallet-prototype-shell/WalletPrototypeShell";
import type { ReactNode } from "react";
import type { WalletEmptyViewerProps } from "@/lib/wallet-empty/viewer-role";
import walletStyles from "@/components/specialist-wallet/specialist-wallet.module.css";
import type { AuthUser } from "@/lib/types";

type Props = WalletEmptyViewerProps & {
  user: AuthUser;
  /** Override settlements tab content (dev-fixture preview). */
  settlementsSlot?: ReactNode;
};

export function SpecialistMasterWallet({ user, settlementsSlot, walletEmptyViewerRole }: Props) {
  return (
    <WalletPrototypeShell
      shellTestId="specialist-master-wallet"
      settlementsTabTestId="specialist-wallet-tab-settlements"
      requisitesTabTestId="specialist-wallet-tab-requisites"
      requisitesScopeTestId="specialist-wallet-requisites-scope"
      settlements={
        settlementsSlot ?? (
          <WalletAccrualsWorkspace
            user={user}
            scopeKey="specialist-master"
            walletEmptyViewerRole={walletEmptyViewerRole}
            masterLedger={{ ledgerScopeKey: "specialist-master-ledger" }}
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
