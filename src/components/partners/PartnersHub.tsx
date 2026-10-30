"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { displayCategoryLabel } from "@/lib/category-display";
import {
  PARTNERSHIP_STATUS_LABELS,
  partnershipStatusTone,
} from "@/lib/partnership-labels";
import {
  SEARCH_ROLE_OPTIONS,
  countNeedsMyResponse,
  defaultSearchRoleForUser,
  getPartnershipUiActions,
  isAgentCooperationInviter,
  partnershipAgentSegment,
  partnershipNeedsMyResponse,
  profileUserToPartnerSide,
  shouldShowAgentPublishedTermsForSearch,
  type SearchRole,
} from "@/lib/partnership-rules";
import {
  matchesListPartnerType,
  matchesListSpecialization,
  matchesListStage,
  partnerDisplayTitle,
  partnershipPartnerUser,
  sortPartnershipsDeterministic,
  type AgentPartnerTypeFilter,
} from "@/lib/agent-r04/partner-filters";
import { patchPartnershipListPreference } from "@/lib/agent-r04/api";
import {
  AgentPartnerBulkBar,
  type BulkListOperation,
  type BulkOutcome,
} from "@/components/partners/AgentPartnerBulkBar";
import type { PartnersHubAudience } from "@/lib/partners-hub-presentation";
import { PartnerDiscussionInvitePanel } from "@/components/partners/PartnerDiscussionInvitePanel";
import {
  discussionContextToInviteTarget,
  type DiscussionInviteContextDto,
} from "@/lib/discussion-invite-ui";
import { AgentPartnerRecordActions } from "@/components/partners/AgentPartnerRecordActions";
import {
  AgentR04ListToolbar,
  type AgentListSort,
  type AgentListViewMode,
} from "@/components/partners/AgentR04ListToolbar";
import { AgentPartnerDiscoveryFilters } from "@/components/partners/AgentPartnerDiscoveryFilters";
import Link from "next/link";
import type {
  PartnerSearchResult,
  Partnership,
  ProProfileResponse,
  TermChangeRequest,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { TextField } from "@/components/ui/FormField";
import { PartnerInviteDialog } from "@/components/partners/PartnerInviteDialog";
import { PartnerGeneralTermsDetails } from "@/components/partners/PartnerGeneralTermsDetails";
import { PartnerCounterOfferDialog } from "@/components/partners/PartnerCounterOfferDialog";
import { PartnerListHideDialog } from "@/components/partners/PartnerListHideDialog";
import { PartnerSearchFilters } from "@/components/partners/PartnerSearchFilters";
import { PartnerLinkInvitePanel } from "@/components/partners/PartnerLinkInvitePanel";
import { TermChangePanel } from "@/components/partners/TermChangePanel";
import { AgentPartnerCollection } from "@/components/partners/AgentPartnerCollection";
import {
  hasCustomPartnershipSearchFilters,
  mergeSearchResultPages,
} from "@/lib/partnership-search-ui";
import { partnerSearchResultMeta } from "@/lib/agent-r04/partner-search-meta";
import {
  overviewZoneForPartnership,
  partitionPartnerOverview,
  type PartnerOverviewZone,
} from "@/lib/partners-prototype-v1/overview-groups";
import { PartnersOverviewLayout } from "@/components/partners/PartnersOverviewLayout";
import styles from "./PartnersHub.module.css";

export type PartnersHubProps = {
  meId: string;
  initialProfile: ProProfileResponse;
  onAttentionCountChange?: (count: number) => void;
  variant?: "legacy" | "agent-r04";
  agentSegment?: "active" | "invitations";
  agentInvitationFlow?: "incoming" | "outgoing";
  /** P1 overview composition (prototype tiles/zones) instead of two top tabs. */
  agentPresentation?: "tabs" | "overview";
  agentModalSurface?: "find" | "link";
  onCloseAgentModal?: () => void;
  /** Overview CTA / empty scenarios — open existing find/link modal. */
  onOpenPartnerHub?: (tab: "find" | "link") => void;
  forcedTab?: TabId;
  defaultSearchRole?: SearchRole;
  partnersAudience?: PartnersHubAudience;
};

type TabId = "list" | "find" | "link";

const AGENT_R04_LIST_SEARCH_PLACEHOLDER = "Название партнёра или город";

type TermRequestState = {
  state: "idle" | "loading" | "loaded" | "error";
  requests: TermChangeRequest[];
  error: string;
};

function partnerTitle(partner: { displayName: string | null; organizationName?: string | null }) {
  return partner.organizationName?.trim() || partner.displayName?.trim() || "Партнёр";
}

export function PartnersHub({
  meId,
  initialProfile,
  onAttentionCountChange,
  variant = "legacy",
  agentSegment,
  agentInvitationFlow,
  agentPresentation = "tabs",
  agentModalSurface,
  onCloseAgentModal,
  onOpenPartnerHub,
  forcedTab,
  defaultSearchRole: defaultSearchRoleProp,
  partnersAudience,
}: PartnersHubProps) {
  const isAgentR04 = variant === "agent-r04";
  const isModalSurface = Boolean(isAgentR04 && agentModalSurface);
  const isOverview = isAgentR04 && agentPresentation === "overview" && !agentModalSurface;
  const searchParams = useSearchParams();
  const termsPartnershipId = searchParams.get("terms")?.trim() || null;
  const discussionInviteId = searchParams.get("discussion")?.trim() || null;
  const [discussionContext, setDiscussionContext] = useState<DiscussionInviteContextDto | null>(null);
  const [discussionContextError, setDiscussionContextError] = useState("");
  const [bulkHideConfirmOpen, setBulkHideConfirmOpen] = useState(false);
  const [bulkHidePendingIds, setBulkHidePendingIds] = useState<string[]>([]);
  const [tab, setTab] = useState<TabId>(forcedTab ?? "list");
  const [meProfile, setMeProfile] = useState(initialProfile);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [searchResults, setSearchResults] = useState<PartnerSearchResult[]>([]);
  const [searchNextCursor, setSearchNextCursor] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [filterProducts, setFilterProducts] = useState<string[]>([]);
  const [filterServices, setFilterServices] = useState<string[]>([]);
  const [filterStages, setFilterStages] = useState<string[]>([]);
  const [searchRole, setSearchRole] = useState<SearchRole>(() =>
    defaultSearchRoleForUser(profileUserToPartnerSide(initialProfile.user, initialProfile.organization)),
  );
  const [listError, setListError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inviteTarget, setInviteTarget] = useState<PartnerSearchResult | null>(null);
  const [counterOfferTarget, setCounterOfferTarget] = useState<{
    partnership: Partnership;
    action: "counter_offer" | "counter_offer_back";
  } | null>(null);
  const showAgentPublishedTerms = shouldShowAgentPublishedTermsForSearch(
    meProfile.user,
    searchRole,
  );
  const [expandedTermPartnershipId, setExpandedTermPartnershipId] = useState<string | null>(null);
  const [termRequests, setTermRequests] = useState<Record<string, TermRequestState>>({});
  const [taxonomyFilterResetKey, setTaxonomyFilterResetKey] = useState(0);
  const [listArchiveView, setListArchiveView] = useState<"active" | "archive" | "hidden">("active");
  const [linkInviteMode, setLinkInviteMode] = useState<"discussion" | "terms">("discussion");
  const [listPartnerType, setListPartnerType] = useState<AgentPartnerTypeFilter>("");
  const [listSpecialization, setListSpecialization] = useState("");
  const [listCity, setListCity] = useState("");
  const [listStage, setListStage] = useState("");
  const [listSort, setListSort] = useState<AgentListSort>("updated_desc");
  const [listSearch, setListSearch] = useState("");
  const [listViewMode, setListViewMode] = useState<AgentListViewMode>("list");
  const [listPage, setListPage] = useState(0);
  const [listPageSize, setListPageSize] = useState(25);
  const [waitingOpen, setWaitingOpen] = useState(false);
  const [decideZeroHint, setDecideZeroHint] = useState(false);
  const [waitingPage, setWaitingPage] = useState(0);
  const [decidePage, setDecidePage] = useState(0);
  const overviewZoneActiveRef = useRef<HTMLDivElement>(null);
  const overviewZoneDecideRef = useRef<HTMLDivElement>(null);
  const overviewZoneWaitingRef = useRef<HTMLDetailsElement>(null);
  /** terms= id already paged into its overview zone (refresh/page-size must not re-page). */
  const overviewDeepLinkAppliedRef = useRef<string | null>(null);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<Set<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkOutcome, setBulkOutcome] = useState<BulkOutcome | null>(null);
  const [searchPartnerType, setSearchPartnerType] = useState<AgentPartnerTypeFilter>("");
  const [discoverySpecialization, setDiscoverySpecialization] = useState("");
  const [discoveryStageId, setDiscoveryStageId] = useState("");
  const [expandedTermsId, setExpandedTermsId] = useState<string | null>(null);
  const searchRequestGen = useRef(0);

  useEffect(() => {
    if (forcedTab) setTab(forcedTab);
  }, [forcedTab]);

  useEffect(() => {
    if (isAgentR04 && defaultSearchRoleProp) {
      setSearchRole(defaultSearchRoleProp);
    }
  }, [defaultSearchRoleProp, isAgentR04]);

  const inviterSide = useMemo(
    () => profileUserToPartnerSide(meProfile.user, meProfile.organization),
    [meProfile],
  );
  const defaultSearchRole = useMemo(() => defaultSearchRoleForUser(inviterSide), [inviterSide]);
  const searchMeta = SEARCH_ROLE_OPTIONS.find((item) => item.value === searchRole)!;
  const hasCustomFilters = hasCustomPartnershipSearchFilters(
    {
      query,
      city,
      filterProducts,
      filterServices,
      filterStages,
      searchRole,
    },
    defaultSearchRole,
  );

  const listVisibilityParam =
    isAgentR04 && !isOverview && agentSegment === "active" ? listArchiveView : null;

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setListError("");
    try {
      const params = new URLSearchParams();
      // Overview: one full authorized collection; archive/hidden are client filters.
      if (listVisibilityParam) {
        params.set("listVisibility", listVisibilityParam);
      }
      const qs = params.toString();
      const data = await remcardFetch<{ partnerships: Partnership[] }>(
        `/api/partnership/list${qs ? `?${qs}` : ""}`,
      );
      setPartnerships(data.partnerships ?? []);
    } catch (caught) {
      setPartnerships([]);
      setListError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить список");
    } finally {
      setLoadingList(false);
    }
  }, [listVisibilityParam]);

  const loadDiscussionContext = useCallback(async (inviteId: string) => {
    setDiscussionContextError("");
    try {
      const data = await remcardFetch<{ context: DiscussionInviteContextDto }>(
        `/api/partnership/discussion-invite/${encodeURIComponent(inviteId)}`,
      );
      setDiscussionContext(data.context ?? null);
    } catch (caught) {
      setDiscussionContext(null);
      setDiscussionContextError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить обсуждение",
      );
    }
  }, []);

  useEffect(() => {
    if (discussionInviteId) {
      void loadDiscussionContext(discussionInviteId);
    } else {
      setDiscussionContext(null);
      setDiscussionContextError("");
    }
  }, [discussionInviteId, loadDiscussionContext]);

  const loadSearch = useCallback(
    async (mode: "reset" | "append", cursor: string | null = null) => {
      let requestGen = searchRequestGen.current;
      if (mode === "reset") {
        requestGen = ++searchRequestGen.current;
        setSearchResults([]);
        setSearchNextCursor(null);
        setSearchError("");
      }
      setLoadingSearch(true);
      try {
        const params = new URLSearchParams({ role: searchRole, limit: "20" });
        if (query.trim()) params.set("q", query.trim());
        if (city.trim()) params.set("city", city.trim());
        if (filterProducts.length) params.set("product", filterProducts.join(","));
        if (filterServices.length) params.set("service", filterServices.join(","));
        if (filterStages.length) params.set("stage", filterStages.join(","));
        if (isAgentR04 && searchPartnerType) {
          params.set("partnerType", searchPartnerType);
        }
        if (mode === "append" && cursor) {
          params.set("cursor", cursor);
        }
        const data = await remcardFetch<{
          partners: PartnerSearchResult[];
          nextCursor?: string | null;
          hasMore?: boolean;
        }>(`/api/partnership/search?${params.toString()}`);
        if (requestGen !== searchRequestGen.current) return;

        const batch = data.partners ?? [];
        setSearchResults((prev) => mergeSearchResultPages(prev, batch, mode));
        setSearchNextCursor(data.nextCursor ?? null);
      } catch (caught) {
        if (requestGen !== searchRequestGen.current) return;
        if (mode === "reset") setSearchResults([]);
        setSearchError(
          caught instanceof RemcardApiError ? caught.message : "Не удалось выполнить поиск",
        );
      } finally {
        if (requestGen === searchRequestGen.current) {
          setLoadingSearch(false);
        }
      }
    },
    [city, filterProducts, filterServices, filterStages, isAgentR04, query, searchPartnerType, searchRole],
  );

  const overviewGroups = useMemo(
    () => (isOverview ? partitionPartnerOverview(partnerships, meId) : null),
    [isOverview, partnerships, meId],
  );

  const applyActiveListFilters = useCallback(
    (source: Partnership[]): Partnership[] => {
      let rows = source;
      const q = listSearch.trim().toLowerCase();
      if (q) {
        rows = rows.filter((p) => {
          const titles = partnerDisplayTitle(p, meId);
          const partner = partnershipPartnerUser(p, meId);
          const haystack = [
            titles.official,
            titles.alias ?? "",
            partner.city ?? "",
            partner.displayName ?? "",
            partner.organizationName ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        });
      }
      if (listPartnerType || listSpecialization || listCity.trim() || listStage) {
        rows = rows.filter((p) => {
          const partner = partnershipPartnerUser(p, meId);
          if (listCity.trim() && (partner.city ?? "").toLowerCase() !== listCity.trim().toLowerCase()) {
            return false;
          }
          if (!matchesListPartnerType(partner, listPartnerType)) return false;
          if (!matchesListSpecialization(partner, listSpecialization)) return false;
          if (!matchesListStage(partner, listStage)) return false;
          return true;
        });
      }
      rows = sortPartnershipsDeterministic(rows);
      if (listSort === "name_asc") {
        rows = [...rows].sort((a, b) => {
          const ta = partnerDisplayTitle(a, meId).alias ?? partnerDisplayTitle(a, meId).official;
          const tb = partnerDisplayTitle(b, meId).alias ?? partnerDisplayTitle(b, meId).official;
          return ta.localeCompare(tb, "ru");
        });
      }
      return rows;
    },
    [listCity, listPartnerType, listSearch, listSort, listSpecialization, listStage, meId],
  );

  const overviewActiveRows = useMemo(() => {
    if (!overviewGroups) return [];
    let rows: Partnership[];
    if (listArchiveView === "archive") {
      rows = partnerships.filter(
        (p) =>
          partnershipAgentSegment(p.status) === "active" && Boolean(p.listPreference?.archivedAt),
      );
    } else if (listArchiveView === "hidden") {
      rows = partnerships.filter((p) => Boolean(p.listPreference?.hiddenAt));
    } else {
      rows = overviewGroups.active;
    }
    return applyActiveListFilters(rows);
  }, [applyActiveListFilters, listArchiveView, overviewGroups, partnerships]);

  const visiblePartnerships = useMemo(() => {
    if (isOverview) {
      return overviewActiveRows;
    }
    let rows = partnerships;
    if (isAgentR04 && agentSegment) {
      rows = rows.filter((p) => partnershipAgentSegment(p.status) === agentSegment);
    }
    if (isAgentR04 && agentSegment === "invitations" && agentInvitationFlow) {
      rows = rows.filter((p) => {
        const outgoing = p.initiatedBy === meId;
        return agentInvitationFlow === "outgoing" ? outgoing : !outgoing;
      });
    }
    if (isAgentR04 && agentSegment === "active") {
      // Archive/hidden segmentation is applied on the server via listVisibility; invitations keep full list.
      rows = applyActiveListFilters(rows);
    }
    return rows;
  }, [
    agentInvitationFlow,
    agentSegment,
    applyActiveListFilters,
    isAgentR04,
    isOverview,
    meId,
    overviewActiveRows,
    partnerships,
  ]);

  useEffect(() => {
    setListPage(0);
  }, [
    agentInvitationFlow,
    agentSegment,
    listArchiveView,
    listCity,
    listPartnerType,
    listSearch,
    listSort,
    listSpecialization,
    listStage,
  ]);

  const pagedPartnerships = useMemo(() => {
    const start = listPage * listPageSize;
    return visiblePartnerships.slice(start, start + listPageSize);
  }, [listPage, listPageSize, visiblePartnerships]);

  const pagedOverviewDecisions = useMemo(() => {
    const rows = overviewGroups?.decisions ?? [];
    const start = decidePage * listPageSize;
    return rows.slice(start, start + listPageSize);
  }, [overviewGroups, decidePage, listPageSize]);

  const pagedOverviewWaiting = useMemo(() => {
    const rows = overviewGroups?.outgoing ?? [];
    const start = waitingPage * listPageSize;
    return rows.slice(start, start + listPageSize);
  }, [overviewGroups, waitingPage, listPageSize]);

  useEffect(() => {
    if (!overviewGroups || loadingList) return;
    // Prototype: open outgoing when there are no actives but there are waiting rows.
    if (overviewGroups.counts.active === 0 && overviewGroups.counts.outgoing > 0) {
      setWaitingOpen(true);
    }
  }, [overviewGroups, loadingList]);

  const togglePartnerSelect = useCallback((id: string) => {
    setSelectedPartnerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePartnerSelectAll = useCallback((ids: string[], checked: boolean) => {
    setSelectedPartnerIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const runBulkListPreference = useCallback(
    async (
      operation: BulkListOperation,
      apply: boolean,
      retryFailedOnly = false,
      fixedIds?: string[],
    ) => {
      if (bulkBusy) return;
      const ids = retryFailedOnly
        ? (bulkOutcome?.failedIds ?? [])
        : (fixedIds ?? [...selectedPartnerIds]);
      if (ids.length === 0) return;
      setBulkBusy(true);
      const failedIds: string[] = [];
      let ok = 0;
      for (const id of ids) {
        try {
          if (operation === "archive") {
            await patchPartnershipListPreference(id, { archived: apply });
          } else {
            await patchPartnershipListPreference(id, { hidden: apply });
          }
          ok += 1;
        } catch {
          failedIds.push(id);
        }
      }
      const actionLabel =
        operation === "archive"
          ? apply
            ? "перенесены в архив"
            : "возвращены из архива"
          : apply
            ? "убраны из вашего списка"
            : "возвращены в список";
      let message: string;
      if (failedIds.length === 0) {
        message = `Готово: ${ok} ${ok === 1 ? "запись" : ok < 5 ? "записи" : "записей"} ${actionLabel}. Партнёрство и условия не изменились.`;
      } else if (ok === 0) {
        message = `Не удалось обновить ${failedIds.length} ${failedIds.length === 1 ? "запись" : "записи"}. Попробуйте повторить.`;
      } else {
        message = `Частично выполнено: ${ok} из ${ids.length} ${actionLabel}. Не удалось: ${failedIds.length}.`;
      }
      setBulkOutcome({ message, failedIds, operation, undo: !apply });
      setSelectedPartnerIds(new Set(failedIds));
      await loadList();
      setBulkBusy(false);
    },
    [bulkBusy, bulkOutcome?.failedIds, loadList, selectedPartnerIds],
  );

  useEffect(() => {
    if (!isAgentR04) return;
    setSelectedPartnerIds(new Set());
  }, [
    agentInvitationFlow,
    agentSegment,
    isAgentR04,
    listArchiveView,
    listCity,
    listPartnerType,
    listSearch,
    listSort,
    listSpecialization,
    listStage,
  ]);

  useEffect(() => {
    if (!isAgentR04) return;
    if (!discoverySpecialization) {
      setFilterProducts([]);
      setFilterServices([]);
      return;
    }
    const [group, id] = discoverySpecialization.split(":");
    if (group === "products") {
      setFilterProducts(id ? [id] : []);
      setFilterServices([]);
    } else if (group === "services") {
      setFilterServices(id ? [id] : []);
      setFilterProducts([]);
    }
  }, [discoverySpecialization, isAgentR04]);

  useEffect(() => {
    if (!isAgentR04) return;
    setFilterStages(discoveryStageId ? [discoveryStageId] : []);
  }, [discoveryStageId, isAgentR04]);

  const listFilterChips = useMemo(() => {
    if (!isAgentR04) return [];
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (listPartnerType) {
      chips.push({
        key: "type",
        label: `Тип: ${listPartnerType}`,
        onClear: () => setListPartnerType(""),
      });
    }
    if (listSpecialization) {
      chips.push({
        key: "spec",
        label: `Специализация`,
        onClear: () => setListSpecialization(""),
      });
    }
    if (listStage) {
      chips.push({ key: "stage", label: `Этап`, onClear: () => setListStage("") });
    }
    if (listCity.trim()) {
      chips.push({
        key: "city",
        label: `Город: ${listCity.trim()}`,
        onClear: () => setListCity(""),
      });
    }
    return chips;
  }, [isAgentR04, listCity, listPartnerType, listSpecialization, listStage]);

  const resetListFilters = useCallback(() => {
    setListArchiveView("active");
    setListPartnerType("");
    setListSpecialization("");
    setListCity("");
    setListStage("");
    setListSort("updated_desc");
    setListSearch("");
    setTaxonomyFilterResetKey((k) => k + 1);
  }, []);

  const resetSearchFilters = useCallback(() => {
    setQuery("");
    setCity("");
    setFilterProducts([]);
    setFilterServices([]);
    setFilterStages([]);
    setSearchPartnerType("");
    setDiscoverySpecialization("");
    setDiscoveryStageId("");
    setSearchRole(defaultSearchRole);
    setTaxonomyFilterResetKey((key) => key + 1);
    setSearchNextCursor(null);
  }, [defaultSearchRole]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (tab !== "find") return;
    setSearchNextCursor(null);
    void loadSearch("reset");
  }, [
    tab,
    city,
    filterProducts,
    filterServices,
    filterStages,
    query,
    searchPartnerType,
    searchRole,
    loadSearch,
  ]);

  const attentionCount = useMemo(
    () => countNeedsMyResponse(partnerships, meId),
    [meId, partnerships],
  );

  useEffect(() => {
    onAttentionCountChange?.(attentionCount);
  }, [attentionCount, onAttentionCountChange]);

  async function runPartnershipAction(
    partnership: Partnership,
    action: string,
  ) {
    setBusyId(partnership.id);
    setActionError("");
    try {
      const body: Record<string, unknown> = { action };
      if (action === "accept_pending") {
        body.expectedUpdatedAt = partnership.updatedAt;
      }
      await remcardFetch(`/api/partnership/${partnership.id}`, {
        method: "PATCH",
        body,
      });
      await loadList();
    } catch (caught) {
      setActionError(caught instanceof RemcardApiError ? caught.message : "Действие не выполнено");
    } finally {
      setBusyId(null);
    }
  }

  function handlePartnershipUiAction(partnership: Partnership, actionKind: string) {
    if (actionKind === "counter_offer" || actionKind === "counter_offer_back") {
      setCounterOfferTarget({
        partnership,
        action: actionKind,
      });
      return;
    }
    void runPartnershipAction(partnership, actionKind);
  }

  async function loadTermRequests(partnershipId: string) {
    setExpandedTermPartnershipId(partnershipId);
    setTermRequests((prev) => ({
      ...prev,
      [partnershipId]: { state: "loading", requests: [], error: "" },
    }));
    try {
      const data = await remcardFetch<{ requests: TermChangeRequest[] }>(
        `/api/partnerships/${partnershipId}/term-change`,
      );
      setTermRequests((prev) => ({
        ...prev,
        [partnershipId]: { state: "loaded", requests: data.requests ?? [], error: "" },
      }));
    } catch (caught) {
      setTermRequests((prev) => ({
        ...prev,
        [partnershipId]: {
          state: "error",
          requests: [],
          error:
            caught instanceof RemcardApiError
              ? caught.message
              : "Не удалось загрузить запросы на изменение условий",
        },
      }));
    }
  }

  useEffect(() => {
    if (!termsPartnershipId) {
      return;
    }
    setTab("list");
    void loadTermRequests(termsPartnershipId);
  }, [termsPartnershipId]);

  useEffect(() => {
    if (!termsPartnershipId) {
      overviewDeepLinkAppliedRef.current = null;
      return;
    }
    if (!overviewGroups || loadingList) return;
    if (overviewDeepLinkAppliedRef.current === termsPartnershipId) return;
    const match = partnerships.find((p) => p.id === termsPartnershipId);
    if (!match) return;
    const zone = overviewZoneForPartnership(match, meId);
    if (zone === "active") {
      const idx = overviewActiveRows.findIndex((p) => p.id === termsPartnershipId);
      if (idx < 0) return;
      setListPage(Math.floor(idx / listPageSize));
    } else if (zone === "decide") {
      const idx = overviewGroups.decisions.findIndex((p) => p.id === termsPartnershipId);
      if (idx < 0) return;
      setDecidePage(Math.floor(idx / listPageSize));
    } else if (zone === "waiting") {
      const idx = overviewGroups.outgoing.findIndex((p) => p.id === termsPartnershipId);
      if (idx < 0) return;
      setWaitingOpen(true);
      setWaitingPage(Math.floor(idx / listPageSize));
    } else {
      return;
    }
    overviewDeepLinkAppliedRef.current = termsPartnershipId;
  }, [
    termsPartnershipId,
    overviewGroups,
    overviewActiveRows,
    loadingList,
    partnerships,
    meId,
    listPageSize,
  ]);

  const scrollToOverviewZone = useCallback(
    (zone: PartnerOverviewZone) => {
      if (zone === "waiting") {
        setWaitingOpen(true);
      }
      if (zone === "decide" && overviewGroups && overviewGroups.counts.decisions === 0) {
        // Zero-state target mounts on next paint; scroll after decideZeroHint effect.
        setDecideZeroHint(true);
        return;
      }
      if (zone === "decide") {
        setDecideZeroHint(false);
      }
      const node =
        zone === "active"
          ? overviewZoneActiveRef.current
          : zone === "decide"
            ? overviewZoneDecideRef.current
            : overviewZoneWaitingRef.current;
      window.requestAnimationFrame(() => {
        node?.scrollIntoView?.({ block: "start", behavior: "smooth" });
      });
    },
    [overviewGroups],
  );

  useEffect(() => {
    if (!decideZeroHint) return;
    window.requestAnimationFrame(() => {
      overviewZoneDecideRef.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    });
  }, [decideZeroHint]);

  async function refreshProfile() {
    try {
      const profile = await remcardFetch<ProProfileResponse>("/api/pro/profile");
      setMeProfile(profile);
    } catch {
      // keep previous profile for invite resolution
    }
  }

  const agentDiscoveryFilterProps = {
    specialization: discoverySpecialization,
    stageId: discoveryStageId,
    city,
    partnerType: searchPartnerType,
    onSpecializationChange: setDiscoverySpecialization,
    onStageChange: setDiscoveryStageId,
    onCityChange: setCity,
    onPartnerTypeChange: setSearchPartnerType,
    resetKey: taxonomyFilterResetKey,
  };

  const agentFindSearchControls = (
    <>
      <p className={styles.modalLead}>
        Поиск по всем партнёрам с одобренным профилем в RemCard. Оба поля ниже — основной способ отбора.
      </p>
      <div className={styles.modalFilterBlock}>
        <AgentPartnerDiscoveryFilters layout="modal-primary" {...agentDiscoveryFilterProps} />
      </div>
      <p className={styles.modalFilterHint}>
        Выберите один фильтр или оба — покажем партнёров, которые подходят под выбранные условия.
      </p>
      <div className={styles.modalSearchBlock}>
        <TextField
          label="Поиск по словам необязательно"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Название, товар, услуга, этап или ID"
          hint="Можно оставить пустым и искать только по фильтрам выше"
        />
        <div className={styles.modalSearchAction}>
          <Button
            type="button"
            onClick={() => {
              setSearchNextCursor(null);
              void loadSearch("reset");
            }}
            disabled={loadingSearch}
          >
            {loadingSearch ? "Поиск…" : "Найти"}
          </Button>
        </div>
      </div>
      <AgentPartnerDiscoveryFilters layout="modal-more" {...agentDiscoveryFilterProps} />
    </>
  );

  const agentFindResultsBlock = (
    <>
      {searchError ? (
        <div className={styles.error} role="alert">
          <p>{searchError}</p>
          <Button
            type="button"
            variant="secondary"
            disabled={loadingSearch}
            onClick={() => {
              setSearchNextCursor(null);
              void loadSearch("reset");
            }}
          >
            Повторить
          </Button>
        </div>
      ) : null}
      {searchResults.length > 0 || loadingSearch ? (
        <p className={styles.modalResultsLead} data-testid="agent-partner-search-count">
          Найдено: {searchResults.length}
          {searchNextCursor ? "+" : ""}
        </p>
      ) : null}
      <div
        className={styles.modalResults}
        data-testid="agent-partner-search-results"
        data-loading={loadingSearch ? "true" : "false"}
      >
        {loadingSearch && searchResults.length === 0 ? (
          <p className={styles.partnerMeta}>Загружаем результаты…</p>
        ) : null}
        {!loadingSearch &&
          searchResults.slice(0, 12).map((partner) => {
            const metaLines = partnerSearchResultMeta(partner);
            return (
              <article key={partner.id} className={styles.modalResultRow}>
                <div>
                  <strong>{partnerTitle(partner)}</strong>
                  {metaLines.map((line) => (
                    <p key={line} className={styles.partnerMeta}>
                      {line}
                    </p>
                  ))}
                  {showAgentPublishedTerms ? (
                    <PartnerGeneralTermsDetails partnerUserId={partner.id} />
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={Boolean(inviteTarget)}
                  onClick={() => setInviteTarget(partner)}
                >
                  Пригласить
                </Button>
              </article>
            );
          })}
        {!loadingSearch && searchResults.length === 0 ? (
          <p className={styles.partnerMeta}>По этому запросу партнёров не найдено.</p>
        ) : null}
      </div>
    </>
  );

  if (isModalSurface) {
    return (
      <div className={styles.modalSurface} data-testid={`agent-r04-modal-${agentModalSurface}`}>
        {agentModalSurface === "link" ? (
          <>
            {isAgentCooperationInviter(inviterSide) ? (
              <>
                <p className={styles.partnerMeta}>
                  Ссылка «к обсуждению» — без процентов. Персональные условия партнёр предложит после
                  запроса.
                </p>
                <PartnerDiscussionInvitePanel showSectionTitle={false} />
              </>
            ) : (
              <>
                {partnersAudience === "specialist-r04" ? (
                  <div className={styles.linkModeTabs} role="tablist" aria-label="Тип ссылки">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={linkInviteMode === "discussion"}
                      data-active={linkInviteMode === "discussion"}
                      onClick={() => setLinkInviteMode("discussion")}
                    >
                      К обсуждению
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={linkInviteMode === "terms"}
                      data-active={linkInviteMode === "terms"}
                      onClick={() => setLinkInviteMode("terms")}
                    >
                      С условиями
                    </button>
                  </div>
                ) : null}
                {partnersAudience === "specialist-r04" && linkInviteMode === "discussion" ? (
                  <PartnerDiscussionInvitePanel showSectionTitle={false} />
                ) : (
                  <PartnerLinkInvitePanel meProfile={meProfile} showSectionTitle={false} />
                )}
              </>
            )}
          </>
        ) : (
          <>
            {agentFindSearchControls}
            {agentFindResultsBlock}
            {inviteTarget ? (
              <PartnerInviteDialog
                target={inviteTarget}
                meProfile={meProfile}
                busy={Boolean(busyId)}
                onClose={() => setInviteTarget(null)}
                onSent={() => {
                  setInviteTarget(null);
                  onCloseAgentModal?.();
                  void loadList();
                }}
              />
            ) : null}
          </>
        )}
      </div>
    );
  }

  return (
    <div className={isAgentR04 ? styles.agentR04Root : undefined} data-variant={variant}>
      {!isAgentR04 ? (
        <Tabs
          active={tab}
          onChange={setTab}
          items={[
            { id: "list", label: "Мои партнёры", count: partnerships.length || undefined },
            { id: "find", label: "Найти в RemCard" },
            { id: "link", label: "Пригласить по ссылке" },
          ]}
        />
      ) : null}

      {!isOverview && attentionCount > 0 ? (
        <Panel compact>
          <p className={styles.attention}>
            Требует внимания: {attentionCount}{" "}
            {attentionCount === 1 ? "партнёрство ждёт вашего решения" : "партнёрства ждут вашего решения"}.
          </p>
        </Panel>
      ) : null}

      {!isAgentR04 ? (
        <p className={styles.partnerMeta}>
          <Link href="/partners/agent-terms">Мои условия для агентов</Link>
          {" · "}
          опубликованные категории и общий процент для новых запросов
        </p>
      ) : null}

      {listError && tab === "list" && !isOverview ? (
        <p className={styles.error} role="alert">
          {listError}
        </p>
      ) : null}
      {actionError ? (
        <p className={styles.error} role="alert">
          {actionError}
        </p>
      ) : null}

      <PartnerListHideDialog
        open={bulkHideConfirmOpen}
        busy={bulkBusy}
        selectedCount={bulkHidePendingIds.length}
        onClose={() => {
          if (bulkBusy) return;
          setBulkHideConfirmOpen(false);
          setBulkHidePendingIds([]);
        }}
        onConfirm={() => {
          const ids = bulkHidePendingIds;
          if (ids.length === 0) {
            setBulkHideConfirmOpen(false);
            return;
          }
          void runBulkListPreference("hidden", true, false, ids).finally(() => {
            setBulkHideConfirmOpen(false);
            setBulkHidePendingIds([]);
          });
        }}
      />

      {discussionContext ? (
        <Panel compact className={styles.discussionContextPanel} data-testid="discussion-invite-context">
          <p className={styles.attention}>
            <strong>Обсуждение:</strong> {discussionContext.cooperationSubject}
          </p>
          <p className={styles.partnerMeta}>
            {discussionContext.role === "author" ? "Получатель" : "Инициатор"}:{" "}
            {discussionContext.counterpartyDisplayName || discussionContext.recipientLabel}
          </p>
          {discussionContext.status === "JOINED" && discussionContext.canProposeTerms ? (
            <div className={styles.searchAction}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const target = discussionContextToInviteTarget(discussionContext);
                  if (target) setInviteTarget(target);
                }}
              >
                Предложить условия сотрудничества
              </Button>
            </div>
          ) : (
            <p className={styles.partnerMeta}>
              {discussionContext.status === "PENDING"
                ? "Ожидаем присоединения второго участника по ссылке."
                : "Следующий шаг недоступен для текущего статуса обсуждения."}
            </p>
          )}
        </Panel>
      ) : discussionContextError && discussionInviteId ? (
        <p className={styles.error} role="alert">
          {discussionContextError}
        </p>
      ) : null}

      {tab === "list" && isOverview && overviewGroups ? (
        <PartnersOverviewLayout
          lead="Магазины, мастера и компании, с которыми вы обмениваетесь клиентами. Условия по каждому партнёру открываются в его строке."
          counts={overviewGroups.counts}
          loading={loadingList}
          error={listError}
          onRetry={() => void loadList()}
          onOpenFind={() => onOpenPartnerHub?.("find")}
          onOpenLink={() => onOpenPartnerHub?.("link")}
          onTileNavigate={scrollToOverviewZone}
          waitingOpen={waitingOpen}
          onWaitingOpenChange={setWaitingOpen}
          decideZeroHint={decideZeroHint}
          zoneRefs={{
            active: overviewZoneActiveRef,
            decide: overviewZoneDecideRef,
            waiting: overviewZoneWaitingRef,
          }}
          decisionSlot={
            <AgentPartnerCollection
              partnerships={pagedOverviewDecisions}
              meId={meId}
              viewMode={listViewMode}
              busyId={busyId}
              onRunAction={(id, action) => {
                const partnership = partnerships.find((item) => item.id === id);
                if (!partnership) return;
                handlePartnershipUiAction(partnership, action);
              }}
              onUpdated={() => void loadList()}
              termRequests={termRequests}
              onLoadTermRequests={(id) => void loadTermRequests(id)}
              expandedTermPartnershipId={expandedTermPartnershipId}
              selectedIds={selectedPartnerIds}
              onToggleSelect={togglePartnerSelect}
              onToggleSelectAll={togglePartnerSelectAll}
              page={decidePage}
              pageSize={listPageSize}
              totalCount={overviewGroups.decisions.length}
              onPageChange={setDecidePage}
              onPageSizeChange={(size) => {
                setListPageSize(size);
                setDecidePage(0);
              }}
            />
          }
          activeSlot={
            <>
              <div className={styles.agentToolbarShell}>
                <AgentR04ListToolbar
                  listMode="active"
                  count={overviewActiveRows.length}
                  searchQuery={listSearch}
                  searchPlaceholder={AGENT_R04_LIST_SEARCH_PLACEHOLDER}
                  onSearchQueryChange={setListSearch}
                  viewMode={listViewMode}
                  onViewModeChange={setListViewMode}
                  archiveView={listArchiveView}
                  onArchiveViewChange={setListArchiveView}
                  partnerType={listPartnerType}
                  specialization={listSpecialization}
                  stageId={listStage}
                  city={listCity}
                  sort={listSort}
                  onPartnerTypeChange={setListPartnerType}
                  onSpecializationChange={setListSpecialization}
                  onStageChange={setListStage}
                  onCityChange={setListCity}
                  onSortChange={setListSort}
                  onResetFilters={resetListFilters}
                  taxonomyResetKey={taxonomyFilterResetKey}
                  chips={listFilterChips}
                />
              </div>
              <AgentPartnerBulkBar
                selectedCount={selectedPartnerIds.size}
                busy={bulkBusy}
                listVisibility={listArchiveView}
                outcome={bulkOutcome}
                onArchive={() => void runBulkListPreference("archive", true)}
                onRestoreArchive={() => void runBulkListPreference("archive", false)}
                onHide={() => {
                  const ids = [...selectedPartnerIds];
                  if (ids.length === 0) return;
                  setBulkHidePendingIds(ids);
                  setBulkHideConfirmOpen(true);
                }}
                onRestoreHidden={() => void runBulkListPreference("hidden", false)}
                onClearSelection={() => setSelectedPartnerIds(new Set())}
                onRetryFailed={() => {
                  if (bulkOutcome) {
                    void runBulkListPreference(
                      bulkOutcome.operation,
                      !bulkOutcome.undo,
                      true,
                    );
                  }
                }}
                onDismissOutcome={() => setBulkOutcome(null)}
              />
              {overviewActiveRows.length === 0 ? (
                <Panel
                  title={
                    listArchiveView === "archive"
                      ? "В архиве пока нет записей"
                      : listArchiveView === "hidden"
                        ? "Скрытых записей пока нет"
                        : listFilterChips.length || listSearch.trim()
                          ? "Записей не найдено"
                          : "Действующих партнёров пока нет"
                  }
                />
              ) : (
                <AgentPartnerCollection
                  partnerships={pagedPartnerships}
                  meId={meId}
                  viewMode={listViewMode}
                  busyId={busyId}
                  onRunAction={(id, action) => {
                    const partnership = partnerships.find((item) => item.id === id);
                    if (!partnership) return;
                    handlePartnershipUiAction(partnership, action);
                  }}
                  onUpdated={() => void loadList()}
                  termRequests={termRequests}
                  onLoadTermRequests={(id) => void loadTermRequests(id)}
                  expandedTermPartnershipId={expandedTermPartnershipId}
                  selectedIds={selectedPartnerIds}
                  onToggleSelect={togglePartnerSelect}
                  onToggleSelectAll={togglePartnerSelectAll}
                  page={listPage}
                  pageSize={listPageSize}
                  totalCount={overviewActiveRows.length}
                  onPageChange={setListPage}
                  onPageSizeChange={(size) => {
                    setListPageSize(size);
                    setListPage(0);
                  }}
                />
              )}
            </>
          }
          waitingSlot={
            overviewGroups.outgoing.length === 0 ? (
              <p className={styles.partnerMeta}>Отправленных приглашений пока нет.</p>
            ) : (
              <AgentPartnerCollection
                partnerships={pagedOverviewWaiting}
                meId={meId}
                viewMode={listViewMode}
                busyId={busyId}
                onRunAction={(id, action) => {
                  const partnership = partnerships.find((item) => item.id === id);
                  if (!partnership) return;
                  handlePartnershipUiAction(partnership, action);
                }}
                onUpdated={() => void loadList()}
                termRequests={termRequests}
                onLoadTermRequests={(id) => void loadTermRequests(id)}
                expandedTermPartnershipId={expandedTermPartnershipId}
                selectedIds={selectedPartnerIds}
                onToggleSelect={togglePartnerSelect}
                onToggleSelectAll={togglePartnerSelectAll}
                page={waitingPage}
                pageSize={listPageSize}
                totalCount={overviewGroups.outgoing.length}
                onPageChange={setWaitingPage}
                onPageSizeChange={(size) => {
                  setListPageSize(size);
                  setWaitingPage(0);
                }}
              />
            )
          }
        />
      ) : tab === "list" ? (
        <>
          {isAgentR04 ? (
            <div className={styles.agentToolbarShell}>
              <AgentR04ListToolbar
                listMode={agentSegment === "invitations" ? "invitations" : "active"}
                count={visiblePartnerships.length}
                searchQuery={listSearch}
                searchPlaceholder={AGENT_R04_LIST_SEARCH_PLACEHOLDER}
                onSearchQueryChange={setListSearch}
                viewMode={listViewMode}
                onViewModeChange={setListViewMode}
                archiveView={listArchiveView}
                onArchiveViewChange={setListArchiveView}
                partnerType={listPartnerType}
                specialization={listSpecialization}
                stageId={listStage}
                city={listCity}
                sort={listSort}
                onPartnerTypeChange={setListPartnerType}
                onSpecializationChange={setListSpecialization}
                onStageChange={setListStage}
                onCityChange={setListCity}
                onSortChange={setListSort}
                onResetFilters={resetListFilters}
                taxonomyResetKey={taxonomyFilterResetKey}
                chips={listFilterChips}
              />
            </div>
          ) : null}
          {isAgentR04 && agentSegment === "active" ? (
            <AgentPartnerBulkBar
              selectedCount={selectedPartnerIds.size}
              busy={bulkBusy}
              listVisibility={listArchiveView}
              outcome={bulkOutcome}
              onArchive={() => void runBulkListPreference("archive", true)}
              onRestoreArchive={() => void runBulkListPreference("archive", false)}
              onHide={() => {
                const ids = [...selectedPartnerIds];
                if (ids.length === 0) return;
                setBulkHidePendingIds(ids);
                setBulkHideConfirmOpen(true);
              }}
              onRestoreHidden={() => void runBulkListPreference("hidden", false)}
              onClearSelection={() => setSelectedPartnerIds(new Set())}
              onRetryFailed={() => {
                if (bulkOutcome) {
                  void runBulkListPreference(
                    bulkOutcome.operation,
                    !bulkOutcome.undo,
                    true,
                  );
                }
              }}
              onDismissOutcome={() => setBulkOutcome(null)}
            />
          ) : null}
          {loadingList ? (
            <Panel>Загрузка партнёрств…</Panel>
          ) : visiblePartnerships.length === 0 ? (
            <Panel
              title={
                isAgentR04 && agentSegment === "invitations" && agentInvitationFlow === "incoming"
                  ? "Входящих приглашений пока нет"
                  : isAgentR04 && agentSegment === "invitations" && agentInvitationFlow === "outgoing"
                    ? "Отправленных приглашений пока нет"
                    : isAgentR04 && listArchiveView === "archive"
                      ? "В архиве пока нет записей"
                      : isAgentR04 && listArchiveView === "hidden"
                        ? "Скрытых записей пока нет"
                      : isAgentR04 && (listFilterChips.length || listSearch.trim())
                        ? "Записей не найдено"
                        : "Партнёров пока нет"
              }
              hint={
                isAgentR04 && agentSegment === "invitations" && agentInvitationFlow === "incoming"
                  ? "Здесь появятся предложения партнёров, которые можно принять или отклонить."
                  : isAgentR04 && agentSegment === "invitations" && agentInvitationFlow === "outgoing"
                    ? "Здесь будут приглашения, которые вы отправили и которые ждут ответа."
                    : isAgentR04
                      ? listFilterChips.length || listSearch.trim()
                        ? "Попробуйте другие условия или сбросьте фильтры."
                        : "Нажмите «Найти или пригласить партнёра», чтобы отправить первое приглашение."
                      : "Перейдите во вкладку «Найти партнёра», чтобы отправить первое приглашение."
              }
            />
          ) : isAgentR04 ? (
            <>
            <AgentPartnerCollection
              partnerships={pagedPartnerships}
              meId={meId}
              viewMode={listViewMode}
              busyId={busyId}
              onRunAction={(id, action) => {
                const partnership = partnerships.find((item) => item.id === id);
                if (!partnership) return;
                handlePartnershipUiAction(partnership, action);
              }}
              onUpdated={() => void loadList()}
              termRequests={termRequests}
              onLoadTermRequests={(id) => void loadTermRequests(id)}
              expandedTermPartnershipId={expandedTermPartnershipId}
              selectedIds={selectedPartnerIds}
              onToggleSelect={togglePartnerSelect}
              onToggleSelectAll={togglePartnerSelectAll}
              page={listPage}
              pageSize={listPageSize}
              totalCount={visiblePartnerships.length}
              onPageChange={setListPage}
              onPageSizeChange={(size) => {
                setListPageSize(size);
                setListPage(0);
              }}
            />
            </>
          ) : (
            <div className={styles.list}>
            {visiblePartnerships.map((partnership) => {
              const partner =
                partnership.storeUserId === meId ? partnership.proUser : partnership.storeUser;
              const titles = isAgentR04
                ? partnerDisplayTitle(partnership, meId)
                : { official: partnerTitle(partner), alias: null };
              const statusLabel =
                PARTNERSHIP_STATUS_LABELS[partnership.status] ?? partnership.status;
              const needsResponse = partnershipNeedsMyResponse(partnership, meId);
              const actions = getPartnershipUiActions(partnership, meId);
              const termState = termRequests[partnership.id] ?? {
                state: "idle" as const,
                requests: [],
                error: "",
              };
              const activeTerms = partnership.terms.filter((t) => !t.isExcluded);
              const termsPreview = activeTerms
                .slice(0, 2)
                .map((t) => `${displayCategoryLabel(t.category, t.categoryLabel)} ${t.storePercent}%`)
                .join(" · ");

              return (
                <Panel key={partnership.id} compact className={isAgentR04 ? styles.agentCard : undefined}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3>{titles.alias ?? titles.official}</h3>
                      {titles.alias ? (
                        <p className={styles.partnerMeta}>Официально: {titles.official}</p>
                      ) : null}
                      <p className={styles.partnerMeta}>
                        {partner.city ?? "Город не указан"}
                        {needsResponse ? " · ожидает вашего решения" : ""}
                      </p>
                    </div>
                    <div className={styles.cardHeaderAside}>
                      {isAgentR04 ? (
                        <AgentPartnerRecordActions
                          partnership={partnership}
                          meId={meId}
                          onUpdated={() => void loadList()}
                        />
                      ) : null}
                      <StatusBadge
                        label={statusLabel}
                        tone={partnershipStatusTone(partnership.status)}
                      />
                    </div>
                  </div>

                  {partnership.note ? (
                    <p className={styles.note}>Комментарий: {partnership.note}</p>
                  ) : null}

                  {isAgentR04 ? (
                    <>
                      <p className={styles.termsCaption}>
                        Условия: {termsPreview || "—"}
                        {activeTerms.length > 2 ? (
                          <button
                            type="button"
                            className={styles.termsToggle}
                            onClick={() =>
                              setExpandedTermsId((id) =>
                                id === partnership.id ? null : partnership.id,
                              )
                            }
                          >
                            {expandedTermsId === partnership.id ? "Свернуть" : "Подробнее"}
                          </button>
                        ) : null}
                      </p>
                      {expandedTermsId === partnership.id ? (
                        <ul className={styles.termsCompactList}>
                          {activeTerms.map((term) => (
                            <li key={term.id}>
                              {displayCategoryLabel(term.category, term.categoryLabel)} —{" "}
                              {term.storePercent}%
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <p className={styles.termsCaption}>Действующие условия</p>
                      <table className={styles.termsTable}>
                        <thead>
                          <tr>
                            <th>Категория</th>
                            <th>%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {partnership.terms.map((term) => (
                            <tr key={term.id}>
                              <td>{displayCategoryLabel(term.category, term.categoryLabel)}</td>
                              <td>{term.isExcluded ? "—" : `${term.storePercent}%`}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}

                  <div className={styles.rowActions}>
                    {actions.map((action) =>
                      action.kind === "waiting" ? (
                        <p key={action.message} className={styles.partnerMeta}>
                          {action.message}
                        </p>
                      ) : (
                        <Button
                          key={action.kind}
                          variant={action.variant ?? "primary"}
                          disabled={busyId === partnership.id}
                          onClick={() => handlePartnershipUiAction(partnership, action.kind)}
                        >
                          {action.label}
                        </Button>
                      ),
                    )}
                    {partnership.status === "ACTIVE" ? (
                      <>
                        <Button
                          variant="secondary"
                          disabled={busyId === partnership.id}
                          onClick={() => void loadTermRequests(partnership.id)}
                        >
                          Изменение условий
                        </Button>
                        {isAgentR04 ? (
                          <Link href="/certificates" className={styles.certLink}>
                            Создать сертификат
                          </Link>
                        ) : null}
                      </>
                    ) : null}
                  </div>

                  {expandedTermPartnershipId === partnership.id ? (
                    <TermChangePanel
                      partnership={partnership}
                      meId={meId}
                      requests={termState.state === "loaded" ? termState.requests : null}
                      loadState={
                        termState.state === "idle"
                          ? "loading"
                          : termState.state === "loaded"
                            ? "loaded"
                            : termState.state
                      }
                      loadError={termState.error}
                      onReload={() => void loadTermRequests(partnership.id)}
                      onChanged={() => {
                        void loadList();
                        void loadTermRequests(partnership.id);
                      }}
                    />
                  ) : null}
                </Panel>
              );
            })}
            </div>
          )}
        </>
      ) : tab === "link" ? (
        <PartnerLinkInvitePanel meProfile={meProfile} />
      ) : (
        <>
          <Panel compact>
            {isAgentR04 ? (
              <>
                {agentFindSearchControls}
                {searchError ? (
                  <p className={styles.error} role="alert">
                    {searchError}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className={styles.searchDescription}>{searchMeta.description}</p>
                <div className={styles.searchGrid}>
                  <TextField
                    label="Поиск"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={searchMeta.namePlaceholder}
                    hint="Слово, название или публичный ID"
                  />
                  <TextField
                    label="Город"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                  />
                  <label className={styles.roleField}>
                    <span>Кого ищем</span>
                    <select
                      value={searchRole}
                      onChange={(event) => setSearchRole(event.target.value as SearchRole)}
                    >
                      {SEARCH_ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className={styles.searchAction}>
                    <Button
                      type="button"
                      onClick={() => {
                        setSearchNextCursor(null);
                        void loadSearch("reset");
                      }}
                      disabled={loadingSearch}
                    >
                      {loadingSearch ? "Поиск…" : "Найти"}
                    </Button>
                  </div>
                </div>
              </>
            )}
            {!isAgentR04 ? (
              <PartnerSearchFilters
                productIds={filterProducts}
                serviceIds={filterServices}
                stageIds={filterStages}
                onChangeProducts={setFilterProducts}
                onChangeServices={setFilterServices}
                onChangeStages={setFilterStages}
                taxonomyFilterResetKey={taxonomyFilterResetKey}
              />
            ) : null}
            {isAgentR04 && (query || city || searchPartnerType || hasCustomFilters) ? (
              <div className={styles.collectionCount}>
                <span>Результаты поиска: {searchResults.length}{searchNextCursor ? "+" : ""}</span>
                <Button type="button" variant="secondary" onClick={resetSearchFilters}>
                  Сбросить фильтры
                </Button>
              </div>
            ) : null}
          </Panel>

          {loadingSearch && searchResults.length === 0 ? (
            <Panel>Ищем партнёров…</Panel>
          ) : searchError && searchResults.length === 0 ? (
            <Panel title="Не удалось выполнить поиск">
              <p className={styles.error} role="alert">
                {searchError}
              </p>
              <div className={styles.emptyActions}>
                <Button type="button" onClick={() => void loadSearch("reset")}>
                  Повторить
                </Button>
              </div>
            </Panel>
          ) : !loadingSearch && !searchError && searchResults.length === 0 ? (
            <Panel title="По выбранным условиям партнёры пока не найдены">
              <p className={styles.searchDescription}>
                Попробуйте изменить фильтры. Знаете магазин, компанию или специалиста в этой области?
                Пригласите их в RemCard и предложите сотрудничество.
              </p>
              <div className={styles.emptyActions}>
                <Button type="button" onClick={() => setTab("link")}>
                  Пригласить знакомого партнёра
                </Button>
                {hasCustomFilters ? (
                  <Button type="button" variant="secondary" onClick={resetSearchFilters}>
                    Сбросить фильтры
                  </Button>
                ) : null}
              </div>
            </Panel>
          ) : (
            <div className={styles.list}>
              {searchResults.map((partner) => {
                const status = partner.partnershipStatus;
                return (
                  <Panel key={partner.id} compact>
                    <div className={styles.cardHeader}>
                      <div>
                        <h3>{partnerTitle(partner)}</h3>
                        <p className={styles.partnerMeta}>
                          {partner.city ?? "Город не указан"}
                          {partner.partnerTypeLabel
                            ? ` · ${partner.partnerTypeLabel}`
                            : partner.partnerType
                              ? ` · ${partner.partnerType}`
                              : ""}
                        </p>
                        {partner.workingProductLabels?.length ? (
                          <p className={styles.partnerMeta}>
                            Товары: {partner.workingProductLabels.join(", ")}
                          </p>
                        ) : null}
                        {partner.workingServiceLabels?.length ? (
                          <p className={styles.partnerMeta}>
                            Услуги: {partner.workingServiceLabels.join(", ")}
                          </p>
                        ) : null}
                        {partner.workingStageLabels?.length ? (
                          <p className={styles.partnerMeta}>
                            Этапы: {partner.workingStageLabels.join(", ")}
                          </p>
                        ) : null}
                        {partner.partnershipContact?.name ||
                        partner.partnershipContact?.phone ||
                        partner.partnershipContact?.email ? (
                          <p className={styles.partnerMeta}>
                            Контакт: {partner.partnershipContact.name ?? "—"}
                            {partner.partnershipContact.phone
                              ? ` · ${partner.partnershipContact.phone}`
                              : ""}
                            {partner.partnershipContact.email
                              ? ` · ${partner.partnershipContact.email}`
                              : ""}
                          </p>
                        ) : null}
                        {showAgentPublishedTerms ? (
                          <PartnerGeneralTermsDetails partnerUserId={partner.id} />
                        ) : null}
                      </div>
                      {status ? (
                        <StatusBadge
                          label={PARTNERSHIP_STATUS_LABELS[status] ?? status}
                          tone={partnershipStatusTone(status)}
                        />
                      ) : null}
                    </div>
                    {!status || status === "ENDED" ? (
                      <Button
                        disabled={busyId === partner.id}
                        onClick={() => {
                          void refreshProfile();
                          setInviteTarget(partner);
                        }}
                      >
                        Пригласить
                      </Button>
                    ) : (
                      <p className={styles.partnerMeta}>
                        Уже есть отношение: {PARTNERSHIP_STATUS_LABELS[status] ?? status}
                      </p>
                    )}
                  </Panel>
                );
              })}
            </div>
          )}
          {searchResults.length > 0 && searchError ? (
            <Panel compact>
              <p className={styles.error} role="alert">
                {searchError}
              </p>
              <Button type="button" variant="secondary" onClick={() => void loadSearch("reset")}>
                Повторить
              </Button>
            </Panel>
          ) : null}
          {searchNextCursor ? (
            <div className={styles.searchAction}>
              <Button
                type="button"
                variant="secondary"
                disabled={loadingSearch}
                onClick={() => void loadSearch("append", searchNextCursor)}
              >
                {loadingSearch ? "Загрузка…" : "Показать ещё"}
              </Button>
            </div>
          ) : null}
        </>
      )}

      {inviteTarget ? (
        <PartnerInviteDialog
          target={inviteTarget}
          meProfile={meProfile}
          busy={busyId === inviteTarget.id}
          onClose={() => setInviteTarget(null)}
          onSent={() => {
            setTab(isAgentR04 ? (forcedTab ?? "list") : "list");
            void loadList();
          }}
        />
      ) : null}

      {counterOfferTarget ? (
        <PartnerCounterOfferDialog
          partnership={counterOfferTarget.partnership}
          patchAction={counterOfferTarget.action}
          busy={busyId === counterOfferTarget.partnership.id}
          onClose={() => setCounterOfferTarget(null)}
          onSent={() => {
            setCounterOfferTarget(null);
            void loadList();
          }}
        />
      ) : null}
    </div>
  );
}
