"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCabinetPresentation } from "@/components/layout/CabinetPresentationContext";
import { shouldPreferBusinessWorkplaceDispatch } from "@/lib/cabinet-presentation/resolve";
import type { OwnerClientsAccessMode } from "@/components/clients/OwnerClientsModeContext";
import { AgentClientsList } from "@/components/agent-r03/AgentClientsList";
import type { ClientsParityDirection } from "@/lib/clients-parity/types";
import { ClientsDirectionTabs } from "./ClientsDirectionTabs";
import { ObserverPartnersWorkspace } from "../observer/ObserverPartnersWorkspace";
import { ReceivingAppealsWorkspace } from "@/components/clients/receiving/ReceivingAppealsWorkspace";
import { fetchObserverReferredAppeals } from "@/lib/clients-parity/fetch-observer-appeals";
import { isObserverDirectionIntroEligible } from "@/components/clients/new-partner-empty/clientsEmptyEligibility";
import {
  useClientsDirectionProbeSetter,
  useClientsPageChrome,
} from "@/components/clients/new-partner-empty/clientsPageChrome";
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
  const chrome = useClientsPageChrome();
  const setAtPartnersProbe = useClientsDirectionProbeSetter("at-partners");
  const hideTabs = chrome?.hideDirectionTabs ?? false;

  const onDirectionChange = useCallback((next: ClientsParityDirection) => {
    setDirection(next);
    if (next === "at-partners") {
      setAtPartnersMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!setAtPartnersProbe) return;
    const controller = new AbortController();
    let cancelled = false;
    setAtPartnersProbe("loading");
    void fetchObserverReferredAppeals({ signal: controller.signal }).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setAtPartnersProbe(res.code === "BLOCKED_CONTRACT" ? "blocked" : "error");
        return;
      }
      const eligible = isObserverDirectionIntroEligible({
        loadState: "ready",
        dataContract: { status: "ready" },
        appealsLength: res.appeals.length,
        filters: { q: "", period: "all", bucket: "active" },
      });
      setAtPartnersProbe(eligible ? "proven_empty" : "not_empty");
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [setAtPartnersProbe]);

  return (
    <div
      className={styles.clientsScope}
      data-testid="clients-direction-workspace"
      data-ca-clients-direction-mode={accessMode}
      data-clients-chrome-tabs-hidden={hideTabs ? "true" : undefined}
    >
      {hideTabs ? null : (
        <ClientsDirectionTabs direction={direction} onDirectionChange={onDirectionChange} />
      )}
      <div
        id="ca-clients-panel-incoming"
        role="tabpanel"
        aria-labelledby="ca-clients-tab-incoming"
        hidden={hideTabs ? false : direction !== "incoming"}
        data-testid="ca-clients-panel-incoming"
      >
        <ReceivingAppealsWorkspace initialAppealId={initialAppealId} directionProbe="incoming" />
      </div>
      {atPartnersMounted ? (
        <div
          id="ca-clients-panel-at-partners"
          role="tabpanel"
          aria-labelledby="ca-clients-tab-at-partners"
          hidden={hideTabs ? true : direction !== "at-partners"}
          data-testid="ca-clients-panel-at-partners"
        >
          <ObserverPartnersWorkspace showHeading={false} directionProbe="at-partners" />
        </div>
      ) : null}
    </div>
  );
}

/** Hook-free role router: agent observer-only; tabbed roles keyed to reset subtree. */
export function ClientsDirectionWorkspace({ accessMode }: Props) {
  const searchParams = useSearchParams();
  const presentation = useCabinetPresentation();
  const receivingReturn = searchParams?.get("direction") === "receiving";
  const initialAppealId = receivingReturn ? searchParams?.get("appealId")?.trim() || null : null;

  // Org staff are not observer referrers. Mirror the existing workplace dispatch;
  // do not offer a tab whose backend gate correctly denies this actor.
  if (accessMode === "business" && presentation && shouldPreferBusinessWorkplaceDispatch({
    proContextRole: presentation.proContext?.role,
    workplacePartnerType: presentation.workplacePartnerType,
    workplacePartnerTypeSource: presentation.workplacePartnerTypeSource,
  })) {
    return (
      <div className={styles.clientsScope} data-testid="clients-workplace-receiving-only">
        <ReceivingAppealsWorkspace initialAppealId={initialAppealId} directionProbe="incoming" />
      </div>
    );
  }

  if (accessMode === "agent") {
    return <ObserverPartnersWorkspace directionProbe="at-partners" />;
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
