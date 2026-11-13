"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createReceivingAppeal,
  fetchReceivingAppealsWorkspace,
  isReceivingAppealsProxyReady,
  isReceivingCertificateEntryProxyReady,
  submitReceivingCertificateEntry,
  RECEIVING_ACCESS_LIST_ONLY_DENIAL,
  RECEIVING_EMPTY_SETTINGS,
  mergeReceivingAppealPages,
  fetchReceivingPartnerSettings,
  isReceivingBatchProxyReady,
  postReceivingAppealsBatch,
  receivingAppealsMutationsAllowed,
  receivingListHasMore,
  type ReceivingListFilters,
  type ReceivingPartnerSettings,
  type ReceivingAppealsListResponse,
  type ReceivingAppealsLoadResult,
} from "@/lib/clients-parity/receiving-appeals-api";
import { ReceivingAppealsBlocked } from "@/components/clients/direction/ReceivingAppealsBlocked";
import { ReceivingAppealForm } from "./ReceivingAppealForm";
import { ReceivingAppealsList } from "./ReceivingAppealsList";
import { ReceivingCertificateScan } from "./ReceivingCertificateScan";
import { WorkingStagesEditor } from "./WorkingStagesEditor";
import { ReceivingAppealDetailHost } from "./ReceivingAppealDetailHost";
import type { ReceivingBulkAction, ReceivingBulkContractState } from "./ReceivingBulkActions";
import { ReceivingBulkConfirmPanel } from "./ReceivingBulkConfirmPanel";
import { ReceivingBulkEditPanel } from "./ReceivingBulkEditPanel";
import {
  applyReceivingBulkEditsPerId,
  isReceivingAppealLockedForBulkStage,
  receivingBulkApplyNeedsListReload,
} from "@/lib/clients-parity/receiving-bulk-apply";
import {
  normalizeReceivingBatchResponse,
  receivingBulkErrorMessage,
  receivingBulkMergeSelection,
  receivingBulkPreserveSelection,
  receivingConfirmToBatchAction,
  receivingToolbarToBatchAction,
  type ReceivingBulkConfirmKind,
} from "./receiving-bulk-handoff";
import styles from "./receiving.module.css";

type LoadPhase = "loading" | "blocked" | "ready" | "error";
type ReceivingView = "list" | "manual" | "settings" | "scan" | "detail";

type Props = {
  /** Root/tests only — never wire mock data in production paths. */
  previewData?: ReceivingAppealsListResponse;
  /** `/clients?direction=receiving&appealId=` — reopen detail after scanner return. */
  initialAppealId?: string | null;
};

