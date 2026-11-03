"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { remcardFetch } from "@/lib/api-client";
import { countNeedsMyResponse } from "@/lib/partnership-rules";
import type { PartnershipListResponse } from "@/lib/types";

/**
 * Keeps the partners sidebar badge fresh when the cabinet layout persists across navigations.
 * One list fetch per pathname change (same volume as the former per-navigation server shell fetch).
 */
export function useIncomingPartnersCount(initialCount: number, userId: string | undefined): number {
  const pathname = usePathname();
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    let cancelled = false;
    void remcardFetch<PartnershipListResponse>("/api/partnership/list", {
      signal: controller.signal,
    })
      .then((data) => {
        if (cancelled) return;
        setCount(countNeedsMyResponse(data.partnerships ?? [], userId));
      })
      .catch(() => {
        /* keep last known count on transient errors */
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pathname, userId]);

  return count;
}
