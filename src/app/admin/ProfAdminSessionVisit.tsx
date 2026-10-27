"use client";

import { useEffect, useRef } from "react";
import { recordProfSessionVisit } from "@/lib/prof-admin-management-api";

/** One deduped PROF session visit signal per admin mount (server dedupes 30 min). */
export function ProfAdminSessionVisit() {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void recordProfSessionVisit().catch(() => {});
  }, []);
  return null;
}
