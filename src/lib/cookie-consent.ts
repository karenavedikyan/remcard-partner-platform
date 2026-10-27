export type CookieCategory = "necessary" | "analytics" | "marketing";

export interface CookieConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
  version: string;
}

export const COOKIE_CONSENT_VERSION = "1.0";
export const COOKIE_CONSENT_KEY = "remcard-cookie-consent";
export const COOKIE_CONSENT_HTTP = "cookie-consent";

export function makeRejectAllConsent(): CookieConsentState {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
    decidedAt: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };
}

/** Analytics on; marketing stays off (no marketing opt-in on PROF). */
export function makeAnalyticsAcceptedConsent(): CookieConsentState {
  return {
    necessary: true,
    analytics: true,
    marketing: false,
    decidedAt: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };
}

export function makeCustomConsent(analytics: boolean): CookieConsentState {
  return {
    necessary: true,
    analytics,
    marketing: false,
    decidedAt: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };
}

export function readCookieConsent(): CookieConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentState;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    if (typeof parsed.analytics !== "boolean") return null;
    if (parsed.necessary !== true) return null;
    return { ...parsed, marketing: false };
  } catch {
    return null;
  }
}

export function writeCookieConsent(state: CookieConsentState) {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: state }));
  } catch {
    /* ignore */
  }
}

export function syncCookieConsentHttp(state: CookieConsentState) {
  if (typeof document === "undefined") return;
  const payload = {
    necessary: true as const,
    analytics: state.analytics,
    marketing: false,
    decidedAt: state.decidedAt,
    version: state.version,
  };
  document.cookie = `${COOKIE_CONSENT_HTTP}=${encodeURIComponent(JSON.stringify(payload))}; path=/; max-age=31536000; SameSite=Lax`;
}

export function analyticsAllowed(state: CookieConsentState | null | undefined): boolean {
  return state?.analytics === true;
}
