"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchReceivingAppealDetailWire } from "@/lib/clients-parity/receiving-appeals-api";
import { ReceivingAppealDetailView, type ReceivingAppealDetailProps } from "./ReceivingAppealDetailView";
import { receivingAppealDetailWireToP4Mapped } from "./receiving-detail-envelope-bridge";

export type ReceivingAppealDetailHostProps = {
  appealId: string;
  readOnly?: boolean;
  referrerPartnerName?: string | null;
  onBack: () => void;
  onRevisionLoaded?: (revision: number) => void;
};

type LoadPhase = "loading" | "ready";

export function ReceivingAppealDetailHost({
  appealId,
  readOnly = false,
  referrerPartnerName,
  onBack,
  onRevisionLoaded,
}: ReceivingAppealDetailHostProps) {
  const [phase, setPhase] = useState<LoadPhase>("loading");
  const [viewProps, setViewProps] = useState<ReceivingAppealDetailProps | null>(null);

  const load = useCallback(async () => {
    setPhase("loading");
    const res = await fetchReceivingAppealDetailWire(appealId);
    if (!res.ok) {
      if (res.code === "NOT_FOUND") {
        setViewProps({ status: "missing", appealId });
      } else {
        setViewProps({
          status: "error",
          message: res.message,
          onRetry: () => void load(),
        });
      }
      setPhase("ready");
      return;
    }
    const mapped = receivingAppealDetailWireToP4Mapped(res.wire, {
      readOnly,
      referrerPartnerName,
    });
    onRevisionLoaded?.(mapped.revision);
    setViewProps(mapped);
    setPhase("ready");
  }, [appealId, onRevisionLoaded, readOnly, referrerPartnerName]);

  useEffect(() => {
    void load();
  }, [load]);

  if (phase === "loading") {
    return (
      <section className="panel stack" data-testid="ca-receiving-detail-loading" aria-busy="true">
        <p>Загрузка обращения…</p>
      </section>
    );
  }

  if (!viewProps) {
    return (
      <section className="panel stack" data-testid="ca-receiving-detail-empty" role="alert">
        <p>Не удалось подготовить карточку обращения.</p>
        <button type="button" className="btn ghost" onClick={onBack}>
          К списку
        </button>
      </section>
    );
  }

  return <ReceivingAppealDetailView {...viewProps} onBack={onBack} />;
}
