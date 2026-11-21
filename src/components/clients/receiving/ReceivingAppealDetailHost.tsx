"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchReceivingAppealDetailWire,
  patchReceivingAppealProfileCas,
  patchReceivingAppealStageCas,
  postReceivingWorkingStagesMutation,
  receivingDetailWireReadOnly,
  type ReceivingAppealDetailWire,
  type ReceivingReadScope,
} from "@/lib/clients-parity/receiving-appeals-api";
import {
  ReceivingAppealDetailView,
  type ReceivingAppealDetailProps,
  type ReceivingSettingsAddResult,
} from "./ReceivingAppealDetailView";
import type { StageLike } from "./receiving-detail-stage-model";
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
  /** Explicit list scope the card was opened from; used for reads only, never for mutations. */
  readScope?: ReceivingReadScope | null;
  /** P149 drawer companion: stage, scan, notes — without duplicate profile chrome. */
  companionProfPanel?: boolean;
  companionProfileBusy?: boolean;
  committedRevision?: number;
  onRevisionCommitted?: (revision: string | number) => void;
  onDetailRefreshed?: (wire: ReceivingAppealDetailWire) => void;
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
  readScope,
  companionProfPanel = false,
  companionProfileBusy = false,
  committedRevision,
  onRevisionCommitted,
  onDetailRefreshed,
  onBack,
  onRevisionLoaded,
  onAppealMutated,
}: ReceivingAppealDetailHostProps) {
  const router = useRouter();
  const readScopeRef = useRef<ReceivingReadScope | null>(readScope ?? null);
  readScopeRef.current = readScope ?? null;
  const [phase, setPhase] = useState<LoadPhase>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapped, setMapped] = useState<ReturnType<typeof receivingAppealDetailWireToP4Mapped> | null>(
    null,
  );
  /** The server's per-card answer; a card is editable only when the prop allows it AND this appeal's own flags do. */
  const [detailReadOnly, setDetailReadOnly] = useState(true);
  const detailReadOnlyRef = useRef(true);
  const effectiveReadOnly = readOnly || detailReadOnly;
  const [busy, setBusy] = useState<{ notes?: boolean; stage?: boolean }>({});
  const [actionError, setActionError] = useState<{ notes?: string; stage?: string }>({});
  const [detailRefreshNotice, setDetailRefreshNotice] = useState<string | null>(null);
  const [notesConflict, setNotesConflict] = useState(false);
  const [notesSaveBlocked, setNotesSaveBlocked] = useState(false);
  const notesSaveBlockedRef = useRef(false);
  const notesInFlightRef = useRef<symbol | null>(null);
  const notesRefreshInFlightRef = useRef<symbol | null>(null);

  const detailGenerationRef = useRef(0);
  const [reloadToken, setReloadToken] = useState(0);
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
      const cardReadOnly = receivingDetailWireReadOnly(res.wire, {
        scopeAll: readScopeRef.current?.branchScope === "all",
      });
      detailReadOnlyRef.current = cardReadOnly;
      setDetailReadOnly(cardReadOnly);
      setMapped(
        receivingAppealDetailWireToP4Mapped(res.wire, {
          readOnly: session.readOnly || cardReadOnly,
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
      const res = await fetchReceivingAppealDetailWire(session.appealId, readScopeRef.current);
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
      return { applied: true as const, stale: false as const, ok: true as const, wire: res.wire };
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
    if (result.ok) onDetailRefreshed?.(result.wire);
    setDetailRefreshNotice(null);
    return true;
  }, [fetchDetailForSession, onDetailRefreshed]);

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
    const session = sessionKeyRef.current;
    const generation = detailGenerationRef.current;
    const res = await fetchReceivingAppealDetailWire(session.appealId, readScopeRef.current);
    if (isStaleGeneration(generation, session)) return;
    if (res.ok) {
      applyDetailWire(session, res);
      setActionError({
        stage: "Карточка изменилась — данные обновлены. Проверьте этап и повторите действие.",
      });
    } else {
      setActionError((e) => ({
        ...e,
        stage: "Карточка изменилась, но обновить её не удалось. Обновите страницу и повторите действие.",
      }));
    }
  }, [applyDetailWire, isStaleGeneration]);

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
      const res = await fetchReceivingAppealDetailWire(session.appealId, readScopeRef.current);
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
      if (detailReadOnlyRef.current || sessionKeyRef.current.readOnly) {
        return { ok: false, conflict: false, message: "Карточка доступна только для просмотра." };
      }
      if (companionProfileBusy || notesInFlightRef.current || notesSaveBlockedRef.current) {
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
          expectedRevision: Math.max(body.expectedRevision, committedRevision ?? 0),
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
        if (result.ok && result.revision != null) onRevisionCommitted?.(result.revision);
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
    [afterSuccessfulMutation, appealId, committedRevision, companionProfileBusy, isStaleGeneration, onRevisionCommitted, refreshNotesAfterConflict],
  );

  const mutateStage = useCallback(
    async (body: ReceivingAppealStagePatchInput): Promise<ReceivingAppealDetailMutationOutcome> => {
      if (detailReadOnlyRef.current || sessionKeyRef.current.readOnly) {
        return { ok: false, conflict: false, message: "Карточка доступна только для просмотра." };
      }
      if (companionProfileBusy || notesSaveBlockedRef.current || notesInFlightRef.current) {
        return { ok: false, conflict: false, message: "Дождитесь обновления карточки." };
      }
      setBusy((b) => ({ ...b, stage: true }));
      setActionError((e) => ({ ...e, stage: undefined }));
      const result = await patchReceivingAppealStageCas(appealId, {
        stageKey: body.stageKey,
        refusedReason: body.refusedReason ?? null,
        ...(body.shippedAt ? { shippedAt: body.shippedAt } : {}),
        expectedRevision: Math.max(body.expectedRevision, committedRevision ?? 0),
      });
      setBusy((b) => ({ ...b, stage: false }));
      const outcome = toMutationOutcome(result);
      if (!outcome.ok) {
        setActionError((e) => ({ ...e, stage: outcome.message }));
        return outcome;
      }
      if (result.ok && result.revision != null) onRevisionCommitted?.(result.revision);
      await afterSuccessfulMutation();
      return { ok: true };
    },
    [afterSuccessfulMutation, appealId, committedRevision, companionProfileBusy, onRevisionCommitted],
  );

  const addRefusalReason = useCallback(
    async (label: string): Promise<ReceivingSettingsAddResult<string>> => {
      const res = await postReceivingWorkingStagesMutation({ kind: "addRefusalReason", label });
      if (!res.ok) return { ok: false, message: res.message };
      const saved =
        res.snapshot.settings.refusalReasons.find((r) => r.trim().toLowerCase() === label.trim().toLowerCase()) ??
        label.trim();
      return { ok: true, value: saved };
    },
    [],
  );

  const addWorkingStage = useCallback(
    async (label: string): Promise<ReceivingSettingsAddResult<StageLike>> => {
      const res = await postReceivingWorkingStagesMutation({ kind: "addWorkingStage", label });
      if (!res.ok) return { ok: false, message: res.message };
      const saved = res.snapshot.settings.workingStages.find(
        (s) => s.label.trim().toLowerCase() === label.trim().toLowerCase(),
      );
      if (!saved) return { ok: false, message: "Сервер не вернул сохранённый этап." };
      return { ok: true, value: { id: saved.id, label: saved.label } };
    },
    [],
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
      return {
        ...buildReceivingAppealDetailReady({
          appealId,
          mapped,
          readOnly: effectiveReadOnly,
          busy: companionProfileBusy ? { ...busy, stage: true } : busy,
          error: actionError,
          notesConflict,
          notesSaveBlocked,
          onNotesConflictRefresh:
            notesConflict && notesSaveBlocked ? () => void refreshNotesAfterConflict() : undefined,
          mutateProfile,
          mutateStage,
          addRefusalReason,
          addWorkingStage,
          reloadDetail,
          onOpenOrderPipeline: effectiveReadOnly ? undefined : onOpenOrderPipeline,
          openPurchaseOrder:
            effectiveReadOnly || !mapped.appeal.purchaseOrderId?.trim() ? undefined : openPurchaseOrder,
        }),
        companionProfPanel,
      };
    }
    return null;
  }, [
    actionError,
    appealId,
    busy,
    companionProfPanel,
    companionProfileBusy,
    loadError,
    mapped,
    notesConflict,
    notesSaveBlocked,
    refreshNotesAfterConflict,
    mutateProfile,
    mutateStage,
    addRefusalReason,
    addWorkingStage,
    onOpenOrderPipeline,
    openPurchaseOrder,
    phase,
    effectiveReadOnly,
    reloadDetail,
  ]);

  if (phase === "loading") {
    return (
      <section className="panel stack" data-testid="ca-receiving-detail-loading" aria-busy="true" role="status">
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
