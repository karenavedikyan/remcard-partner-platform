"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchReceivingAppealDetailWire,
  patchReceivingAppealProfileCas,
  patchReceivingAppealStageCas,
} from "@/lib/clients-parity/receiving-appeals-api";
import { ReceivingAppealDetailView, type ReceivingAppealDetailProps } from "./ReceivingAppealDetailView";
import {
  buildReceivingAppealDetailReady,
  type ReceivingAppealDetailMutationOutcome,
  type ReceivingAppealProfilePatchInput,
  type ReceivingAppealStagePatchInput,
} from "./receiving-detail-actions-contract";
import { receivingAppealDetailWireToP4Mapped } from "./receiving-detail-envelope-bridge";

/** P4 UI + contract — `git show 497f313d:src/components/clients/receiving/` (Root merges P4 owner tip). */
export const P4_RECEIVING_DETAIL_UI_SHA = "497f313d" as const;

export type ReceivingAppealDetailHostProps = {
  appealId: string;
  readOnly?: boolean;
  referrerPartnerName?: string | null;
  onBack: () => void;
  onRevisionLoaded?: (revision: number) => void;
  onAppealMutated?: () => void | Promise<void>;
};

type LoadPhase = "loading" | "ready" | "missing" | "error";

function toMutationOutcome(
  result:
    | Awaited<ReturnType<typeof patchReceivingAppealProfileCas>>
    | Awaited<ReturnType<typeof patchReceivingAppealStageCas>>,
): ReceivingAppealDetailMutationOutcome {
  if (result.ok) return { ok: true };
  return {
    ok: false,
    conflict: result.code === "CONFLICT",
    message: result.message,
  };
}

export function ReceivingAppealDetailHost({
  appealId,
  readOnly = false,
  referrerPartnerName,
  onBack,
  onRevisionLoaded,
  onAppealMutated,
}: ReceivingAppealDetailHostProps) {
  const [phase, setPhase] = useState<LoadPhase>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapped, setMapped] = useState<ReturnType<typeof receivingAppealDetailWireToP4Mapped> | null>(
    null,
  );
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

  const reloadDetail = useCallback(async () => {
    setReloadToken((t) => t + 1);
  }, []);

  const mutateProfile = useCallback(
    async (body: ReceivingAppealProfilePatchInput): Promise<ReceivingAppealDetailMutationOutcome> => {
      setBusy((b) => ({ ...b, notes: true }));
      setActionError((e) => ({ ...e, notes: undefined }));
      const result = await patchReceivingAppealProfileCas(appealId, {
        privateNotes: body.privateNotes,
        expectedRevision: body.expectedRevision,
      });
      setBusy((b) => ({ ...b, notes: false }));
      const outcome = toMutationOutcome(result);
      if (!outcome.ok) {
        setActionError((e) => ({ ...e, notes: outcome.message }));
      } else {
        await onAppealMutated?.();
      }
      return outcome;
    },
    [appealId, onAppealMutated],
  );

  const mutateStage = useCallback(
    async (body: ReceivingAppealStagePatchInput): Promise<ReceivingAppealDetailMutationOutcome> => {
      setBusy((b) => ({ ...b, stage: true }));
      setActionError((e) => ({ ...e, stage: undefined }));
      const result = await patchReceivingAppealStageCas(appealId, {
        stageKey: body.stageKey,
        refusedReason: body.refusedReason ?? null,
        expectedRevision: body.expectedRevision,
      });
      setBusy((b) => ({ ...b, stage: false }));
      const outcome = toMutationOutcome(result);
      if (!outcome.ok) {
        setActionError((e) => ({ ...e, stage: outcome.message }));
      } else {
        await onAppealMutated?.();
      }
      return outcome;
    },
    [appealId, onAppealMutated],
  );

  const viewProps = useMemo((): ReceivingAppealDetailProps | null => {
    if (phase === "missing") return { status: "missing", appealId };
    if (phase === "error" && loadError) {
      return {
        status: "error",
        message: loadError,
        onRetry: () => setReloadToken((t) => t + 1),
      };
    }
    if (phase === "ready" && mapped?.status === "ready") {
      return buildReceivingAppealDetailReady({
        appealId,
        mapped,
        readOnly,
        busy,
        error: actionError,
        mutateProfile,
        mutateStage,
        reloadDetail,
      });
    }
    return null;
  }, [
    actionError,
    appealId,
    busy,
    loadError,
    mapped,
    mutateProfile,
    mutateStage,
    phase,
    readOnly,
    reloadDetail,
  ]);

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
