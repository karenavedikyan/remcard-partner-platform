"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createReceivingAppeal,
  receivingRowCanManageLeads,
  type ReceivingAppealListRow,
  fetchReceivingAppealDetailWire,
  fetchReceivingAppealsWorkspace,
  isReceivingAppealsProxyReady,
  isReceivingCertificateEntryProxyReady,
  submitReceivingCertificateEntry,
  receivingDenialMessage,
  RECEIVING_FORBIDDEN_MESSAGE,
  RECEIVING_ACCESS_LIST_ONLY_DENIAL,
  RECEIVING_EMPTY_SETTINGS,
  mergeReceivingAppealPages,
  mergeProfAppealPages,
  fetchReceivingPartnerSettings,
  isReceivingBatchProxyReady,
  postReceivingAppealsBatch,
  receivingAppealsMutationsAllowed,
  receivingListHasMore,
  receivingStageDisplayLabel,
  type ReceivingListFilters,
  type ReceivingPartnerSettings,
  type ReceivingAppealsListResponse,
  type ReceivingAppealsLoadResult,
} from "@/lib/clients-parity/receiving-appeals-api";
import { ReceivingAppealsBlocked } from "@/components/clients/direction/ReceivingAppealsBlocked";
import { ReceivingAppealForm } from "./ReceivingAppealForm";
import { ReceivingAppealsList } from "./ReceivingAppealsList";
import { ReceivingAppealsProfTable } from "./ReceivingAppealsProfTable";
import { ReceivingAppealProfSidePanel } from "./ReceivingAppealProfSidePanel";
import { ReceivingManualSourcesDialog } from "./ReceivingManualSourcesDialog";
import {
  intersectResponsibleOptions,
  parseProfAppealDetailWire,
  profRowCanBulkSelect,
  type ProfListFilters,
  type ReceivingAppealResponsibleWire,
} from "@/lib/clients-parity/prof-appeals-adapter";
import { ReceivingCertificateScan } from "./ReceivingCertificateScan";
import { WorkingStagesEditor } from "./WorkingStagesEditor";
import { ReceivingAppealDetailHost } from "./ReceivingAppealDetailHost";
import type { ReceivingBulkAction, ReceivingBulkContractState } from "./ReceivingBulkActions";
import { ReceivingBulkConfirmPanel } from "./ReceivingBulkConfirmPanel";
import { ReceivingBulkEditPanel } from "./ReceivingBulkEditPanel";
import { ReceivingProfBulkEditPanel } from "./ReceivingProfBulkEditPanel";
import { ReceivingBranchFilter } from "./ReceivingBranchFilter";
import {
  receivingBranchLabelById,
  receivingBranchScopeOf,
  resolveReceivingBranchSelection,
  type ReceivingStaffBranch,
} from "./receiving-branch-scope";
import { formatStaffBranchLine } from "@/lib/profile-staff-cabinet";
import { ReceivingFunnelPage } from "./ReceivingFunnelPage";
import {
  applyReceivingBulkEditsPerId,
  isReceivingAppealLockedForBulkStage,
  receivingBulkApplyNeedsListReload,
} from "@/lib/clients-parity/receiving-bulk-apply";
import {
  normalizeReceivingBatchResponse,
  receivingBulkErrorMessage,
  receivingBulkConfirmTargetIds,
  receivingBulkMergeSelection,
  receivingBulkPreserveSelection,
  receivingConfirmToBatchAction,
  receivingToolbarToBatchAction,
  type ReceivingBulkConfirmKind,
} from "./receiving-bulk-handoff";
import styles from "./receiving.module.css";
import { ClientsNewPartnerEmptyState } from "@/components/clients/new-partner-empty/ClientsNewPartnerEmptyState";
import { remcardFetch } from "@/lib/api-client";
import type { ProProfileResponse } from "@/lib/types";
import {
  isReceivingDirectionIntroCandidate,
  isReceivingDirectionIntroEligible,
  type ReceivingAllBucketsProof,
} from "@/components/clients/new-partner-empty/clientsEmptyEligibility";
import {
  useClientsPageChrome,
  useReportClientsDirectionProbe,
  useReportClientsSubview,
} from "@/components/clients/new-partner-empty/clientsPageChrome";
import {
  useOwnerClientsBusinessPartnerType,
  useOwnerClientsMode,
} from "@/components/clients/OwnerClientsModeContext";

type LoadPhase = "loading" | "blocked" | "ready" | "error";
type ReceivingView = "list" | "manual" | "settings" | "scan" | "detail" | "analytics";

const RECEIVING_LIST_REFRESH_NOTICE_DRAFT =
  "Не удалось обновить список. Черновик и выбранные записи сохранены.";
const RECEIVING_BRANCH_REQUIRED_NOTICE =
  "Выберите филиал в фильтре, чтобы добавить клиента или принять сертификат.";
const RECEIVING_LIST_REFRESH_NOTICE = "Не удалось обновить список.";

