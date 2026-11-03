"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import { isCabinetShellAuthFailure } from "@/lib/cabinet-shell-auth-failure";
import { useCabinetShellContext } from "@/components/layout/cabinet-shell-context";
import { countNeedsMyResponse } from "@/lib/partnership-rules";
import type { PartnershipListResponse } from "@/lib/types";

/**
 * Keeps the partners sidebar badge fresh when the cabinet layout persists across navigations.
 * One list fetch per pathname change (same volume as the former per-navigation server shell fetch).
 */
export function useIncomingPartnersCount(initialCount: number, userId: string | undefined): number {
  const pathname = usePathname();
  const router = useRouter();
  const shell = useCabinetShellContext();
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
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (isCabinetShellAuthFailure(error)) {
          setCount(0);
          shell?.notifyAuthFailure();
          router.refresh();
          return;
        }
        if (error instanceof RemcardApiError) {
          /* transient non-auth errors: keep last known count */
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pathname, userId, router, shell]);

  return count;
}
