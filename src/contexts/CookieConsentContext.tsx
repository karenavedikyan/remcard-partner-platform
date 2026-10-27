"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  type CookieConsentState,
  readCookieConsent,
  writeCookieConsent,
  syncCookieConsentHttp,
  makeRejectAllConsent,
  makeAnalyticsAcceptedConsent,
  makeCustomConsent,
} from "@/lib/cookie-consent";

interface Ctx {
  state: CookieConsentState | null;
  needsDecision: boolean;
  acceptAnalytics: () => void;
  rejectAnalytics: () => void;
  setAnalyticsEnabled: (enabled: boolean) => void;
}

const CookieConsentContext = createContext<Ctx | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CookieConsentState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initial = readCookieConsent();
    setState(initial);
    if (initial) syncCookieConsentHttp(initial);
    setHydrated(true);
    const onChange = (e: Event) => {
      const ce = e as CustomEvent<CookieConsentState>;
      setState(ce.detail);
      syncCookieConsentHttp(ce.detail);
    };
    window.addEventListener("cookie-consent-changed", onChange);
    return () => window.removeEventListener("cookie-consent-changed", onChange);
  }, []);

  const persist = useCallback((next: CookieConsentState) => {
    writeCookieConsent(next);
    syncCookieConsentHttp(next);
    setState(next);
  }, []);

  const acceptAnalytics = useCallback(() => {
    persist(makeAnalyticsAcceptedConsent());
  }, [persist]);

  const rejectAnalytics = useCallback(() => {
    persist(makeRejectAllConsent());
  }, [persist]);

  const setAnalyticsEnabled = useCallback(
    (enabled: boolean) => {
      persist(makeCustomConsent(enabled));
    },
    [persist],
  );

  const needsDecision = hydrated && state === null;

  return (
    <CookieConsentContext.Provider
      value={{ state, needsDecision, acceptAnalytics, rejectAnalytics, setAnalyticsEnabled }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error("useCookieConsent must be used within CookieConsentProvider");
  return ctx;
}
