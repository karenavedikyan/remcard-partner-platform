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
  buildReceivingAppealDetailReady,
  buildReceivingAppealOrderPipelineHref,
  receivingAppealPurchaseDetailHref,
  type ReceivingAppealDetailMutationOutcome,
  type ReceivingAppealProfilePatchInput,
  type ReceivingAppealStagePatchInput,
} from "./receiving-detail-actions-contract";
import { receivingAppealDetailWireToP4Mapped } from "./receiving-detail-envelope-bridge";

/** P4 read-only dependency: `receiving-detail-actions-contract.ts` @ `6b7c38d3` (Root packages; P6 does not commit P4). */
export const P4_RECEIVING_DETAIL_UI_SHA = "9d22694f" as const;

type WithoutOnBack<T> = T extends unknown ? Omit<T, "onBack"> : never;

/** View body without shell `onBack` — distributive over status union branches. */
export type ReceivingAppealDetailViewModel = WithoutOnBack<ReceivingAppealDetailProps>;

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
  const [notesConflict, setNotesConflict] = useState(false);
  const [notesSaveBlocked, setNotesSaveBlocked] = useState(false);
  const notesSaveBlockedRef = useRef(false);
  const notesInFlightRef = useRef<symbol | null>(null);
  const notesRefreshInFlightRef = useRef<symbol | null>(null);

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
    notesSaveBlockedRef.current = false;
    notesInFlightRef.current = null;
    notesRefreshInFlightRef.current = null;
    setNotesSaveBlocked(false);
    setNotesConflict(false);
    setBusy({});
    setActionError({});
    setDetailRefreshNotice(null);
    const generation = bumpDetailGeneration();
    void fetchDetailForSession(sessionKeyRef.current, generation, true);
  }, [appealId, readOnly, referrerPartnerName, reloadToken, bumpDetailGeneration, fetchDetailForSession]);

  const reloadDetail = useCallback(async () => {
    setReloadToken((t) => t + 1);
  }, []);

  const refreshNotesAfterConflict = useCallback(async () => {
    if (notesRefreshInFlightRef.current) return;
    const session = sessionKeyRef.current;
    const generation = detailGenerationRef.current;
    const operation = Symbol("notes-conflict-refresh");
    notesRefreshInFlightRef.current = operation;
    notesSaveBlockedRef.current = true;
    setNotesSaveBlocked(true);
    setBusy((b) => ({ ...b, notes: true }));
    try {
      const res = await fetchReceivingAppealDetailWire(session.appealId);
      if (isStaleGeneration(generation, session)) return;
      if (res.ok) {
        // Keep the mounted view and its dirty draft. Only the server snapshot/revision changes.
        applyDetailWire(session, res);
        notesSaveBlockedRef.current = false;
        setNotesSaveBlocked(false);
        setActionError((e) => ({
          ...e,
          notes: "Карточка изменилась. Ваш черновик сохранён. Проверьте актуальную заметку и нажмите «Сохранить» для повторного сохранения.",
        }));
      } else {
        setActionError((e) => ({
          ...e,
          notes: "Карточка изменилась. Ваш черновик сохранён, но актуальную версию загрузить не удалось. Повторите обновление карточки перед сохранением.",
        }));
      }
    } finally {
      // An old response may release only its own token, never the next session's operation.
      if (notesRefreshInFlightRef.current === operation) {
        notesRefreshInFlightRef.current = null;
        if (!isStaleGeneration(generation, session)) {
          setBusy((b) => ({ ...b, notes: false }));
        }
      }
    }
  }, [applyDetailWire, isStaleGeneration]);

  const afterSuccessfulMutation = useCallback(async () => {
    const session = sessionKeyRef.current;
    const generation = detailGenerationRef.current;
    let listRefreshFailed = false;
    try {
      await onAppealMutated?.();
    } catch {
      // The PATCH has already succeeded. A failed parent refresh must not lock the form
      // or prevent the detail GET from obtaining the new revision.
      listRefreshFailed = true;
    }
    if (isStaleGeneration(generation, session)) return;
    const refreshed = await refreshMappedDetail();
    if (listRefreshFailed && refreshed && !isStaleGeneration(generation, session)) {
      setDetailRefreshNotice(
        "Изменения сохранены, но список клиентов не удалось обновить. Вернитесь к списку и обновите его.",
      );
    }
  }, [onAppealMutated, refreshMappedDetail, isStaleGeneration]);

  const onOpenOrderPipeline = useCallback(() => {
    router.push(buildReceivingAppealOrderPipelineHref(appealId));
  }, [appealId, router]);

  const openPurchaseOrder = useCallback(() => {
    if (mapped?.status !== "ready") return;
    const orderId = mapped.appeal.purchaseOrderId?.trim();
    if (!orderId) return;
    router.push(receivingAppealPurchaseDetailHref(orderId, appealId));
  }, [appealId, mapped, router]);

  const mutateProfile = useCallback(
    async (body: ReceivingAppealProfilePatchInput): Promise<ReceivingAppealDetailMutationOutcome> => {
      if (notesInFlightRef.current || notesSaveBlockedRef.current) {
        return { ok: false, conflict: false, message: "Дождитесь обновления карточки." };
      }
      const session = sessionKeyRef.current;
      const generation = detailGenerationRef.current;
      const operation = Symbol("notes-save");
      notesInFlightRef.current = operation;
      setBusy((b) => ({ ...b, notes: true }));
      setActionError((e) => ({ ...e, notes: undefined }));
      try {
        const result = await patchReceivingAppealProfileCas(appealId, {
          privateNotes: body.privateNotes,
          expectedRevision: body.expectedRevision,
        });
        const outcome = toMutationOutcome(result);
        if (isStaleGeneration(generation, session)) return outcome;
        if (!outcome.ok) {
          if (outcome.conflict) {
            setNotesConflict(true);
            await refreshNotesAfterConflict();
          } else {
            setActionError((e) => ({ ...e, notes: outcome.message }));
          }
          return outcome;
        }
        setNotesConflict(false);
        await afterSuccessfulMutation();
        return { ok: true };
      } finally {
        if (notesInFlightRef.current === operation) {
          notesInFlightRef.current = null;
          if (!isStaleGeneration(generation, session)) {
            setBusy((b) => ({ ...b, notes: false }));
          }
        }
      }
    },
    [afterSuccessfulMutation, appealId, isStaleGeneration, refreshNotesAfterConflict],
  );

  const mutateStage = useCallback(
    async (body: ReceivingAppealStagePatchInput): Promise<ReceivingAppealDetailMutationOutcome> => {
      if (notesSaveBlockedRef.current || notesInFlightRef.current) {
        return { ok: false, conflict: false, message: "Дождитесь обновления карточки." };
      }
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
        notesConflict,
        notesSaveBlocked,
        onNotesConflictRefresh:
          notesConflict && notesSaveBlocked ? () => void refreshNotesAfterConflict() : undefined,
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
    notesConflict,
    notesSaveBlocked,
    refreshNotesAfterConflict,
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
