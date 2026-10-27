"use client";

import { useEffect, useRef } from "react";
import { recordProfSessionVisit } from "@/lib/prof-admin-management-api";

/** Partner cabinet activity signal (server dedupes; requires analytics consent cookie). */
export function ProfPartnerSessionVisit() {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void recordProfSessionVisit().catch(() => {});
  }, []);
  return null;
}
