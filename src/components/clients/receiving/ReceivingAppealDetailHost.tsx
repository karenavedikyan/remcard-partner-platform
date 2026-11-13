"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchReceivingAppealDetailWire,
  patchReceivingAppealProfileCas,
  patchReceivingAppealStageCas,
} from "@/lib/clients-parity/receiving-appeals-api";
import { ReceivingAppealDetailView, type ReceivingAppealDetailProps } from "./ReceivingAppealDetailView";
import {
  RECEIVING_APPEAL_ORDER_PIPELINE_HREF,
  buildReceivingAppealDetailReady,
  receivingAppealPurchaseDetailHref,
  type ReceivingAppealDetailMutationOutcome,
  type ReceivingAppealProfilePatchInput,
  type ReceivingAppealStagePatchInput,
} from "./receiving-detail-actions-contract";
import { receivingAppealDetailWireToP4Mapped } from "./receiving-detail-envelope-bridge";

/** P4 read-only dependency: `receiving-detail-actions-contract.ts` @ `6b7c38d3` (Root packages; P6 does not commit P4). */
export const P4_RECEIVING_DETAIL_UI_SHA = "6b7c38d3" as const;

/** View body without shell `onBack` — host passes `onBack` at render site. */
export type ReceivingAppealDetailViewModel = Omit<ReceivingAppealDetailProps, "onBack">;

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

type DetailSessionKey = {
  appealId: string;
  readOnly: boolean;
  referrerPartnerName: string | null | undefined;
};

export function ReceivingAppealDetailHost({
  appealId,
  readOnly = false,
  referrerPartnerName,
  onBack,
  onRevisionLoaded,
  onAppealMutated,
}: ReceivingAppealDetailHostProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<LoadPhase>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapped, setMapped] = useState<ReturnType<typeof receivingAppealDetailWireToP4Mapped> | null>(
    null,
  );
  const [busy, setBusy] = useState<{ notes?: boolean; stage?: boolean }>({});
  const [actionError, setActionError] = useState<{ notes?: string; stage?: string }>({});
  const [detailRefreshNotice, setDetailRefreshNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const detailGenerationRef = useRef(0);
  const sessionKeyRef = useRef<DetailSessionKey>({
    appealId,
    readOnly,
    referrerPartnerName,
  });

  const bumpDetailGeneration = useCallback(() => {
    detailGenerationRef.current += 1;
    return detailGenerationRef.current;
  }, []);

  const isStaleGeneration = useCallback(
    (generation: number, session: DetailSessionKey) => {
      if (generation !== detailGenerationRef.current) return true;
      const cur = sessionKeyRef.current;
      return (
        cur.appealId !== session.appealId ||
        cur.readOnly !== session.readOnly ||
        cur.referrerPartnerName !== session.referrerPartnerName
      );
    },
    [],
  );

  const applyDetailWire = useCallback(
    (
      session: DetailSessionKey,
      res: Awaited<ReturnType<typeof fetchReceivingAppealDetailWire>>,
    ) => {
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
          readOnly: session.readOnly,
          referrerPartnerName: session.referrerPartnerName,
        }),
      );
      setActionError({});
      setPhase("ready");
    },
    [onRevisionLoaded],
  );

  const fetchDetailForSession = useCallback(
    async (session: DetailSessionKey, generation: number, showLoading: boolean) => {
      if (showLoading) {
        setPhase("loading");
        setLoadError(null);
      }
      const res = await fetchReceivingAppealDetailWire(session.appealId);
      if (isStaleGeneration(generation, session)) {
        return { applied: false as const, stale: true as const };
      }
      if (!res.ok) {
        if (showLoading) {
          applyDetailWire(session, res);
          return { applied: true as const, stale: false as const, ok: false as const };
        }
        return { applied: false as const, stale: false as const, ok: false as const };
      }
      applyDetailWire(session, res);
      return { applied: true as const, stale: false as const, ok: true as const };
    },
    [applyDetailWire, isStaleGeneration],
  );

  const refreshMappedDetail = useCallback(async (): Promise<boolean> => {
    const session = sessionKeyRef.current;
    const generation = detailGenerationRef.current;
    const result = await fetchDetailForSession(session, generation, false);
    if (result.stale) return false;
    if (result.ok === false) {
      setDetailRefreshNotice(
        "Сохранено; карточку не удалось обновить — обновите страницу или откройте карточку снова.",
      );
      return false;
    }
    if (!result.applied) return false;
    setDetailRefreshNotice(null);
    return true;
  }, [fetchDetailForSession]);

  useEffect(() => {
    sessionKeyRef.current = { appealId, readOnly, referrerPartnerName };
    const generation = bumpDetailGeneration();
    void fetchDetailForSession(sessionKeyRef.current, generation, true);
  }, [appealId, readOnly, referrerPartnerName, reloadToken, bumpDetailGeneration, fetchDetailForSession]);

  const reloadDetail = useCallback(async () => {
    setReloadToken((t) => t + 1);
  }, []);

  const afterSuccessfulMutation = useCallback(async () => {
    await onAppealMutated?.();
    await refreshMappedDetail();
  }, [onAppealMutated, refreshMappedDetail]);

  const onOpenOrderPipeline = useCallback(() => {
    router.push(RECEIVING_APPEAL_ORDER_PIPELINE_HREF);
  }, [router]);

  const openPurchaseOrder = useCallback(() => {
    if (mapped?.status !== "ready") return;
    const orderId = mapped.appeal.purchaseOrderId?.trim();
    if (!orderId) return;
    router.push(receivingAppealPurchaseDetailHref(orderId));
  }, [mapped, router]);

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
        return outcome;
      }
      await afterSuccessfulMutation();
      return { ok: true };
    },
    [afterSuccessfulMutation, appealId],
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
        return outcome;
      }
      await afterSuccessfulMutation();
      return { ok: true };
    },
    [afterSuccessfulMutation, appealId],
  );

  const viewProps = useMemo((): ReceivingAppealDetailViewModel | null => {
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
        onOpenOrderPipeline: readOnly ? undefined : onOpenOrderPipeline,
        openPurchaseOrder:
          readOnly || !mapped.appeal.purchaseOrderId?.trim() ? undefined : openPurchaseOrder,
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
    onOpenOrderPipeline,
    openPurchaseOrder,
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

  return (
    <>
      {detailRefreshNotice ? (
        <p className="notice" role="status" data-testid="ca-receiving-detail-refresh-notice">
          {detailRefreshNotice}
        </p>
      ) : null}
      <ReceivingAppealDetailView {...viewProps} onBack={onBack} />
    </>
  );
}
