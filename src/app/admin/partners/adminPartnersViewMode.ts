"use client";

import { useEffect, useState } from "react";
import { VIEW_MODE_STORAGE_KEY } from "./adminPartnersRegistryConstants";

/** Mobile dense list; desktop/table/card preferences use wider breakpoint elsewhere. */
export const PARTNERS_MOBILE_DENSE_MQ = "(max-width: 720px)";

export type PartnersStoredViewMode = "table" | "cards";
export type PartnersEffectiveViewMode = PartnersStoredViewMode | "dense";

function readStoredViewMode(): PartnersStoredViewMode {
  if (typeof window === "undefined") return "table";
  const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  if (stored === "table" || stored === "cards") return stored;
  return window.matchMedia("(max-width: 1000px)").matches ? "cards" : "table";
}

export function usePartnersRegistryViewMode() {
  const [storedViewMode, setStoredViewMode] = useState<PartnersStoredViewMode>("table");
  const [mobileDense, setMobileDense] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setStoredViewMode(readStoredViewMode());
    const mq = window.matchMedia(PARTNERS_MOBILE_DENSE_MQ);
    const sync = () => setMobileDense(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    setReady(true);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!ready || mobileDense) return;
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, storedViewMode);
  }, [storedViewMode, ready, mobileDense]);

  const effectiveViewMode: PartnersEffectiveViewMode = mobileDense ? "dense" : storedViewMode;

  return {
    storedViewMode,
    setStoredViewMode,
    effectiveViewMode,
    mobileDense,
    ready,
  };
}
