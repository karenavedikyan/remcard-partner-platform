"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCabinetPresentation } from "@/components/layout/CabinetPresentationContext";
import { shouldPreferBusinessWorkplaceDispatch } from "@/lib/cabinet-presentation/resolve";
import type { OwnerClientsAccessMode } from "@/components/clients/OwnerClientsModeContext";
import { AgentClientsList } from "@/components/agent-r03/AgentClientsList";
import type { ClientsParityDirection } from "@/lib/clients-parity/types";
import { ClientsDirectionTabs } from "./ClientsDirectionTabs";
import { ObserverPartnersWorkspace } from "../observer/ObserverPartnersWorkspace";
import { ReceivingAppealsWorkspace } from "@/components/clients/receiving/ReceivingAppealsWorkspace";
import styles from "@/components/clients/receiving/receiving.module.css";

type Props = {
  accessMode: OwnerClientsAccessMode;
};

function atPartnersTabEnabled(mode: OwnerClientsAccessMode): boolean {
  return mode === "specialist" || mode === "business";
}

type TabbedProps = {
  accessMode: "specialist" | "business";
  initialAppealId?: string | null;
};

function ClientsDirectionTabbedPane({ accessMode, initialAppealId }: TabbedProps) {
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
      className={styles.clientsScope}
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
        <ReceivingAppealsWorkspace initialAppealId={initialAppealId} />
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
  const searchParams = useSearchParams();
  const presentation = useCabinetPresentation();
  const receivingReturn = searchParams.get("direction") === "receiving";
  const initialAppealId = receivingReturn ? searchParams.get("appealId")?.trim() || null : null;

  // Org staff are not observer referrers. Mirror the existing workplace dispatch;
  // do not offer a tab whose backend gate correctly denies this actor.
  if (accessMode === "business" && presentation && shouldPreferBusinessWorkplaceDispatch({
    proContextRole: presentation.proContext?.role,
    workplacePartnerType: presentation.workplacePartnerType,
    workplacePartnerTypeSource: presentation.workplacePartnerTypeSource,
  })) {
    return (
      <div className={styles.clientsScope} data-testid="clients-workplace-receiving-only">
        <ReceivingAppealsWorkspace initialAppealId={initialAppealId} />
      </div>
    );
  }

  if (accessMode === "agent") {
    return <ObserverPartnersWorkspace />;
  }

  if (!atPartnersTabEnabled(accessMode)) {
    return <AgentClientsList accessMode={accessMode} />;
  }

  return (
    <ClientsDirectionTabbedPane
      key={accessMode}
      accessMode={accessMode}
      initialAppealId={initialAppealId}
    />
  );
}
