"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Reconcile SSR presentation snapshot after branch/context switch (no reload loop). */
export function CabinetPresentationRefreshListener() {
  const router = useRouter();
  const refreshingRef = useRef(false);

  useEffect(() => {
    const onPresentationChanged = () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      router.refresh();
      window.setTimeout(() => {
        refreshingRef.current = false;
      }, 500);
    };
    window.addEventListener("remcard:cabinet-presentation-changed", onPresentationChanged);
    return () => {
      window.removeEventListener("remcard:cabinet-presentation-changed", onPresentationChanged);
    };
  }, [router]);

  return null;
}