export function ReceivingAppealsWorkspace({ previewData, initialAppealId }: Props = {}) {
  const [phase, setPhase] = useState<LoadPhase>(previewData ? "ready" : "loading");
  const [blocked, setBlocked] = useState<ReceivingAppealsLoadResult | null>(null);
  const [data, setData] = useState<ReceivingAppealsListResponse | null>(previewData ?? null);
  const [view, setView] = useState<ReceivingView>("list");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [persistNotice, setPersistNotice] = useState<string | null>(null);
  const [listFilters, setListFilters] = useState<ReceivingListFilters>({
    q: "",
    status: "Все статусы",
    source: "all",
    bucket: "active",
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [batchPending, setBatchPending] = useState(false);
  const [batchPartial, setBatchPartial] = useState<string | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<{
    kind: ReceivingBulkConfirmKind;
    ids: string[];
  } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  const proxyReady = isReceivingAppealsProxyReady();
  const batchProxyReady = isReceivingBatchProxyReady();
  const certEntryReady = isReceivingCertificateEntryProxyReady();
  const serverBacked = proxyReady && !previewData;

  const applyListPage = useCallback(
    async (
      filters: ReceivingListFilters,
      cursor?: string | null,
      append?: boolean,
      settingsForQuery?: ReceivingPartnerSettings | null,
    ) => {
      const res = await fetchReceivingAppealsWorkspace(filters, cursor, settingsForQuery);
      if (!res.ok) {
        if (!append) {
          setPhase(res.code === "BLOCKED_CONTRACT" ? "blocked" : "error");
          setBlocked(res);
          setData(null);
        }
        return res;
      }
      setPhase("ready");
      setBlocked(null);
      setData((prev) => {
        if (!append || !prev) return res.data;
        return {
          ...res.data,
          appeals: mergeReceivingAppealPages(prev.appeals, res.data.appeals),
        };
      });
      return res;
    },
    [],
  );

  const reload = useCallback(async () => {
    return applyListPage(listFilters, null, false, data?.settings);
  }, [applyListPage, listFilters, data?.settings]);

  useEffect(() => {
    if (previewData) return;
    void applyListPage(listFilters, null, false, undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only; filter changes use onListFiltersChange
  }, [previewData]);

  useEffect(() => {
    const id = initialAppealId?.trim();
    if (!id) return;
    setDetailId(id);
    setView("detail");
  }, [initialAppealId]);

  const onListFiltersChange = useCallback(
    (next: ReceivingListFilters) => {
      setListFilters(next);
      if (serverBacked) {
        void applyListPage(next, null, false, data?.settings);
      }
    },
    [applyListPage, data?.settings, serverBacked],
  );

  const onLoadMore = useCallback(() => {
    if (!data?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    void applyListPage(listFilters, data.nextCursor, true, data.settings)
      .finally(() => setLoadingMore(false));
  }, [applyListPage, data?.nextCursor, data?.settings, listFilters, loadingMore]);

  const bulkContractState: ReceivingBulkContractState = !batchProxyReady
    ? "blocked"
    : batchPending
      ? "pending"
      : "ready";

  const executeBulkConfirmed = useCallback(async () => {
    if (!bulkConfirm) return;
    setBatchPending(true);
    setBatchPartial(null);
    const res = await postReceivingAppealsBatch({
      action: receivingConfirmToBatchAction(bulkConfirm.kind),
      ids: bulkConfirm.ids,
    });
    setBatchPending(false);
    if (!res.ok) {
      setBatchPartial(res.message);
      return;
    }
    const result = normalizeReceivingBatchResponse(res.data);
    const partialMsg = receivingBulkErrorMessage(result);
    if (partialMsg) setBatchPartial(partialMsg);
    if (result.ok && result.updatedIds.length > 0) {
      await reload();
    }
    setSelected((prev) => {
      if (receivingBulkPreserveSelection(result)) {
        return new Set(receivingBulkMergeSelection([...prev], result));
      }
      if (result.ok) {
        return new Set(receivingBulkMergeSelection([...prev], result));
      }
      return prev;
    });
    if (result.ok && result.kind === "full") {
      setBulkConfirm(null);
    }
  }, [bulkConfirm, reload]);

  const executeBulkEdit = useCallback(
    async (draft: Parameters<typeof applyReceivingBulkEditsPerId>[1]) => {
      if (!data) return;
      const ids = [...selected];
      if (ids.length === 0) return;
      setBatchPending(true);
      setBatchPartial(null);
      const selectedRows = data.appeals.filter((a) => selected.has(a.id));
      const stageBlocked = selectedRows.some((row) => isReceivingAppealLockedForBulkStage(row));
      const stageLockedIds = new Set(
        selectedRows.filter((row) => isReceivingAppealLockedForBulkStage(row)).map((row) => row.id),
      );
      const { result, outcomes } = await applyReceivingBulkEditsPerId(ids, draft, {
        appeals: data.appeals,
        workingStages: data.settings?.workingStages ?? [],
        stageBlocked,
        stageLockedIds,
      });
      setBatchPending(false);
      const partialMsg = receivingBulkErrorMessage(result);
      if (partialMsg) setBatchPartial(partialMsg);
      if (receivingBulkApplyNeedsListReload(outcomes)) {
        await reload();
      }
      setSelected((prev) => new Set(receivingBulkMergeSelection([...prev], result)));
      if (result.ok && result.kind === "full") {
        setBulkEditOpen(false);
        setSelected(new Set());
      }
    },
    [data, reload, selected],
  );

  const bulkCallbacks = useMemo(
    () => ({
      selectedIds: selected,
      onToggleRow: (id: string, checked: boolean) => {
        setSelected((prev) => {
          const next = new Set(prev);
          if (checked) next.add(id);
          else next.delete(id);
          return next;
        });
      },
      onToggleSelectAll: (ids: string[], checked: boolean) => {
        setSelected((prev) => {
          const next = new Set(prev);
          for (const id of ids) {
            if (checked) next.add(id);
            else next.delete(id);
          }
          return next;
        });
      },
      contractState: bulkContractState,
      partialError: batchPartial,
      onBulkAction: (action: ReceivingBulkAction) => {
        if (action === "clear") {
          setSelected(new Set());
          setBulkConfirm(null);
          setBulkEditOpen(false);
          setBatchPartial(null);
          return;
        }
        const mapped = receivingToolbarToBatchAction(action, listFilters.bucket);
        if (mapped === "patch-multi") {
          const ids = [...selected];
          if (ids.length === 0) return;
          setBulkConfirm(null);
          setBulkEditOpen(true);
          return;
        }
        if (!mapped) return;
        const ids = [...selected];
        if (ids.length === 0) return;
        const confirmKind: ReceivingBulkConfirmKind | null =
          action === "archive-ask"
            ? "archive"
            : action === "delete-ask"
              ? "delete"
              : action === "unarchive-ask"
                ? "unarchive"
                : action === "restore-ask"
                  ? "restore"
                  : null;
        if (!confirmKind) return;
        setBulkEditOpen(false);
        setBulkConfirm({ kind: confirmKind, ids });
      },
    }),
    [bulkContractState, batchPartial, listFilters.bucket, selected],
  );

  if (phase === "loading" && !previewData) {
    return <p data-testid="ca-receiving-appeals-loading">Загрузка…</p>;
  }

  if (phase === "blocked" && !previewData) {
    return <ReceivingAppealsBlocked />;
  }

  if (phase === "error" && blocked && !blocked.ok && !previewData) {
    return (
      <section data-testid="ca-receiving-appeals-error" role="alert">
        <p>{blocked.message}</p>
      </section>
    );
  }

  if (!data) {
    return <ReceivingAppealsBlocked />;
  }

  const readOnly = data.readOnly === true;
  const mutationsAllowed = receivingAppealsMutationsAllowed(data);
  const denialMessage =
    data.access?.denialCode ?? RECEIVING_ACCESS_LIST_ONLY_DENIAL;

  if (data.access?.listAllowed === false) {
    return (
      <section data-testid="ca-receiving-list-denied" role="alert">
        <p>{denialMessage}</p>
      </section>
    );
  }

  const mutationDeniedShell = (
    <section className="panel stack" data-testid="ca-receiving-mutation-denied" role="alert">
      <p className="notice">
        Только просмотр: изменять статусы, создавать обращения и настраивать этапы нельзя.
      </p>
      <p className="small muted">{denialMessage}</p>
      <button type="button" className="btn ghost" onClick={() => setView("list")}>
        К списку
      </button>
    </section>
  );

  if ((view === "manual" || view === "settings" || view === "scan") && readOnly) {
    return mutationDeniedShell;
  }

  if (view === "manual") {
    return (
      <ReceivingAppealForm
        disabled={!proxyReady || readOnly}
        persistBlockedMessage="Создание обращения ждёт P1 proxy и K1 handler."
        settings={data.settings ?? RECEIVING_EMPTY_SETTINGS}
        settingsVersion={data.settingsVersion}
        onChannelsUpdated={(snapshot) => {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  settings: snapshot.settings,
                  settingsVersion: snapshot.version ?? prev.settingsVersion,
                }
              : prev,
          );
        }}
        onCancel={() => setView("list")}
        onSubmit={async (body) => {
          if (!proxyReady || readOnly) return;
          const res = await createReceivingAppeal(body, data);
          if (!res.ok) {
            setPersistNotice(res.message);
            return;
          }
          setView("list");
          await reload();
        }}
      />
    );
  }

  if (view === "settings") {
    const refreshSettings = async () => {
      const res = await fetchReceivingPartnerSettings();
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                settings: res.snapshot.settings,
                settingsVersion: res.snapshot.version ?? prev.settingsVersion,
              }
            : prev,
        );
      }
    };
    return (
      <WorkingStagesEditor
        settings={data.settings ?? RECEIVING_EMPTY_SETTINGS}
        settingsVersion={data.settingsVersion}
        disabled={readOnly}
        onCancel={() => setView("list")}
        onSettingsUpdated={(snapshot) => {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  settings: snapshot.settings,
                  settingsVersion: snapshot.version ?? prev.settingsVersion,
                }
              : prev,
          );
        }}
        onRefetchSettings={refreshSettings}
      />
    );
  }

  if (view === "scan") {
    return (
      <ReceivingCertificateScan
        disabled={!certEntryReady || readOnly}
        persistBlockedMessage={
          readOnly ? denialMessage
            : "Certificate-entry ждёт K1 route + P1 allowlist (authorizeStoreScan без правки store scan)."
        }
        onCancel={() => setView("list")}
        onSubmit={async (body) => {
          const res = await submitReceivingCertificateEntry(body, data);
          if (!res.ok) {
            throw new Error(res.message);
          }
          setDetailId(res.appealId);
          setView("detail");
          await reload();
        }}
      />
    );
  }

  if (view === "detail" && detailId) {
    const listRow = data.appeals.find((row) => row.id === detailId);
    return (
      <ReceivingAppealDetailHost
        appealId={detailId}
        readOnly={readOnly}
        referrerPartnerName={listRow?.referrerPartnerId ?? null}
        onBack={() => {
          setView("list");
          setDetailId(null);
        }}
        onAppealMutated={() => {
          void reload();
        }}
      />
    );
  }

  return (
    <>
      {persistNotice ? (
        <div className={styles.receivingNotice} role="status" data-testid="ca-receiving-persist-notice">
          {persistNotice}
          <button type="button" className="btn ghost small-btn" onClick={() => setPersistNotice(null)}>
            Закрыть
          </button>
        </div>
      ) : null}
      {bulkEditOpen && selected.size > 0 ? (
        <ReceivingBulkEditPanel
          count={selected.size}
          stageOptions={(data.settings?.workingStages ?? []).map((s) => ({
            id: s.id,
            label: s.label,
          }))}
          stageBlocked={data.appeals
            .filter((a) => selected.has(a.id))
            .some((row) => isReceivingAppealLockedForBulkStage(row))}
          contractState={bulkContractState}
          saveError={batchPartial}
          onCancel={() => setBulkEditOpen(false)}
          onApply={(draft) => void executeBulkEdit(draft)}
        />
      ) : null}
      {bulkConfirm ? (
        <ReceivingBulkConfirmPanel
          kind={bulkConfirm.kind}
          count={bulkConfirm.ids.length}
          contractState={bulkContractState}
          partialError={batchPartial}
          onCancel={() => setBulkConfirm(null)}
          onConfirm={() => void executeBulkConfirmed()}
        />
      ) : null}
      <ReceivingAppealsList
        data={data}
        filters={listFilters}
        onFiltersChange={onListFiltersChange}
        serverBackedFilters={serverBacked}
        listHasMore={receivingListHasMore(data)}
        loadingMore={loadingMore}
        onLoadMore={onLoadMore}
        readOnly={readOnly}
        bulk={mutationsAllowed ? bulkCallbacks : undefined}
        onOpenAppeal={(id) => {
          setDetailId(id);
          setView("detail");
        }}
        onNavigateManual={
          mutationsAllowed
            ? () => setView("manual")
            : () =>
                setPersistNotice(denialMessage)
        }
        onNavigateSettings={
          mutationsAllowed
            ? () => setView("settings")
            : () => setPersistNotice(denialMessage)
        }
        onNavigateScan={
          mutationsAllowed
            ? () => setView("scan")
            : () => setPersistNotice(denialMessage)
        }
        onNavigateAnalytics={() =>
          setPersistNotice("Аналитика воронки — страница п.85 после receiving list API.")
        }
      />
    </>
  );
}
