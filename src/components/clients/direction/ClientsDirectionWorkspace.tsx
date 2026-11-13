"use client";

import { useState } from "react";
import type { OwnerClientsAccessMode } from "@/components/clients/OwnerClientsModeContext";
import { AgentClientsList } from "@/components/agent-r03/AgentClientsList";
import type { ClientsParityDirection } from "@/lib/clients-parity/types";
import { ClientsDirectionTabs } from "./ClientsDirectionTabs";
import { ObserverPartnersWorkspace } from "../observer/ObserverPartnersWorkspace";
import { ReceivingAppealsBlocked } from "./ReceivingAppealsBlocked";

type Props = {
  accessMode: OwnerClientsAccessMode;
};

function atPartnersTabEnabled(mode: OwnerClientsAccessMode): boolean {
  return mode === "specialist" || mode === "business";
}

export function ClientsDirectionWorkspace({ accessMode }: Props) {
  if (accessMode === "agent") {
    return <ObserverPartnersWorkspace />;
  }

  const [direction, setDirection] = useState<ClientsParityDirection>("incoming");

  if (!atPartnersTabEnabled(accessMode)) {
    return <AgentClientsList accessMode={accessMode} />;
  }

  return (
    <div data-testid="clients-direction-workspace">
      <ClientsDirectionTabs direction={direction} onDirectionChange={setDirection} />
      {direction === "incoming" ? (
        <div
          id="ca-clients-panel-incoming"
          role="tabpanel"
          aria-labelledby="ca-clients-tab-incoming"
          data-testid="ca-clients-panel-incoming"
        >
          <ReceivingAppealsBlocked />
        </div>
      ) : (
        <div
          id="ca-clients-panel-at-partners"
          role="tabpanel"
          aria-labelledby="ca-clients-tab-at-partners"
          data-testid="ca-clients-panel-at-partners"
        >
          <ObserverPartnersWorkspace showHeading={false} />
        </div>
      )}
    </div>
  );
}
