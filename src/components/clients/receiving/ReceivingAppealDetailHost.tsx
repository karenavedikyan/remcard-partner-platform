"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReceivingAppealDetailMapped } from "./detail-contract-alignment";
import {
  fetchReceivingAppealDetailWire,
  patchReceivingAppealProfileCas,
  patchReceivingAppealStageCas,
  RECEIVING_FINANCE_PATCH_FROZEN,
} from "@/lib/clients-parity/receiving-appeals-api";
import {
  ReceivingAppealDetailView,
  type ReceivingAppealDetailActions,
  type ReceivingAppealDetailProps,
} from "./ReceivingAppealDetailView";
import { receivingAppealDetailWireToP4Mapped } from "./receiving-detail-envelope-bridge";

/** P4 UI reference — read `git show 10c25fe6:.../ReceivingAppealDetailView.tsx` (not vendored again). */
export const P4_RECEIVING_DETAIL_UI_SHA = "10c25fe6" as const;

export type ReceivingAppealDetailHostProps = {
  appealId: string;
  readOnly?: boolean;
  referrerPartnerName?: string | null;
  onBack: () => void;
  onRevisionLoaded?: (revision: number) => void;
  onAppealMutated?: () => void | Promise<void>;
};

type LoadPhase = "loading" | "ready" | "missing" | "error";

export function ReceivingAppealDetailHost({
  appealId,
  readOnly = false,
  referrerPartnerName,
  onBack,
  onRevisionLoaded,
  onAppealMutated,
}: ReceivingAppealDetailHostProps) {
  const [phase, setPhase] = useState<LoadPhase>("loading");
  const [mapped, setMapped] = useState<ReceivingAppealDetailMapped | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState<{ notes?: boolean; stage?: boolean }>({});
  const [actionError, setActionError] = useState<{ notes?: string; stage?: string }>({});
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    setPhase("loading");
    setLoadError(null);
    const res = await fetchReceivingAppealDetailWire(appealId);
    if (!res.ok) {
      if (res.code === "NOT_FOUND") {
        setPhase("missing");
        setMapped(null);
        return;
      }
      setPhase("error");
      setLoadError(res.message);
      setMapped(null);
      return;
    }
    const rev =
      typeof res.wire.revision === "number" ? res.wire.revision : Number(res.wire.revision) || 0;
    setRevision(rev);
    onRevisionLoaded?.(rev);
    setMapped(
      receivingAppealDetailWireToP4Mapped(res.wire, {
        readOnly,
        referrerPartnerName,
      }),
    );
    setActionError({});
    setPhase("ready");
  }, [appealId, onRevisionLoaded, readOnly, referrerPartnerName]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  const actions: ReceivingAppealDetailActions | undefined = useMemo(() => {
    if (readOnly || !mapped || mapped.status !== "ready") return undefined;
    return {
      expectedRevision: revision,
      workingStages: mapped.workingStages,
      refusalReasons: mapped.refusalReasons,
      busy,
      error: actionError,
      onConflict: () => setReloadToken((t) => t + 1),
      markPaid: { supported: false, reason: RECEIVING_FINANCE_PATCH_FROZEN },
      paidReview: {
        supported: false,
        reason: "Категории оплаты — не из profile PATCH (прототип pay panel).",
      },
      shippedConfirm: {
        supported: false,
        reason: "Подтверждение отгрузки — только K1 stage PATCH без finance PATCH.",
      },
      onOpenPurchaseOrder: () => undefined,
      onSavePrivateNotes: async (privateNotes) => {
        setBusy((b) => ({ ...b, notes: true }));
        setActionError((e) => ({ ...e, notes: undefined }));
        const result = await patchReceivingAppealProfileCas(appealId, {
          privateNotes,
          expectedRevision: revision,
        });
        setBusy((b) => ({ ...b, notes: false }));
        if (!result.ok) {
          if (result.code === "CONFLICT") {
            setActionError((e) => ({
              ...e,
              notes: `${result.message} Обновите карточку.`,
            }));
            setReloadToken((t) => t + 1);
            return;
          }
          setActionError((e) => ({ ...e, notes: result.message }));
          return;
        }
        setReloadToken((t) => t + 1);
        await onAppealMutated?.();
      },
      onApplyStage: async (payload) => {
        setBusy((b) => ({ ...b, stage: true }));
        setActionError((e) => ({ ...e, stage: undefined }));
        const result = await patchReceivingAppealStageCas(appealId, {
          stageKey: payload.stageKey,
          refusedReason: payload.refusedReason ?? null,
          expectedRevision: revision,
        });
        setBusy((b) => ({ ...b, stage: false }));
        if (!result.ok) {
          if (result.code === "CONFLICT") {
            setActionError((e) => ({
              ...e,
              stage: `${result.message} Обновите карточку.`,
            }));
            setReloadToken((t) => t + 1);
            return;
          }
          setActionError((e) => ({ ...e, stage: result.message }));
          return;
        }
        setReloadToken((t) => t + 1);
        await onAppealMutated?.();
      },
    };
  }, [actionError, appealId, busy, mapped, onAppealMutated, readOnly, revision]);

  const viewProps = useMemo((): ReceivingAppealDetailProps | null => {
    if (phase === "missing") return { status: "missing", appealId };
    if (phase === "error" && loadError) {
      return {
        status: "error",
        message: loadError,
        onRetry: () => setReloadToken((t) => t + 1),
      };
    }
    if (mapped?.status === "ready") {
      return { ...mapped, actions };
    }
    return null;
  }, [actions, appealId, loadError, mapped, phase]);

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
