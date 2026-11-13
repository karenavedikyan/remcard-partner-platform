"use client";

import { useEffect, useState } from "react";
import { fetchReceivingAppealsWorkspace, type ReceivingAppealsLoadResult } from "@/lib/clients-parity/receiving-appeals-api";
import { ReceivingAppealsBlocked } from "@/components/clients/direction/ReceivingAppealsBlocked";
import { ReceivingAppealsList } from "./ReceivingAppealsList";

type LoadPhase = "loading" | "blocked" | "ready" | "error";

export function ReceivingAppealsWorkspace() {
  const [phase, setPhase] = useState<LoadPhase>("loading");
  const [blocked, setBlocked] = useState<ReceivingAppealsLoadResult | null>(null);
  const [ready, setReady] = useState<Extract<ReceivingAppealsLoadResult, { ok: true }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchReceivingAppealsWorkspace().then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setPhase(res.code === "BLOCKED_CONTRACT" ? "blocked" : "error");
        setBlocked(res);
        setReady(null);
        return;
      }
      setPhase("ready");
      setReady(res);
      setBlocked(null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase === "loading") {
    return <p data-testid="ca-receiving-appeals-loading">Загрузка…</p>;
  }

  if (phase === "blocked") {
    return <ReceivingAppealsBlocked />;
  }

  if (phase === "error" && blocked && !blocked.ok) {
    return (
      <section data-testid="ca-receiving-appeals-error" role="alert">
        <p>{blocked.message}</p>
      </section>
    );
  }

  if (phase === "ready" && ready) {
    return <ReceivingAppealsList data={ready.data} />;
  }

  return <ReceivingAppealsBlocked />;
}