function receivingListFailureRecoverable(
  res: Extract<ReceivingAppealsLoadResult, { ok: false }>,
): boolean {
  return res.code === "ERROR" && res.retryable !== false &&
    res.httpStatus !== 401 && res.httpStatus !== 403;
}

type Props = {
  /** Root/tests only — never wire mock data in production paths. */
  previewData?: ReceivingAppealsListResponse;
  /** `/clients?direction=receiving&appealId=` — reopen detail after scanner return. */
  initialAppealId?: string | null;
  directionProbe?: "incoming";
};

export function ReceivingAppealsWorkspace({
  previewData,
  initialAppealId,
  directionProbe,
}: Props = {}) {
  const accessMode = useOwnerClientsMode() ?? "specialist";
  const businessPartnerType = useOwnerClientsBusinessPartnerType();
  const reportIncomingProbe = useReportClientsDirectionProbe("incoming");
  const [phase, setPhase] = useState<LoadPhase>(previewData ? "ready" : "loading");
  const [blocked, setBlocked] = useState<ReceivingAppealsLoadResult | null>(null);
  const [data, setData] = useState<ReceivingAppealsListResponse | null>(previewData ?? null);
  const [view, setView] = useState<ReceivingView>("list");
  const [detailId, setDetailId] = useState<string | null>(null);
  useReportClientsSubview("incoming", view !== "list");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [persistNotice, setPersistNotice] = useState<string | null>(null);
  const [listFilters, setListFilters] = useState<ProfListFilters>({
    q: "",
    status: "Все статусы",
    source: "all",
    bucket: "active",
    requestFilter: "Все",
    appealSourceKey: "all",
    remCardOnly: false,
  });
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [partnerDisplayName, setPartnerDisplayName] = useState("Партнёр");
  const [partnerWorkPhones, setPartnerWorkPhones] = useState<
    Array<{ id: string; label: string; number: string }>
  >([]);
  const [partnerLogoUrl, setPartnerLogoUrl] = useState<string | null>(null);
  const [partnerType, setPartnerType] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [batchPending, setBatchPending] = useState(false);
  const bulkInFlightRef = useRef(false);
  const listRefreshRetryRef = useRef(false);
  const [listRefreshRequired, setListRefreshRequired] = useState(false);
  const [listRefreshInFlight, setListRefreshInFlight] = useState(false);
  const [listRefreshNotice, setListRefreshNotice] = useState<string | null>(null);
  const [batchPartial, setBatchPartial] = useState<string | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<{
    kind: ReceivingBulkConfirmKind;
    ids: string[];
  } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkResponsibleOptions, setBulkResponsibleOptions] = useState<ReceivingAppealResponsibleWire[]>([]);
  const headingSlot = useClientsPageChrome()?.headingAction ?? null;
  const [workingBranchId, setWorkingBranchId] = useState<string | null>(null);
  const [branchRequiredNotice, setBranchRequiredNotice] = useState(false);
  const listSeqRef = useRef(0);
  const staffPrincipal = data?.access?.actorKind === "staff";
  const branches: ReceivingStaffBranch[] | null = staffPrincipal ? (data?.visibleBranches ?? null) : null;
  const multiBranch = staffPrincipal && (branches?.length ?? 0) >= 2;
  const [bucketsProof, setBucketsProof] = useState<ReceivingAllBucketsProof>(
    previewData && previewData.appeals.length === 0 ? "all_empty" : "unknown",
  );

  const proxyReady = isReceivingAppealsProxyReady();
  const batchProxyReady = isReceivingBatchProxyReady();
  const certEntryReady = isReceivingCertificateEntryProxyReady();
  const serverBacked = proxyReady && !previewData;

  const applyFatalListFailure = useCallback((res: Extract<ReceivingAppealsLoadResult, { ok: false }>) => {
    setPhase(res.code === "BLOCKED_CONTRACT" ? "blocked" : "error");
    setBlocked(res);
    setData(null);
    setBulkConfirm(null);
    setBulkEditOpen(false);
    setSelected(new Set());
    setBatchPartial(null);
    setListRefreshRequired(false);
    setListRefreshNotice(null);
  }, []);

  const applyListPage = useCallback(
    async (
      filters: ReceivingListFilters,
      cursor?: string | null,
      append?: boolean,
      settingsForQuery?: ReceivingPartnerSettings | null,
      preserveMountedList?: boolean,
    ) => {
      const seq = ++listSeqRef.current;
      const res = await fetchReceivingAppealsWorkspace(filters, cursor, settingsForQuery);
      if (seq !== listSeqRef.current) return res;
      if (!res.ok) {
        if (preserveMountedList && receivingListFailureRecoverable(res)) return res;
        if (!append) {
          applyFatalListFailure(res);
        }
        return res;
      }
      setPhase("ready");
      setBlocked(null);
      if (receivingBranchScopeOf(filters) === "default") {
        setWorkingBranchId(res.data.principal?.receivingBranchId?.trim() || null);
      }
      setData((prev) => {
        if (!append || !prev) return res.data;
        const mergedProf =
          res.data.profAppeals != null || prev.profAppeals != null
            ? mergeProfAppealPages(prev.profAppeals ?? [], res.data.profAppeals ?? [])
            : undefined;
        return {
          ...res.data,
          // KPI / filter counts describe the full filtered set on the first page only.
          kpis: res.data.kpis ?? prev.kpis,
          remCardMatchCount: res.data.remCardMatchCount ?? prev.remCardMatchCount,
          appeals: mergeReceivingAppealPages(prev.appeals, res.data.appeals),
          ...(mergedProf != null ? { profAppeals: mergedProf } : {}),
        };
      });
      return res;
    },
    [applyFatalListFailure],
  );

  const reload = useCallback(async (opts?: { preserveMountedList?: boolean }) => {
    return applyListPage(listFilters, null, false, data?.settings, opts?.preserveMountedList === true);
  }, [applyListPage, listFilters, data?.settings]);

  const listRefreshFailureNotice = useCallback(
    (afterFullMutation?: boolean) => {
      const keepsDraftOrSelection =
        !afterFullMutation && (bulkEditOpen || bulkConfirm !== null || selected.size > 0);
      return keepsDraftOrSelection ? RECEIVING_LIST_REFRESH_NOTICE_DRAFT : RECEIVING_LIST_REFRESH_NOTICE;
    },
    [bulkConfirm, bulkEditOpen, selected.size],
  );

  const retryListRefresh = useCallback(() => {
    if (bulkInFlightRef.current || listRefreshRetryRef.current || !listRefreshRequired) return;
    listRefreshRetryRef.current = true;
    setListRefreshInFlight(true);
    void reload({ preserveMountedList: true })
      .then((res) => {
        if (res.ok) {
          setListRefreshRequired(false);
          setListRefreshNotice(null);
        } else if (receivingListFailureRecoverable(res)) {
          setListRefreshNotice(listRefreshFailureNotice());
        }
      })
      .finally(() => {
        listRefreshRetryRef.current = false;
        setListRefreshInFlight(false);
      });
  }, [listRefreshFailureNotice, listRefreshRequired, reload]);

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

  useEffect(() => {
    if (!serverBacked || !data || phase !== "ready") {
      if (!serverBacked && data && data.appeals.length === 0) {
        setBucketsProof("all_empty");
      } else if (data && data.appeals.length > 0) {
        setBucketsProof("has_elsewhere");
      }
      return;
    }

    if (multiBranch) {
      setBucketsProof(data.appeals.length > 0 ? "has_elsewhere" : "unknown");
      return;
    }

    const candidate = isReceivingDirectionIntroCandidate({
      phase,
      listView: view,
      filters: listFilters,
      appealsLength: data.appeals.length,
      serverBacked,
      listHasMore: receivingListHasMore(data),
    });

    if (!candidate) {
      setBucketsProof(data.appeals.length > 0 ? "has_elsewhere" : "unknown");
      return;
    }

    let cancelled = false;
    setBucketsProof("checking");
    const probeFilters = {
      q: "",
      status: "Все статусы" as const,
      source: "all" as const,
      branchId: listFilters.branchId ?? null,
      branchScope: listFilters.branchScope,
    };
    const settings = data.settings;

    void (async () => {
      const archive = await fetchReceivingAppealsWorkspace(
        { ...probeFilters, bucket: "archive" },
        null,
        settings,
      );
      if (cancelled) return;
      if (!archive.ok) {
        setBucketsProof("unknown");
        return;
      }
      if (archive.data.appeals.length > 0 || receivingListHasMore(archive.data)) {
        setBucketsProof("has_elsewhere");
        return;
      }
      const trash = await fetchReceivingAppealsWorkspace(
        { ...probeFilters, bucket: "trash" },
        null,
        settings,
      );
      if (cancelled) return;
      if (!trash.ok) {
        setBucketsProof("unknown");
        return;
      }
      if (trash.data.appeals.length > 0 || receivingListHasMore(trash.data)) {
        setBucketsProof("has_elsewhere");
        return;
      }
      setBucketsProof("all_empty");
    })();

    return () => {
      cancelled = true;
    };
  }, [data, listFilters, multiBranch, phase, serverBacked, view]);

  useEffect(() => {
    if (!directionProbe) return;
    if (phase === "loading") {
      reportIncomingProbe("loading");
      return;
    }
    if (phase === "blocked") {
      reportIncomingProbe("blocked");
      return;
    }
    if (phase === "error" || !data) {
      reportIncomingProbe("error");
      return;
    }
    if (view !== "list") {
      reportIncomingProbe("not_empty");
      return;
    }
    if (multiBranch) {
      reportIncomingProbe("not_empty");
      return;
    }
    if (
      isReceivingDirectionIntroEligible({
        phase,
        listView: view,
        filters: listFilters,
        appealsLength: data.appeals.length,
        serverBacked,
        listHasMore: receivingListHasMore(data),
        bucketsProof,
      })
    ) {
      reportIncomingProbe("proven_empty");
      return;
    }
    if (bucketsProof === "checking" || bucketsProof === "unknown") {
      reportIncomingProbe("loading");
      return;
    }
    reportIncomingProbe("not_empty");
  }, [
    bucketsProof,
    data,
    directionProbe,
    listFilters,
    multiBranch,
    phase,
    reportIncomingProbe,
    serverBacked,
    view,
  ]);

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

  const branchSelection = useMemo(
    () =>
      multiBranch && branches
        ? resolveReceivingBranchSelection(listFilters, branches, workingBranchId)
        : null,
    [branches, listFilters, multiBranch, workingBranchId],
  );
  const readScope = useMemo(
    () =>
      branchSelection
        ? branchSelection.kind === "all"
          ? { branchScope: "all" as const }
          : { branchId: branchSelection.branchId }
        : null,
    [branchSelection],
  );
  const writeBranchId = branchSelection?.kind === "branch" ? branchSelection.branchId : null;

  const bulkWriteAllowed = data !== null && receivingAppealsMutationsAllowed(data);
  const listLeadsAllowed = bulkWriteAllowed && data?.access?.canManageLeads !== false;
  const scopeIsAll = branchSelection?.kind === "all";
  // A card/row is editable by its own server flag, never by the aggregate of the general list.
  const profLayout = data?.p149ListContract === true;
  const profAppeals = profLayout ? (data?.profAppeals ?? []) : [];

  useEffect(() => {
    if (!bulkEditOpen || !profLayout || selected.size === 0) {
      setBulkResponsibleOptions([]);
      return;
    }
    let cancelled = false;
    const ids = [...selected].filter((id) => {
      const row = data?.profAppeals?.find((r) => r.id === id);
      return row && profRowCanBulkSelect(row);
    });
    if (ids.length === 0) {
      setBulkResponsibleOptions([]);
      return;
    }
    const scopeAll = readScope?.branchScope === "all";
    void Promise.all(ids.map((id) => fetchReceivingAppealDetailWire(id, readScope ?? undefined))).then(
      (results) => {
        if (cancelled) return;
        const lists = results
          .filter((r): r is Extract<typeof r, { ok: true }> => r.ok)
          .map((r) => parseProfAppealDetailWire(r.wire, { scopeAll })?.responsibleOptions ?? []);
        setBulkResponsibleOptions(intersectResponsibleOptions(lists));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [bulkEditOpen, data?.profAppeals, profLayout, readScope, selected]);

  useEffect(() => {
    if (!profLayout || previewData) return;
    let cancelled = false;
    void remcardFetch<ProProfileResponse>("/api/pro/profile").then((profile) => {
      if (cancelled) return;
      const org = profile.organization?.name?.trim();
      const user = profile.user?.displayName?.trim();
      setPartnerDisplayName(org || user || "Партнёр");
      setPartnerLogoUrl(profile.organization?.logoUrl?.trim() || profile.user?.photoUrl?.trim() || null);
      setPartnerType(profile.organization?.partnerType?.trim() || null);
      const phones: Array<{ id: string; label: string; number: string }> = [];
      const publicPhone =
        profile.organization?.publicPhone?.trim() ||
        profile.catalogPublication?.published?.publicPhone?.trim();
      if (publicPhone) phones.push({ id: "public", label: "Публичный телефон", number: publicPhone });
      const work = profile.workingProfile?.partnershipContactPhone?.trim();
      if (work) phones.push({ id: "work", label: "Рабочий телефон", number: work });
      setPartnerWorkPhones(phones);
    }).catch(() => {
      if (!cancelled) {
        setPartnerWorkPhones([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profLayout, previewData]);
  const rowWritable = useCallback(
    (row: ReceivingAppealListRow) => {
      const profRow = data?.profAppeals?.find((p) => p.id === row.id);
      if (profRow) return profRowCanBulkSelect(profRow);
      return receivingRowCanManageLeads(row, { listAllowsLeads: listLeadsAllowed, scopeAll: scopeIsAll });
    },
    [data?.profAppeals, listLeadsAllowed, scopeIsAll],
  );
  const writableIdSet = useMemo(
    () => new Set((data?.appeals ?? []).filter(rowWritable).map((row) => row.id)),
    [data?.appeals, rowWritable],
  );
  const bulkContractState: ReceivingBulkContractState = !batchProxyReady || !bulkWriteAllowed
    ? "blocked"
    : batchPending
      ? "pending"
      : listRefreshRequired
        ? "refresh-required"
        : "ready";

  const bulkMutationBlocked =
    batchPending || listRefreshRequired || listRefreshInFlight || !bulkWriteAllowed;

  const refreshListAfterMutation = useCallback(
    async (afterFullMutation?: boolean) => {
      const res = await reload({ preserveMountedList: true });
      if (res.ok) {
        setListRefreshRequired(false);
        setListRefreshNotice(null);
      } else if (receivingListFailureRecoverable(res)) {
        setListRefreshRequired(true);
        setListRefreshNotice(listRefreshFailureNotice(afterFullMutation));
      }
    },
    [listRefreshFailureNotice, reload],
  );

  const executeBulkConfirmed = useCallback(async () => {
    if (!bulkConfirm || bulkMutationBlocked || bulkInFlightRef.current || listRefreshRetryRef.current) return;
    const ids = receivingBulkConfirmTargetIds(bulkConfirm.ids, selected).filter((id) => writableIdSet.has(id));
    if (ids.length === 0) return;
    bulkInFlightRef.current = true;
    setBatchPending(true);
    setBatchPartial(null);
    try {
      const action = receivingConfirmToBatchAction(bulkConfirm.kind);
      const res = await postReceivingAppealsBatch({
        action,
        ids,
      });
      if (!res.ok) {
        setBatchPartial(res.message);
        return;
      }
      const result = normalizeReceivingBatchResponse(res.data, { ids, action });
      const partialMsg = receivingBulkErrorMessage(result);
      if (partialMsg) setBatchPartial(partialMsg);
      const mergedSelection = new Set(
        receivingBulkPreserveSelection(result) || result.ok
          ? receivingBulkMergeSelection([...selected], result)
          : [...selected],
      );
      setSelected(mergedSelection);
      if (result.ok && result.kind === "partial") {
        const remain = receivingBulkConfirmTargetIds(bulkConfirm.ids, mergedSelection);
        setBulkConfirm((prev) => prev && remain.length > 0 ? { ...prev, ids: remain } : null);
      } else if (result.ok && result.kind === "full") {
        setBulkConfirm(null);
      }
      if (result.ok && result.updatedIds.length > 0) {
        await refreshListAfterMutation(result.kind === "full");
      }
    } finally {
      bulkInFlightRef.current = false;
      setBatchPending(false);
    }
  }, [bulkConfirm, bulkMutationBlocked, refreshListAfterMutation, selected, writableIdSet]);

  const executeBulkEdit = useCallback(
    async (draft: Parameters<typeof applyReceivingBulkEditsPerId>[1]) => {
      if (!data || bulkMutationBlocked || bulkInFlightRef.current || listRefreshRetryRef.current) return;
      const ids = [...selected].filter((id) => writableIdSet.has(id));
      if (ids.length === 0) return;
      bulkInFlightRef.current = true;
      setBatchPending(true);
      setBatchPartial(null);
      try {
        const listRows = profLayout ? (data.profAppeals ?? []) : data.appeals;
        const selectedRows = listRows.filter((a) => ids.includes(a.id));
        const stageBlocked = selectedRows.some((row) => isReceivingAppealLockedForBulkStage(row));
        const stageLockedIds = new Set(
          selectedRows.filter((row) => isReceivingAppealLockedForBulkStage(row)).map((row) => row.id),
        );
        const { result, outcomes } = await applyReceivingBulkEditsPerId(ids, draft, {
          appeals: listRows,
          workingStages: data.settings?.workingStages ?? [],
          stageBlocked,
          stageLockedIds,
          readScope,
        });
        const partialMsg = receivingBulkErrorMessage(result);
        if (partialMsg) setBatchPartial(partialMsg);
        setSelected((prev) => new Set(receivingBulkMergeSelection([...prev], result)));
        if (result.ok && result.kind === "full") {
          setBulkEditOpen(false);
          setSelected(new Set());
        }
        if (receivingBulkApplyNeedsListReload(outcomes)) {
          await refreshListAfterMutation(result.ok && result.kind === "full");
        }
      } finally {
        bulkInFlightRef.current = false;
        setBatchPending(false);
      }
    },
    [bulkMutationBlocked, data, profLayout, readScope, refreshListAfterMutation, selected, writableIdSet],
  );

  const bulkCallbacks = useMemo(
    () => ({
      selectedIds: selected,
      onToggleRow: (id: string, checked: boolean) => {
        if (bulkMutationBlocked || bulkInFlightRef.current || listRefreshRetryRef.current) return;
        if (checked && !writableIdSet.has(id)) return;
        setSelected((prev) => {
          const next = new Set(prev);
          if (checked) next.add(id);
          else next.delete(id);
          return next;
        });
      },
      onToggleSelectAll: (ids: string[], checked: boolean) => {
        if (bulkMutationBlocked || bulkInFlightRef.current || listRefreshRetryRef.current) return;
        setSelected((prev) => {
          const next = new Set(prev);
          for (const id of ids) {
            if (checked && !writableIdSet.has(id)) continue;
            if (checked) next.add(id);
            else next.delete(id);
          }
          return next;
        });
      },
      contractState: bulkContractState,
      partialError: batchPartial,
      onBulkAction: (action: ReceivingBulkAction) => {
        if (bulkMutationBlocked || bulkInFlightRef.current || listRefreshRetryRef.current) return;
        if (action === "clear") {
          setSelected(new Set());
          setBulkConfirm(null);
          setBulkEditOpen(false);
          setBatchPartial(null);
          return;
        }
        const mapped = receivingToolbarToBatchAction(action, listFilters.bucket);
        if (mapped === "patch-multi") {
          const ids = [...selected].filter((id) => writableIdSet.has(id));
          if (ids.length === 0) return;
          setBulkConfirm(null);
          setBulkEditOpen(true);
          return;
        }
        if (!mapped) return;
        const ids = [...selected].filter((id) => writableIdSet.has(id));
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
    [bulkContractState, bulkMutationBlocked, batchPartial, listFilters.bucket, selected, writableIdSet],
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
        <p>{blocked.httpStatus === 403 ? RECEIVING_FORBIDDEN_MESSAGE : blocked.message}</p>
      </section>
    );
  }

  if (!data) {
    return <ReceivingAppealsBlocked />;
  }

  const readOnly = data.readOnly === true;
  const mutationsAllowed = receivingAppealsMutationsAllowed(data);
  const leadsAllowed = mutationsAllowed && data.access?.canManageLeads !== false;
  const scanAllowed = mutationsAllowed && data.access?.canScan !== false;
  const leadsReadOnly = readOnly || !leadsAllowed;
  const scanReadOnly = readOnly || !scanAllowed;
  const denialMessage = receivingDenialMessage(
    data.access?.denialCode ?? (mutationsAllowed ? null : RECEIVING_ACCESS_LIST_ONLY_DENIAL),
  );
  const changeBranchScope = (next: Pick<ReceivingListFilters, "branchId" | "branchScope">) => {
    setSelected(new Set());
    setBranchRequiredNotice(false);
    const { branchId: _branchId, branchScope: _branchScope, ...rest } = listFilters;
    onListFiltersChange({ ...rest, ...next });
  };
  const branchFilterNode =
    staffPrincipal && branches && branches.length === 1 ? (
      <p className="small muted" data-testid="ca-receiving-branch-single">
        Филиал: {formatStaffBranchLine(branches[0]!)}
      </p>
    ) : branchSelection && branches ? (
      <ReceivingBranchFilter
        branches={branches}
        selection={branchSelection}
        currentBranchId={workingBranchId}
        slot={headingSlot}
        disabled={listRefreshInFlight || batchPending}
        onSelectAll={() => changeBranchScope({ branchScope: "all" })}
        onSelectBranch={(branchId) => changeBranchScope({ branchId })}
      />
    ) : null;
  const allBranchesShown = branchSelection?.kind === "all";
  const branchRequiredBanner = branchRequiredNotice ? (
    <div className={styles.receivingNotice} role="status" data-testid="ca-receiving-branch-required">
      {RECEIVING_BRANCH_REQUIRED_NOTICE}
      <button type="button" className="btn ghost small-btn" onClick={() => setBranchRequiredNotice(false)}>
        Закрыть
      </button>
    </div>
  ) : null;

  if (data.access?.listAllowed === false) {
    return (
      <section data-testid="ca-receiving-list-denied" role="alert">
        <p>{RECEIVING_FORBIDDEN_MESSAGE}</p>
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

  if (
    ((view === "manual" || view === "settings") && leadsReadOnly) ||
    (view === "scan" && scanReadOnly)
  ) {
    return mutationDeniedShell;
  }

  const listRefreshBanner = listRefreshNotice ? (
    <div className={styles.receivingNotice} role="status" data-testid="ca-receiving-list-refresh-notice">
      <strong>{listRefreshNotice}</strong>
      <button
        type="button"
        className="btn ghost small-btn"
        data-ca-action="receiving:list-refresh-retry"
        disabled={listRefreshInFlight}
        aria-disabled={listRefreshInFlight}
        onClick={retryListRefresh}
      >
        <strong>Повторить обновление</strong>
      </button>
    </div>
  ) : null;

  const persistBanner = persistNotice ? (
    <div className={styles.receivingNotice} role="status" data-testid="ca-receiving-persist-notice">
      {persistNotice}
      <button type="button" className="btn ghost small-btn" onClick={() => setPersistNotice(null)}>
        Закрыть
      </button>
    </div>
  ) : null;

  if (view === "manual") {
    return (
      <ReceivingAppealForm
        disabled={!proxyReady || leadsReadOnly}
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
          if (!proxyReady || leadsReadOnly) return;
          const res = await createReceivingAppeal(body, data, { branchId: writeBranchId });
          if (!res.ok) {
            throw new Error(res.message);
          }
          setView("list");
          setPersistNotice("Обращение создано.");
          await refreshListAfterMutation(true);
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
        disabled={leadsReadOnly}
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
        disabled={!certEntryReady || scanReadOnly}
        persistBlockedMessage={
          scanReadOnly ? denialMessage
            : "Certificate-entry ждёт K1 route + P1 allowlist (authorizeStoreScan без правки store scan)."
        }
        onCancel={() => setView("list")}
        onSubmit={async (body) => {
          const res = await submitReceivingCertificateEntry(body, data, {
            branchId: writeBranchId ?? listFilters.branchId ?? undefined,
          });
          if (!res.ok) {
            throw new Error(res.message);
          }
          setDetailId(res.appealId);
          setView(profLayout ? "list" : "detail");
          await refreshListAfterMutation(true);
        }}
      />
    );
  }

  if (view === "analytics") {
    return (
      <ReceivingFunnelPage
        onBack={() => setView("list")}
        branchId={readScope?.branchId ?? listFilters.branchId ?? null}
        branchScope={readScope?.branchScope ?? listFilters.branchScope}
      />
    );
  }

  if (view === "detail" && detailId && !profLayout) {
    const listRow = data.appeals.find((row) => row.id === detailId);
    return (
      <>
        {listRefreshBanner}
        <ReceivingAppealDetailHost
          appealId={detailId}
          readOnly={leadsReadOnly}
          referrerPartnerName={listRow?.referrerDisplayName ?? null}
          readScope={readScope ?? { branchId: listFilters.branchId, branchScope: listFilters.branchScope }}
          onBack={() => {
            setView("list");
            setDetailId(null);
          }}
          onAppealMutated={() => {
            void refreshListAfterMutation(true);
          }}
        />
      </>
    );
  }

  // An empty stale snapshot after an accepted create is not proof that no
  // appeals exist. Keep read-only recovery instead of inviting another create.
  if (listRefreshRequired && data.appeals.length === 0) {
    return <>{persistBanner}{listRefreshBanner}{branchFilterNode}</>;
  }

  const showDirectionIntro = !multiBranch && isReceivingDirectionIntroEligible({
    phase,
    listView: view,
    filters: listFilters,
    appealsLength: data.appeals.length,
    serverBacked,
    listHasMore: receivingListHasMore(data),
    bucketsProof,
  });

  if (showDirectionIntro && !listRefreshRequired) {
    return (
      <ClientsNewPartnerEmptyState
        accessMode={accessMode}
        businessPartnerType={businessPartnerType}
        direction="incoming"
        readOnly={readOnly || !mutationsAllowed}
        onAddClient={() => setView("manual")}
        onScanCertificate={() => setView("scan")}
      />
    );
  }

  const bulkSelectedRows = profLayout
    ? (data.profAppeals ?? []).filter((a) => selected.has(a.id))
    : data.appeals.filter((a) => selected.has(a.id));
  const bulkEditNode =
    bulkEditOpen && selected.size > 0 && mutationsAllowed ? (
      profLayout ? (
        <ReceivingProfBulkEditPanel
          count={selected.size}
          stageOptions={(data.settings?.workingStages ?? []).map((s) => ({
            id: s.id,
            label: s.label,
          }))}
          stageBlocked={bulkSelectedRows.some((row) => isReceivingAppealLockedForBulkStage(row))}
          settings={data.settings ?? RECEIVING_EMPTY_SETTINGS}
          responsibleOptions={bulkResponsibleOptions}
          contractState={bulkContractState}
          saveError={batchPartial}
          onCancel={() => setBulkEditOpen(false)}
          onApply={(draft) => void executeBulkEdit(draft)}
        />
      ) : (
        <ReceivingBulkEditPanel
          count={selected.size}
          stageOptions={(data.settings?.workingStages ?? []).map((s) => ({
            id: s.id,
            label: s.label,
          }))}
          stageBlocked={bulkSelectedRows.some((row) => isReceivingAppealLockedForBulkStage(row))}
          contractState={bulkContractState}
          saveError={batchPartial}
          onCancel={() => setBulkEditOpen(false)}
          onApply={(draft) => void executeBulkEdit(draft)}
        />
      )
    ) : null;
  const bulkConfirmNode =
    bulkConfirm && mutationsAllowed ? (
      <ReceivingBulkConfirmPanel
        kind={bulkConfirm.kind}
        count={bulkConfirm.ids.length}
        contractState={bulkContractState}
        partialError={batchPartial}
        onCancel={() => setBulkConfirm(null)}
        onConfirm={() => void executeBulkConfirmed()}
      />
    ) : null;

  const openProfSide = (id: string) => {
    setDetailId(id);
    setView("list");
    setOfferOpen(false);
  };
  const profPanelRow = detailId ? data.profAppeals?.find((r) => r.id === detailId) ?? null : null;

  return (
    <div className={profLayout && detailId ? styles.profWorkspaceWithPanel : undefined}>
      {persistBanner}
      {listRefreshBanner}
      {branchFilterNode}
      {branchRequiredBanner}
      {profLayout ? (
        <ReceivingAppealsProfTable
          bulkEditSlot={bulkEditNode}
          bulkConfirmSlot={bulkConfirmNode}
          data={data}
          profRows={profAppeals}
          remCardMatchCount={data.remCardMatchCount}
          stageLabelById={(row) =>
            receivingStageDisplayLabel(row.stageId, data.settings, row.stageLabel)
          }
          filters={listFilters}
          onFiltersChange={onListFiltersChange}
          serverBackedFilters={serverBacked}
          listHasMore={receivingListHasMore(data)}
          loadingMore={loadingMore}
          onLoadMore={onLoadMore}
          readOnly={leadsReadOnly}
          scanOnly={!readOnly && !leadsAllowed && scanAllowed}
          bulk={leadsAllowed ? bulkCallbacks : undefined}
          rowWritable={(row) => profRowCanBulkSelect(row)}
          branchLabelOf={
            allBranchesShown && branches
              ? (row) => receivingBranchLabelById(row.receivingBranchId, branches)
              : undefined
          }
          onOpenAppeal={openProfSide}
          onOpenSources={() => setSourcesOpen(true)}
          onNavigateScan={
            scanAllowed
              ? () => (allBranchesShown ? setBranchRequiredNotice(true) : setView("scan"))
              : () => setPersistNotice(denialMessage)
          }
          onNavigateManual={
            leadsAllowed
              ? () => (allBranchesShown ? setBranchRequiredNotice(true) : setView("manual"))
              : () => setPersistNotice(denialMessage)
          }
          onNavigateSettings={
            leadsAllowed
              ? () => setView("settings")
              : () => setPersistNotice(denialMessage)
          }
          onNavigateAnalytics={() => setView("analytics")}
          onShowAllBranches={
            branchSelection?.kind === "branch" ? () => changeBranchScope({ branchScope: "all" }) : undefined
          }
          onOpenPartnerFields={undefined}
        />
      ) : (
        <ReceivingAppealsList
          bulkEditSlot={bulkEditNode}
          bulkConfirmSlot={bulkConfirmNode}
          data={data}
          stageLabelById={(row) =>
            receivingStageDisplayLabel(row.stageId, data.settings, row.stageLabel)
          }
          filters={listFilters}
          onFiltersChange={onListFiltersChange}
          serverBackedFilters={serverBacked}
          listHasMore={receivingListHasMore(data)}
          loadingMore={loadingMore}
          onLoadMore={onLoadMore}
          readOnly={leadsReadOnly}
          scanOnly={!readOnly && !leadsAllowed && scanAllowed}
          bulk={leadsAllowed ? bulkCallbacks : undefined}
          rowWritable={rowWritable}
          branchLabelOf={
            allBranchesShown && branches
              ? (row) => receivingBranchLabelById(row.receivingBranchId, branches)
              : undefined
          }
          onShowAllBranches={
            branchSelection?.kind === "branch" ? () => changeBranchScope({ branchScope: "all" }) : undefined
          }
          onOpenAppeal={(id) => {
            setDetailId(id);
            setView("detail");
          }}
          onNavigateManual={
            leadsAllowed
              ? () => (allBranchesShown ? setBranchRequiredNotice(true) : setView("manual"))
              : () => setPersistNotice(denialMessage)
          }
          onNavigateSettings={
            leadsAllowed
              ? () => setView("settings")
              : () => setPersistNotice(denialMessage)
          }
          onNavigateScan={
            scanAllowed
              ? () => (allBranchesShown ? setBranchRequiredNotice(true) : setView("scan"))
              : () => setPersistNotice(denialMessage)
          }
          onNavigateAnalytics={() => setView("analytics")}
        />
      )}
      {profLayout ? (
        <>
          <ReceivingAppealProfSidePanel
            appealId={detailId}
            row={profPanelRow}
            readOnly={leadsReadOnly}
            readScope={readScope ?? undefined}
            settings={data.settings ?? RECEIVING_EMPTY_SETTINGS}
            partnerDisplayName={partnerDisplayName}
            partnerWorkPhones={partnerWorkPhones}
            partnerLogoUrl={partnerLogoUrl}
            partnerType={partnerType}
            branchLabel={
              profPanelRow
                ? profPanelRow.receivingBranchLabel ??
                  (branches
                    ? receivingBranchLabelById(profPanelRow.receivingBranchId, branches)
                    : null)
                : null
            }
            offerOpen={offerOpen}
            onOfferOpenChange={setOfferOpen}
            onClose={() => {
              setDetailId(null);
              setOfferOpen(false);
            }}
            onAppealMutated={() => void refreshListAfterMutation(true)}
          />
          <ReceivingManualSourcesDialog
            open={sourcesOpen}
            settings={data.settings ?? RECEIVING_EMPTY_SETTINGS}
            settingsVersion={data.settingsVersion}
            readOnly={leadsReadOnly}
            onClose={() => setSourcesOpen(false)}
            onSettingsUpdated={(channels, version) => {
              setData((prev) =>
                prev && prev.settings
                  ? {
                      ...prev,
                      settings: { ...prev.settings, manualChannels: channels },
                      settingsVersion: version ?? prev.settingsVersion,
                    }
                  : prev,
              );
            }}
          />
        </>
      ) : null}
    </div>
  );
}
