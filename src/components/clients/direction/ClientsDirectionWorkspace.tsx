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
  initialDirection?: ClientsParityDirection;
};

function atPartnersTabEnabled(mode: OwnerClientsAccessMode): boolean {
  return mode === "specialist" || mode === "business";
}

export function ClientsDirectionWorkspace({ accessMode, initialDirection = "incoming" }: Props) {
  if (accessMode === "agent") {
    return <ObserverPartnersWorkspace />;
  }

  const [direction, setDirection] = useState<ClientsParityDirection>(initialDirection);

  if (!atPartnersTabEnabled(accessMode)) {
    return <AgentClientsList accessMode={accessMode} />;
  }

  return (
    <div data-testid="clients-direction-workspace">
      <ClientsDirectionTabs direction={direction} onDirectionChange={setDirection} />
      {direction === "incoming" ? <ReceivingAppealsBlocked /> : <ObserverPartnersWorkspace showHeading={false} />}
    </div>
  );
}
