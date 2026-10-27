"use client";

import { useEffect } from "react";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { analyticsAllowed } from "@/lib/cookie-consent";
import { recordProfSessionVisit } from "@/lib/prof-admin-management-api";

/** Partner cabinet activity signal when analytics consent is on (re-fires on consent change). */
export function ProfPartnerSessionVisit() {
  const { state } = useCookieConsent();

  useEffect(() => {
    if (!analyticsAllowed(state)) return;
    void recordProfSessionVisit().catch(() => {});
  }, [state?.analytics, state?.decidedAt]);

  return null;
}
