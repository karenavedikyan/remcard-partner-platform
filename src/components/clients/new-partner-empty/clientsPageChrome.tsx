"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { OwnerClientsAccessMode } from "@/components/clients/OwnerClientsModeContext";

export type ClientsDirectionProbeState =
  | "idle"
  | "loading"
  | "blocked"
  | "error"
  | "not_empty"
  | "proven_empty";

export type ClientsChromeDirection = "incoming" | "at-partners";

type SubviewState = { incoming: boolean; "at-partners": boolean };

type ChromeCtx = {
  incoming: ClientsDirectionProbeState;
  atPartners: ClientsDirectionProbeState;
  setIncoming: Dispatch<SetStateAction<ClientsDirectionProbeState>>;
  setAtPartners: Dispatch<SetStateAction<ClientsDirectionProbeState>>;
  hideTopChrome: boolean;
  hideDirectionTabs: boolean;
  /** Direction whose list the page shows (drives the page subtitle). */
  activeDirection: ClientsChromeDirection;
  setActiveDirection: Dispatch<SetStateAction<ClientsChromeDirection>>;
  /** A full-screen sub-view (card, analytics, stages…) of the active direction is open: no page header, no switcher. */
  subviewOpen: boolean;
  setSubviewFor: (direction: ClientsChromeDirection, open: boolean) => void;
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
  const [activeDirection, setActiveDirection] = useState<ClientsChromeDirection>(
    accessMode === "agent" ? "at-partners" : "incoming",
  );
  const [subviews, setSubviews] = useState<SubviewState>({ incoming: false, "at-partners": false });
  const setSubviewFor = useCallback((direction: ClientsChromeDirection, open: boolean) => {
    setSubviews((cur) => (cur[direction] === open ? cur : { ...cur, [direction]: open }));
  }, []);
  const subviewOpen = subviews[activeDirection];

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
      activeDirection,
      setActiveDirection,
      subviewOpen,
      setSubviewFor,
    }),
    [activeDirection, atPartners, hideDirectionTabs, hideTopChrome, incoming, setSubviewFor, subviewOpen],
  );

  return <ClientsPageChromeContext.Provider value={value}>{children}</ClientsPageChromeContext.Provider>;
}

export function useClientsPageChrome(): ChromeCtx | null {
  return useContext(ClientsPageChromeContext);
}

/** Stable React state setter — safe in effect dependency arrays. */
export function useClientsDirectionProbeSetter(
  direction: "incoming" | "at-partners",
): Dispatch<SetStateAction<ClientsDirectionProbeState>> | undefined {
  const chrome = useClientsPageChrome();
  return direction === "incoming" ? chrome?.setIncoming : chrome?.setAtPartners;
}

export function useReportClientsDirectionProbe(direction: "incoming" | "at-partners") {
  const setIncoming = useClientsPageChrome()?.setIncoming;
  const setAtPartners = useClientsPageChrome()?.setAtPartners;
  return useCallback(
    (state: ClientsDirectionProbeState) => {
      if (direction === "incoming") setIncoming?.(state);
      else setAtPartners?.(state);
    },
    [direction, setAtPartners, setIncoming],
  );
}

/** Reports that a full-screen sub-view is (not) open so the page header and the direction switcher step aside. */
export function useReportClientsSubview(direction: ClientsChromeDirection, open: boolean) {
  const setSubviewFor = useClientsPageChrome()?.setSubviewFor;
  useEffect(() => {
    if (!setSubviewFor) return;
    setSubviewFor(direction, open);
    return () => setSubviewFor(direction, false);
  }, [direction, open, setSubviewFor]);
}
