"use client";

import { useCallback, useState } from "react";
import type { OwnerClientsAccessMode } from "@/components/clients/OwnerClientsModeContext";
import { AgentClientsList } from "@/components/agent-r03/AgentClientsList";
import type { ClientsParityDirection } from "@/lib/clients-parity/types";
import { ClientsDirectionTabs } from "./ClientsDirectionTabs";
import { ObserverPartnersWorkspace } from "../observer/ObserverPartnersWorkspace";
import { ReceivingAppealsWorkspace } from "@/components/clients/receiving/ReceivingAppealsWorkspace";
import "@/components/clients/receiving/receiving.module.css";

type Props = {
  accessMode: OwnerClientsAccessMode;
};

function atPartnersTabEnabled(mode: OwnerClientsAccessMode): boolean {
  return mode === "specialist" || mode === "business";
}

type TabbedProps = {
  accessMode: "specialist" | "business";
};

function ClientsDirectionTabbedPane({ accessMode }: TabbedProps) {
  const [direction, setDirection] = useState<ClientsParityDirection>("incoming");
  const [atPartnersMounted, setAtPartnersMounted] = useState(false);

  const onDirectionChange = useCallback((next: ClientsParityDirection) => {
    setDirection(next);
    if (next === "at-partners") {
      setAtPartnersMounted(true);
    }
  }, []);

  return (
    <div
      data-testid="clients-direction-workspace"
      data-ca-clients-direction-mode={accessMode}
    >
      <ClientsDirectionTabs direction={direction} onDirectionChange={onDirectionChange} />
      <div
        id="ca-clients-panel-incoming"
        role="tabpanel"
        aria-labelledby="ca-clients-tab-incoming"
        hidden={direction !== "incoming"}
        data-testid="ca-clients-panel-incoming"
      >
        <ReceivingAppealsWorkspace />
      </div>
      {atPartnersMounted ? (
        <div
          id="ca-clients-panel-at-partners"
          role="tabpanel"
          aria-labelledby="ca-clients-tab-at-partners"
          hidden={direction !== "at-partners"}
          data-testid="ca-clients-panel-at-partners"
        >
          <ObserverPartnersWorkspace showHeading={false} />
        </div>
      ) : null}
    </div>
  );
}

/** Hook-free role router: agent observer-only; tabbed roles keyed to reset subtree. */
export function ClientsDirectionWorkspace({ accessMode }: Props) {
  if (accessMode === "agent") {
    return <ObserverPartnersWorkspace />;
  }

  if (!atPartnersTabEnabled(accessMode)) {
    return <AgentClientsList accessMode={accessMode} />;
  }

  return <ClientsDirectionTabbedPane key={accessMode} accessMode={accessMode} />;
}
