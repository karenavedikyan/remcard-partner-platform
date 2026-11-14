"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { OwnerClientsAccessMode } from "@/components/clients/OwnerClientsModeContext";

export type ClientsDirectionProbeState =
  | "idle"
  | "loading"
  | "blocked"
  | "error"
  | "not_empty"
  | "proven_empty";

type ChromeCtx = {
  incoming: ClientsDirectionProbeState;
  atPartners: ClientsDirectionProbeState;
  setIncoming: (state: ClientsDirectionProbeState) => void;
  setAtPartners: (state: ClientsDirectionProbeState) => void;
  hideTopChrome: boolean;
  hideDirectionTabs: boolean;
};

const ClientsPageChromeContext = createContext<ChromeCtx | null>(null);

function probeSettled(state: ClientsDirectionProbeState): boolean {
  return state === "proven_empty" || state === "not_empty";
}

function bothDirectionsProvenEmpty(
  accessMode: OwnerClientsAccessMode,
  incoming: ClientsDirectionProbeState,
  atPartners: ClientsDirectionProbeState,
): boolean {
  if (accessMode === "agent") {
    return atPartners === "proven_empty";
  }
  if (accessMode === "specialist" || accessMode === "business") {
    return incoming === "proven_empty" && atPartners === "proven_empty";
  }
  return false;
}

export function ClientsPageChromeProvider({
  accessMode,
  children,
}: {
  accessMode: OwnerClientsAccessMode;
  children: ReactNode;
}) {
  const [incoming, setIncoming] = useState<ClientsDirectionProbeState>("idle");
  const [atPartners, setAtPartners] = useState<ClientsDirectionProbeState>("idle");

  const hideTopChrome = useMemo(
    () => bothDirectionsProvenEmpty(accessMode, incoming, atPartners),
    [accessMode, incoming, atPartners],
  );

  const hideDirectionTabs = useMemo(() => {
    if (accessMode !== "specialist" && accessMode !== "business") return false;
    if (!bothDirectionsProvenEmpty(accessMode, incoming, atPartners)) return false;
    return probeSettled(incoming) && probeSettled(atPartners);
  }, [accessMode, incoming, atPartners]);

  const value = useMemo(
    () => ({
      incoming,
      atPartners,
      setIncoming,
      setAtPartners,
      hideTopChrome,
      hideDirectionTabs,
    }),
    [atPartners, hideDirectionTabs, hideTopChrome, incoming],
  );

  return <ClientsPageChromeContext.Provider value={value}>{children}</ClientsPageChromeContext.Provider>;
}

export function useClientsPageChrome(): ChromeCtx | null {
  return useContext(ClientsPageChromeContext);
}

export function useReportClientsDirectionProbe(direction: "incoming" | "at-partners") {
  const chrome = useClientsPageChrome();
  return useCallback(
    (state: ClientsDirectionProbeState) => {
      if (!chrome) return;
      if (direction === "incoming") chrome.setIncoming(state);
      else chrome.setAtPartners(state);
    },
    [chrome, direction],
  );
}