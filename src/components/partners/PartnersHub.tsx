"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  isPartnershipInvitationWithdrawAction,
  partnershipAgentSegment,
  partnershipInvitationWithdrawPatchAllowed,
  partnershipInvitationWithdrawSnapshotKey,
  partnershipNeedsMyResponse,
  profileUserToPartnerSide,
  shouldShowAgentPublishedTermsForSearch,
  type PartnershipInvitationWithdrawAction,
  type SearchRole,
} from "@/lib/partnership-rules";
import {
  partnerDisplayTitle,
  type AgentPartnerTypeFilter,
} from "@/lib/agent-r04/partner-filters";
import { patchPartnershipListPreference } from "@/lib/agent-r04/api";
import {
  collectActiveListCityOptions,
  filterActivePartnershipRows,
  partnerTypeChipLabel,
  specializationChipLabel,
  stageChipLabel,
  type ActiveListStatusFilter,
  type ActiveListTaxonomyLabels,
} from "@/lib/partners-prototype-v1/active-list-filters";
import {
  AgentPartnerBulkBar,
  type BulkListOperation,
  type BulkOutcome,
} from "@/components/partners/AgentPartnerBulkBar";
import type { PartnersHubAudience } from "@/lib/partners-hub-presentation";
import { partnersSharedUiCopy } from "@/lib/partners-shared-ui-copy";
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
  PartnerSearchFacets,
  PartnerSearchResult,
  PartnerTaxonomyResponse,
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
import { PartnerSearchResultCard } from "@/components/partners/PartnerSearchResultCard";
import { PartnerDiscoveryNavigator } from "@/components/partners/PartnerDiscoveryNavigator";
import {
  countOpenToCooperatePartners,
  findShowcaseHeadingTitle,
} from "@/components/partners/findShowcaseHeadingTitle";
import { formatFindShowcaseCountLine, formatFindShowcasePartnerTotal } from "@/components/partners/findShowcaseCountLine";
import { fetchPartnerTaxonomy } from "@/lib/partner-taxonomy";
/** P25p-owned shell — required dependency for in-Hub find detail (no stub). */
import { PartnerFindDirectoryDetailShell } from "@/components/partners/PartnerFindDirectoryDetailShell";
import type { PartnerCertProgramState } from "@/lib/partner-certificate-program";
import {
  agentTermsSnapshotForDetailHandoff,
  shouldApplyPublicSummaryHandoffUpdate,
  showAgentTermsForFindDetailHandoff,
} from "@/components/partners/partnerSearchPublicSummaryHandoff";
import { TermChangePanel } from "@/components/partners/TermChangePanel";
import { TermChangeModal } from "@/components/partners/TermChangeModal";
import { PartnerCooperationConfirmDialog } from "@/components/partners/PartnerCooperationConfirmDialog";
import {
  cooperationActionLabel,
  cooperationPartnerTitle,
  discardTermDraftCopy,
  findPartnershipById,
  invitationWithdrawConfirmCopy,
  isPartnershipParticipant,
  partnerProfileName,
  partnershipAllowsUiAction,
  pauseConfirmCopy,
  resumeConfirmCopy,
  termChangeActionLabel,
} from "@/components/partners/partner-cooperation-c1";
import { AgentPartnerCollection } from "@/components/partners/AgentPartnerCollection";
import { AgentInvitationViewSwitch } from "@/components/partners/AgentInvitationViewSwitch";
import {
  applySearchPageIfCurrent,
  createSearchRequestGate,
  hasCustomPartnershipSearchFilters,
  partnershipSearchAutoKey,
} from "@/lib/partnership-search-ui";
import {
  overviewZoneForPartnership,
  partitionPartnerOverview,
  type PartnerOverviewZone,
} from "@/lib/partners-prototype-v1/overview-groups";
import { PartnersOverviewLayout } from "@/components/partners/PartnersOverviewLayout";
import {
  parsePartnershipListPayload,
  resolvePartnersEmptyPresentation,
  shouldPinOverviewLegacyChrome,
} from "@/components/partners/partners-overview-greeting";
import type { OrganizationPartnershipReadContext } from "@/lib/employee-workspace-data/organization-partnership-read";
import {
  filterPartnershipUiActionsForOrgRead,
  orgStaffCanMutatePartnerships,
  partnerSideFromOrganizationReadContext,
} from "@/lib/employee-workspace-data/organization-partnership-read";
import styles from "./PartnersHub.module.css";

export type PartnersHubProps = {
  meId: string;
  /** Org list subject for counterparty/terms (defaults to meId). */
  partnershipSubjectUserId?: string;
  organizationReadContext?: OrganizationPartnershipReadContext | null;
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
  /** Find modal: «Другой способ приглашения» in showcase intro row (same handler as modal shell). */
  onChooseMethod?: () => void;
  /** P12: discussion-invite ready → hub chrome «Приглашение создано» / no tabs. */
  onDiscussionInviteReadyChange?: (ready: boolean) => void;
  discussionInviteReady?: boolean;
  /**
   * P23k: remount discussion-invite panel when Hub bumps this key (modal close / tab /
   * reopen) so ready→return yields a fresh wizard without remounting find Hub state.
   */
  discussionInvitePanelKey?: string | number;
  /** P23l: invite wizard draft dirty → Hub gates close/tab Stay without key bump. */
  onDiscussionInviteDirtyChange?: (dirty: boolean) => void;
  forcedTab?: TabId;
  defaultSearchRole?: SearchRole;
  partnersAudience?: PartnersHubAudience;
};

type TabId = "list" | "find" | "link";

const AGENT_R04_LIST_SEARCH_PLACEHOLDER = "Найти среди своих партнёров";

type TermRequestState = {
  state: "idle" | "loading" | "loaded" | "error";
  requests: TermChangeRequest[];
  error: string;
};

function partnerTitle(partner: { displayName: string | null; organizationName?: string | null }) {
  return partner.organizationName?.trim() || partner.displayName?.trim() || "Партнёр";
}

/** Measured findMain width in hub-wide dialog (~932px @ 1240 sheet), not viewport. */
export const FIND_MAIN_RESULTS_TWO_COL_MIN_PX = 640;

export function findMainResultsWideEnough(mainWidthPx: number): boolean {
  return mainWidthPx > FIND_MAIN_RESULTS_TWO_COL_MIN_PX;
}

export function PartnersHub({
  meId,
  partnershipSubjectUserId,
  organizationReadContext = null,
  initialProfile,
  onAttentionCountChange,
  variant = "legacy",
  agentSegment,
  agentInvitationFlow,
  agentPresentation = "tabs",
  agentModalSurface,
  onCloseAgentModal,
  onOpenPartnerHub,
  onChooseMethod,
  onDiscussionInviteReadyChange,
  discussionInviteReady = false,
  discussionInvitePanelKey = 0,
  onDiscussionInviteDirtyChange,
  forcedTab,
  defaultSearchRole: defaultSearchRoleProp,
  partnersAudience,
}: PartnersHubProps) {
  const subjectUserId = partnershipSubjectUserId?.trim() || meId;
  const canMutatePartnerships = orgStaffCanMutatePartnerships(organizationReadContext);
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
  const [searchFacets, setSearchFacets] = useState<PartnerSearchFacets | null>(null);
  const [searchNextCursor, setSearchNextCursor] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const findMainRef = useRef<HTMLDivElement>(null);
  const findShowcaseRef = useRef<HTMLDivElement>(null);
  const findShowcaseTitleRef = useRef<HTMLHeadingElement>(null);
  const inviteReturnFocusRef = useRef<HTMLElement | null>(null);
  const inviteReturnFocusPartnerIdRef = useRef<string | null>(null);
  const pendingSearchRetryFocusRef = useRef(false);
  const findHostWasHiddenRef = useRef(true);
  const [findResultsWide, setFindResultsWide] = useState(false);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [filterProducts, setFilterProducts] = useState<string[]>([]);
  const [filterServices, setFilterServices] = useState<string[]>([]);
  const [filterStages, setFilterStages] = useState<string[]>([]);
  const [searchRole, setSearchRole] = useState<SearchRole>(() =>
    defaultSearchRoleForUser(profileUserToPartnerSide(initialProfile.user, initialProfile.organization)),
  );
  const [listError, setListError] = useState("");
  const [partnershipListReady, setPartnershipListReady] = useState(false);
  const [overviewLegacyDisclosureOpen, setOverviewLegacyDisclosureOpen] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [failedSearchPage, setFailedSearchPage] = useState<{
    mode: "reset" | "append";
    cursor: string | null;
  } | null>(null);
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inviteTarget, setInviteTarget] = useState<PartnerSearchResult | null>(null);
  /** P23m: in-Hub find directory detail — same modal; keep find mounted underneath for scroll/query. */
  const [findDirectoryDetailPartner, setFindDirectoryDetailPartner] =
    useState<PartnerSearchResult | null>(null);
  const findDirectoryDetailPartnerRef = useRef<PartnerSearchResult | null>(null);
  findDirectoryDetailPartnerRef.current = findDirectoryDetailPartner;
  /** Exact Подробнее triggers remembered at open (parent-owned; no SearchCard fork). */
  const findDetailTriggerRefs = useRef<Map<string, HTMLElement>>(new Map());
  /** Bumped to cancel queued focus restore / open-focus work on accepted close/tab/role or new open. */
  const findDetailLifecycleGenRef = useRef(0);
  /**
   * P23q: identity-bound card→detail public-summary snapshots (P25t helper).
   * Cleared on Hub surface teardown; Back keeps entries so reopen skips duplicate upstream read.
   */
  const publicSummaryByPartnerRef = useRef(new Map<string, PartnerCertProgramState>());
  /** Forces shell re-render when a usable snapshot arrives for the open detail partner. */
  const [publicSummaryHandoffTick, setPublicSummaryHandoffTick] = useState(0);
  /** Invite dialog opened from detail shell — cancel restores that row's detail trigger. */
  const inviteFromFindDetailPartnerIdRef = useRef<string | null>(null);
  const [counterOfferTarget, setCounterOfferTarget] = useState<{
    partnership: Partnership;
    action: "counter_offer" | "counter_offer_back";
  } | null>(null);
  const showAgentPublishedTerms = shouldShowAgentPublishedTermsForSearch(
    meProfile.user,
    searchRole,
  );

  const rememberFindDetailTrigger = useCallback((partnerId: string, el?: HTMLElement | null) => {
    if (!el) return;
    findDetailTriggerRefs.current.set(partnerId, el);
  }, []);

  const focusFindDetailRowTrigger = useCallback((partnerId: string): boolean => {
    const tryFocus = (el: HTMLElement | null | undefined): boolean => {
      if (!el || !el.isConnected) return false;
      if ("disabled" in el && Boolean((el as HTMLButtonElement).disabled)) return false;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
      el.focus({ preventScroll: true });
      return document.activeElement === el || el.contains(document.activeElement);
    };

    if (tryFocus(findDetailTriggerRefs.current.get(partnerId))) return true;

    // Parent-owned scoped contract: card[data-partner-id] → its detail control (not global first button).
    const scoped = document.querySelector<HTMLElement>(
      `[data-testid="agent-partner-search-result-card"][data-partner-id="${partnerId}"] [data-testid="agent-partner-search-result-detail"]`,
    );
    if (tryFocus(scoped)) return true;
    // A confirmed invitation replaces both actions with a status. Keep keyboard
    // context on that same card rather than losing focus to the document body.
    return tryFocus(document.querySelector<HTMLElement>(
      `[data-testid="agent-partner-search-result-card"][data-partner-id="${partnerId}"]`,
    ));
  }, []);

  const scheduleFindDetailFocusRestore = useCallback(
    (partnerId: string | null) => {
      if (!partnerId) return;
      const gen = findDetailLifecycleGenRef.current;
      // After find host unhides / invite trap unmounts — sync focus is often stolen to BODY.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (gen !== findDetailLifecycleGenRef.current) return;
          if (findDirectoryDetailPartnerRef.current) return;
          focusFindDetailRowTrigger(partnerId);
        });
      });
    },
    [focusFindDetailRowTrigger],
  );

  const tryFocusInteractive = useCallback(
    (el: HTMLElement | null | undefined, allowDisabled = false): boolean => {
      if (!el || !el.isConnected) return false;
      if (!allowDisabled && "disabled" in el && Boolean((el as HTMLButtonElement).disabled)) {
        return false;
      }
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
      el.focus({ preventScroll: true });
      return document.activeElement === el || el.contains(document.activeElement);
    },
    [],
  );

  const focusFindModalEntry = useCallback(() => {
    const back = document.querySelector<HTMLElement>('[data-testid="agent-partner-find-intro-back"]');
    if (tryFocusInteractive(back)) return true;
    const title = findShowcaseTitleRef.current;
    if (!title) return false;
    title.focus({ preventScroll: true });
    return document.activeElement === title;
  }, [tryFocusInteractive]);

  const captureInviteReturnFocus = useCallback((partnerId: string) => {
    const active = document.activeElement;
    inviteReturnFocusRef.current = active instanceof HTMLElement ? active : null;
    inviteReturnFocusPartnerIdRef.current = partnerId;
  }, []);

  const restoreInviteReturnFocus = useCallback(
    (partnerId: string) => {
      if (tryFocusInteractive(inviteReturnFocusRef.current)) return true;
      const inviteBtn = document.querySelector<HTMLElement>(
        `[data-testid="agent-partner-search-result-card"][data-partner-id="${partnerId}"] [data-testid="agent-partner-search-result-invite"]`,
      );
      if (tryFocusInteractive(inviteBtn)) return true;
      if (focusFindDetailRowTrigger(partnerId)) return true;
      const cardBtn = document.querySelector<HTMLElement>(
        `[data-testid="agent-partner-search-result-card"][data-partner-id="${partnerId}"] button:not([disabled])`,
      );
      return tryFocusInteractive(cardBtn);
    },
    [focusFindDetailRowTrigger, tryFocusInteractive],
  );

  const beginInviteFromPartner = useCallback(
    (partner: PartnerSearchResult, opts?: { fromFindDetail?: boolean }) => {
      captureInviteReturnFocus(partner.id);
      if (opts?.fromFindDetail || agentModalSurface === "find") {
        inviteFromFindDetailPartnerIdRef.current = partner.id;
      }
      setInviteTarget(partner);
    },
    [agentModalSurface, captureInviteReturnFocus],
  );

  const handlePublicSummaryStateChange = useCallback(
    (partnerUserId: string, state: PartnerCertProgramState) => {
      const writeGen = findDetailLifecycleGenRef.current;
      publicSummaryByPartnerRef.current.set(partnerUserId, state);
      const selectedId = findDirectoryDetailPartnerRef.current?.id ?? "";
      if (
        !shouldApplyPublicSummaryHandoffUpdate(
          selectedId,
          partnerUserId,
          findDetailLifecycleGenRef.current,
          writeGen,
        )
      ) {
        return;
      }
      // loaded/empty only — errors are not snapshotted into detail (P25t contract).
      if (state.status === "loading" || state.status === "error") return;
      setPublicSummaryHandoffTick((n) => n + 1);
    },
    [],
  );

  const openFindDirectoryDetail = useCallback(
    (partner: PartnerSearchResult) => {
      findDetailLifecycleGenRef.current += 1;
      const active = document.activeElement;
      const trigger =
        active instanceof HTMLElement &&
        active.getAttribute("data-testid") === "agent-partner-search-result-detail"
          ? active
          : null;
      rememberFindDetailTrigger(partner.id, trigger);
      setFindDirectoryDetailPartner(partner);
    },
    [rememberFindDetailTrigger],
  );

  const closeFindDirectoryDetail = useCallback(
    (opts?: { restoreFocus?: boolean }) => {
      const id = findDirectoryDetailPartnerRef.current?.id ?? null;
      findDetailLifecycleGenRef.current += 1;
      setFindDirectoryDetailPartner(null);
      if (opts?.restoreFocus !== false) {
        scheduleFindDetailFocusRestore(id);
      }
    },
    [scheduleFindDetailFocusRestore],
  );

  // Clear in-Hub detail on accepted close/tab remount key, surface change, or audience/role.
  // Dirty Stay never bumps discussionInvitePanelKey — wizard draft is preserved separately.
  // Cancel any queued focus/open work so unmounted updates cannot land.
  // P23q: drop public-summary ownership map with the same teardown (not on plain Back).
  useEffect(() => {
    findDetailLifecycleGenRef.current += 1;
    inviteFromFindDetailPartnerIdRef.current = null;
    inviteReturnFocusPartnerIdRef.current = null;
    inviteReturnFocusRef.current = null;
    publicSummaryByPartnerRef.current.clear();
    setPublicSummaryHandoffTick(0);
    setInviteTarget(null);
    setFindDirectoryDetailPartner(null);
  }, [discussionInvitePanelKey, agentModalSurface, partnersAudience, meId]);

  // Entering detail: move focus into shell (scoped back control) so hidden find triggers do not leave BODY.
  useLayoutEffect(() => {
    const partner = findDirectoryDetailPartner;
    if (!partner) return;
    const gen = findDetailLifecycleGenRef.current;
    const partnerId = partner.id;
    requestAnimationFrame(() => {
      if (gen !== findDetailLifecycleGenRef.current) return;
      if (findDirectoryDetailPartnerRef.current?.id !== partnerId) return;
      const back = document.querySelector<HTMLElement>(
        `[data-testid="partner-find-directory-detail-shell"][data-partner-id="${partnerId}"] [data-testid="partner-find-directory-detail-back"]`,
      );
      back?.focus({ preventScroll: true });
    });
  }, [findDirectoryDetailPartner]);

  useEffect(() => {
    if (!isModalSurface || agentModalSurface !== "find") return;
    const host = document.querySelector('[data-testid="agent-r04-modal-find-results-host"]');
    if (!(host instanceof HTMLElement)) return;

    const considerFocus = () => {
      const hidden = Boolean(host.parentElement?.closest("[hidden]"));
      if (hidden) {
        findHostWasHiddenRef.current = true;
        return;
      }
      if (!findHostWasHiddenRef.current) return;
      findHostWasHiddenRef.current = false;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const active = document.activeElement;
          if (active && active !== document.body) return;
          focusFindModalEntry();
        });
      });
    };

    considerFocus();
    const observer = new MutationObserver(considerFocus);
    const choiceWrapper = host.parentElement;
    if (choiceWrapper instanceof HTMLElement) {
      observer.observe(choiceWrapper, { attributes: true, attributeFilter: ["hidden"] });
    }
    const hiddenAncestor = host.parentElement?.closest("[hidden]");
    if (hiddenAncestor instanceof HTMLElement) {
      observer.observe(hiddenAncestor, { attributes: true, attributeFilter: ["hidden"] });
    }
    return () => observer.disconnect();
  }, [agentModalSurface, focusFindModalEntry, isModalSurface]);

  useLayoutEffect(() => {
    if (!isModalSurface || agentModalSurface !== "find") return;
    if (loadingSearch || !pendingSearchRetryFocusRef.current) return;
    pendingSearchRetryFocusRef.current = false;
    requestAnimationFrame(() => {
      if (searchError) {
        tryFocusInteractive(
          document.querySelector<HTMLElement>('[data-testid="agent-partner-search-error"] button'),
          true,
        );
        return;
      }
      if (
        !tryFocusInteractive(
          document.querySelector<HTMLElement>('[data-testid="agent-partner-find-search-input"]'),
        )
      ) {
        findShowcaseTitleRef.current?.focus({ preventScroll: true });
      }
    });
  }, [agentModalSurface, isModalSurface, loadingSearch, searchError, tryFocusInteractive]);

  useLayoutEffect(() => {
    if (inviteTarget) return;
    const partnerId = inviteReturnFocusPartnerIdRef.current;
    if (!partnerId) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        restoreInviteReturnFocus(partnerId);
        inviteReturnFocusPartnerIdRef.current = null;
        inviteReturnFocusRef.current = null;
        inviteFromFindDetailPartnerIdRef.current = null;
      });
    });
  }, [inviteTarget, restoreInviteReturnFocus]);

  const [expandedTermPartnershipId, setExpandedTermPartnershipId] = useState<string | null>(null);
  const [termRequests, setTermRequests] = useState<Record<string, TermRequestState>>({});
  const [termDraftDirty, setTermDraftDirty] = useState(false);
  const termDraftDirtyRef = useRef(false);
  const [termDiscardOpen, setTermDiscardOpen] = useState(false);
  const [termPanelBusy, setTermPanelBusy] = useState(false);
  const [pendingTermOpenId, setPendingTermOpenId] = useState<string | null>(null);
  const [lifecycleConfirm, setLifecycleConfirm] = useState<{
    partnershipId: string;
    action: "pause" | "resume" | PartnershipInvitationWithdrawAction;
    /** Frozen at open — settled dedup keys this proposal snapshot, not row id alone. */
    snapshotUpdatedAt: string;
    snapshotStatus: Partnership["status"];
    snapshotPendingProposedBy: string | null;
  } | null>(null);
  const [lifecycleConfirmError, setLifecycleConfirmError] = useState("");
  /** Per-partnership PATCH in flight — other cards stay interactive. */
  const partnershipPatchInFlightRef = useRef(new Set<string>());
  /**
   * Successful cancel/withdraw_counter snapshots already sent.
   * Key = partnershipInvitationWithdrawSnapshotKey (id+action+status+updatedAt+pendingProposedBy).
   * Do NOT key by partnership.id alone: withdraw_counter returns PENDING→INVITED and a later
   * proposal must remain actionable.
   */
  const partnershipWithdrawSettledRef = useRef(new Set<string>());
  const [termRevealSignal, setTermRevealSignal] = useState(0);
  const [pendingPartnerFocusId, setPendingPartnerFocusId] = useState<string | null>(null);
  const termLoadGenRef = useRef(0);
  const termOpenIdRef = useRef<string | null>(null);
  const termTriggerRefs = useRef<Map<string, HTMLElement>>(new Map());
  const termHostRef = useRef<HTMLDivElement | null>(null);
  /** Partnership id awaiting trigger focus after discard/term traps unmount. */
  const pendingTermFocusRestoreRef = useRef<string | null>(null);
  /** Keep-editing: bump reveal only after discard confirm trap is gone. */
  const pendingTermKeepRevealRef = useRef(false);

  const updateTermDraftDirty = useCallback((dirty: boolean) => {
    termDraftDirtyRef.current = dirty;
    setTermDraftDirty(dirty);
  }, []);

  const bumpTermReveal = useCallback(() => {
    setTermRevealSignal((n) => n + 1);
  }, []);

  function isVisiblyInteractable(el: HTMLElement): boolean {
    if (!el.isConnected) return false;
    if ("disabled" in el && Boolean((el as HTMLButtonElement).disabled)) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    let ancestor: HTMLElement | null = el.parentElement;
    while (ancestor) {
      const ancestorStyle = window.getComputedStyle(ancestor);
      if (ancestorStyle.display === "none" || ancestorStyle.visibility === "hidden") {
        return false;
      }
      ancestor = ancestor.parentElement;
    }
    const rect = el.getBoundingClientRect();
    // Real layout: hidden mobile/desktop copies collapse to 0×0. jsdom often reports 0 —
    // treat zero-size as visible only when no ancestor is display:none (already checked).
    if (rect.width === 0 && rect.height === 0) {
      // Prefer a non-zero sibling match when available; caller iterates all matches.
      return style.display !== "none";
    }
    return rect.width > 0 && rect.height > 0;
  }

  function focusPartnerInList(partnershipId: string): boolean {
    const selectors = [
      `[data-testid="partner-action-resume"][data-partnership-id="${partnershipId}"]`,
      `[data-testid="partner-action-pause"][data-partnership-id="${partnershipId}"]`,
      `[data-testid="partner-detail-action-resume"]`,
      `[data-testid="partner-detail-action-pause"]`,
      `[data-testid="partner-term-change-${partnershipId}"]`,
      `[data-testid="partner-row-name-button"][data-partnership-id="${partnershipId}"]`,
      `[data-testid="partner-detail-close"]`,
    ];
    const width = typeof window !== "undefined" ? window.innerWidth : 1024;
    const preferredSurface = width <= 680 ? "mobile" : "desktop";

    const rank = (el: HTMLElement): number => {
      const surface = el.closest("[data-partner-surface]")?.getAttribute("data-partner-surface");
      if (surface === preferredSurface || surface === "cards") return 0;
      if (surface == null) return 1; // detail dialog / host outside list surfaces
      return 2; // opposite viewport copy (hidden via CSS in real layout)
    };

    for (const selector of selectors) {
      const matches = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(
        isVisiblyInteractable,
      );
      const sized = matches.filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      // Prefer laid-out (visible) nodes when the browser reports geometry; else CSS-visible pool.
      const pool = (sized.length > 0 ? sized : matches).sort((a, b) => rank(a) - rank(b));
      for (const el of pool) {
        if (typeof el.scrollIntoView === "function") {
          el.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
        el.focus({ preventScroll: true });
        if (document.activeElement === el || el.contains(document.activeElement)) {
          return true;
        }
      }
    }
    return false;
  }
  const [taxonomyFilterResetKey, setTaxonomyFilterResetKey] = useState(0);
  const [listArchiveView, setListArchiveView] = useState<"active" | "archive" | "hidden">("active");
  const [linkInviteMode, setLinkInviteMode] = useState<"discussion" | "terms">("discussion");
  const [pendingLinkInviteMode, setPendingLinkInviteMode] = useState<"discussion" | "terms" | null>(null);
  const [linkInviteSubmitting, setLinkInviteSubmitting] = useState(false);
  const linkModeDirtyRef = useRef(false);
  const linkModeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const reportLinkModeDirty = useCallback((dirty: boolean) => {
    linkModeDirtyRef.current = dirty;
    onDiscussionInviteDirtyChange?.(dirty);
  }, [onDiscussionInviteDirtyChange]);
  useEffect(() => {
    setPendingLinkInviteMode(null);
    setLinkInviteMode("discussion");
    linkModeDirtyRef.current = false;
  }, [discussionInvitePanelKey]);
  function requestLinkMode(mode: "discussion" | "terms", trigger: HTMLButtonElement) {
    if (mode === linkInviteMode || linkInviteSubmitting) return;
    linkModeTriggerRef.current = trigger;
    if (linkModeDirtyRef.current) setPendingLinkInviteMode(mode);
    else setLinkInviteMode(mode);
  }
  const [listPartnerType, setListPartnerType] = useState<AgentPartnerTypeFilter>("");
  const [listSpecialization, setListSpecialization] = useState("");
  const [listCity, setListCity] = useState("");
  const [listStage, setListStage] = useState("");
  const [listStatus, setListStatus] = useState<ActiveListStatusFilter>("");
  const [listSort, setListSort] = useState<AgentListSort>("updated_desc");
  const [listSearch, setListSearch] = useState("");
  const [listViewMode, setListViewMode] = useState<AgentListViewMode>("list");
  /** P9b: independent invitation overview presentation — not coupled to active listViewMode. */
  const [decideInvitationViewMode, setDecideInvitationViewMode] =
    useState<AgentListViewMode>("list");
  const [waitingInvitationViewMode, setWaitingInvitationViewMode] =
    useState<AgentListViewMode>("list");
  const [listPage, setListPage] = useState(0);
  const [listPageSize, setListPageSize] = useState(25);
  const [listTaxonomyLabels, setListTaxonomyLabels] = useState<ActiveListTaxonomyLabels | null>(
    null,
  );
  const [waitingOpen, setWaitingOpen] = useState(false);
  const [decideZeroHint, setDecideZeroHint] = useState(false);
  const [waitingPage, setWaitingPage] = useState(0);
  const [decidePage, setDecidePage] = useState(0);
  const overviewZoneActiveRef = useRef<HTMLDivElement>(null);
  const overviewZoneDecideRef = useRef<HTMLDivElement>(null);
  const overviewZoneWaitingRef = useRef<HTMLDetailsElement>(null);
  /** terms= id already paged into its overview zone (refresh/page-size must not re-page). */
  const overviewDeepLinkAppliedRef = useRef<string | null>(null);
  const [termsDeepLinkPending, setTermsDeepLinkPending] = useState(false);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<Set<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkOutcome, setBulkOutcome] = useState<BulkOutcome | null>(null);
  const [searchPartnerType, setSearchPartnerType] = useState<AgentPartnerTypeFilter>("");
  const [discoverySpecialization, setDiscoverySpecialization] = useState("");
  const [discoveryStageId, setDiscoveryStageId] = useState("");
  const [partnerTaxonomy, setPartnerTaxonomy] = useState<PartnerTaxonomyResponse | null>(null);
  const [partnerTaxonomyError, setPartnerTaxonomyError] = useState(false);
  const [expandedTermsId, setExpandedTermsId] = useState<string | null>(null);
  const searchGate = useRef(createSearchRequestGate());
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchPageRef = useRef<{ items: PartnerSearchResult[]; nextCursor: string | null }>({
    items: [],
    nextCursor: null,
  });
  /**
   * Last auto-search filter key that was *issued* (not merely last successful apply).
   * Skip silent re-search on find re-entry / modal close→open, but still re-issue when
   * filters leave and return so in-flight stale q/city can be aborted.
   */
  const searchAutoIssuedKeyRef = useRef<string | null>(null);

  const findShowcaseCountLine = useMemo(() => {
    if (!searchFacets || loadingSearch) return null;
    const totalLine = formatFindShowcasePartnerTotal(searchFacets.total);
    const allLoaded =
      !searchNextCursor && searchResults.length >= searchFacets.total;
    if (!allLoaded) {
      return totalLine;
    }
    return formatFindShowcaseCountLine(
      searchFacets.total,
      countOpenToCooperatePartners(searchResults),
    );
  }, [loadingSearch, searchFacets, searchNextCursor, searchResults]);

  const discoveryStageLabel = useMemo(() => {
    if (!discoveryStageId || !partnerTaxonomy) return "";
    return partnerTaxonomy.stages.find((s) => s.id === discoveryStageId)?.label?.trim() ?? "";
  }, [discoveryStageId, partnerTaxonomy]);

  const findShowcaseTitle = useMemo(
    () =>
      findShowcaseHeadingTitle({
        stageId: discoveryStageId,
        specialization: discoverySpecialization,
        taxonomy: partnerTaxonomy,
      }),
    [discoveryStageId, discoverySpecialization, partnerTaxonomy],
  );

  useEffect(() => {
    if (agentModalSurface !== "find") return;
    let cancelled = false;
    setPartnerTaxonomyError(false);
    void fetchPartnerTaxonomy()
      .then((data) => {
        if (!cancelled) setPartnerTaxonomy(data);
      })
      .catch(() => {
        if (!cancelled) {
          setPartnerTaxonomy(null);
          setPartnerTaxonomyError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [agentModalSurface, taxonomyFilterResetKey]);

  useLayoutEffect(() => {
    if (agentModalSurface !== "find") return;
    const node = findMainRef.current;
    if (!node) return;
    const measure = () => {
      setFindResultsWide(findMainResultsWideEnough(node.getBoundingClientRect().width));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [agentModalSurface, searchResults.length, discoveryStageId, discoverySpecialization]);

  useEffect(() => {
    if (forcedTab) setTab(forcedTab);
  }, [forcedTab]);

  useEffect(() => {
    if (isAgentR04 && defaultSearchRoleProp) {
      setSearchRole(defaultSearchRoleProp);
    }
  }, [defaultSearchRoleProp, isAgentR04]);

  const inviterSide = useMemo(() => {
    if (organizationReadContext) {
      return partnerSideFromOrganizationReadContext(organizationReadContext);
    }
    return profileUserToPartnerSide(meProfile.user, meProfile.organization);
  }, [meProfile, organizationReadContext]);
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
      const parsed = parsePartnershipListPayload(data);
      if (!parsed.ok) {
        setPartnerships([]);
        setPartnershipListReady(false);
        setListError("Не удалось загрузить список");
        return;
      }
      setPartnerships(parsed.partnerships as Partnership[]);
      setPartnershipListReady(true);
    } catch (caught) {
      setPartnerships([]);
      setPartnershipListReady(false);
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
      // Sequence bumps for replace AND append. Abort alone is insufficient when a
      // late response still resolves with older q/type/city + stale cursor.
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      const requestSeq = searchGate.current.begin();
      setSearchError("");
      setFailedSearchPage(null);

      if (mode === "reset") {
        searchPageRef.current = { items: [], nextCursor: null };
        setSearchResults([]);
        setSearchNextCursor(null);
        setSearchError("");
      }
      setLoadingSearch(true);
      try {
        // The prototype directory spans all four kinds. This is a search scope,
        // not an actor activity or a change to the published-terms permission gate.
        const params = new URLSearchParams({ role: isModalSurface ? "agent" : searchRole, limit: "20" });
        if (isModalSurface) params.set("includeFacets", "1");
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
          facets?: PartnerSearchFacets;
        }>(`/api/partnership/search?${params.toString()}`, {
          signal: controller.signal,
        });

        const applied = applySearchPageIfCurrent({
          requestSeq,
          latestSeq: searchGate.current.latest.current,
          mode,
          prev: searchPageRef.current,
          batch: data.partners ?? [],
          nextCursor: data.nextCursor,
        });
        if (!applied) return;

        searchPageRef.current = applied;
        setSearchResults(applied.items);
        setSearchNextCursor(applied.nextCursor);
        setSearchFacets(data.facets ?? null);
      } catch (caught) {
        if (controller.signal.aborted || !searchGate.current.isCurrent(requestSeq)) return;
        if (mode === "reset") {
          searchPageRef.current = { items: [], nextCursor: null };
          setSearchResults([]);
          setSearchNextCursor(null);
          setSearchFacets(null);
        }
        setSearchError(
          caught instanceof RemcardApiError ? caught.message : "Не удалось выполнить поиск",
        );
        setFailedSearchPage({ mode, cursor });
      } finally {
        if (searchGate.current.isCurrent(requestSeq)) {
          setLoadingSearch(false);
        }
      }
    },
    [city, filterProducts, filterServices, filterStages, isAgentR04, isModalSurface, query, searchPartnerType, searchRole],
  );

  const overviewGroups = useMemo(
    () => (isOverview ? partitionPartnerOverview(partnerships, subjectUserId) : null),
    [isOverview, partnerships, subjectUserId],
  );

  const applyActiveListFilters = useCallback(
    (rows: Partnership[]): Partnership[] =>
      filterActivePartnershipRows(rows, subjectUserId, {
        searchQuery: listSearch,
        partnerType: listPartnerType,
        specialization: listSpecialization,
        city: listCity,
        stageId: listStage,
        status: listStatus,
        sort: listSort,
        taxonomy: listTaxonomyLabels,
      }),
    [
      listCity,
      listPartnerType,
      listSearch,
      listSort,
      listSpecialization,
      listStage,
      listStatus,
      listTaxonomyLabels,
      subjectUserId,
    ],
  );

  /** Full available active collection for the current visibility bucket, before any list filter. */
  const activeVisibilityRows = useMemo(() => {
    if (!isAgentR04) return [];
    if (listArchiveView === "archive") {
      return partnerships.filter(
        (p) =>
          partnershipAgentSegment(p.status) === "active" && Boolean(p.listPreference?.archivedAt),
      );
    }
    if (listArchiveView === "hidden") {
      return partnerships.filter((p) => Boolean(p.listPreference?.hiddenAt));
    }
    if (overviewGroups) return overviewGroups.active;
    return partnerships.filter(
      (p) =>
        partnershipAgentSegment(p.status) === "active" &&
        !p.listPreference?.archivedAt &&
        !p.listPreference?.hiddenAt,
    );
  }, [isAgentR04, listArchiveView, overviewGroups, partnerships]);

  const activeListCityOptions = useMemo(
    () => collectActiveListCityOptions(activeVisibilityRows, subjectUserId),
    [activeVisibilityRows, subjectUserId],
  );

  const overviewActiveRows = useMemo(() => {
    if (!overviewGroups) return [];
    return applyActiveListFilters(activeVisibilityRows);
  }, [activeVisibilityRows, applyActiveListFilters, overviewGroups]);

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
        const outgoing = p.initiatedBy === subjectUserId;
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
    subjectUserId,
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
    listStatus,
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
    listStatus,
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
        label: partnerTypeChipLabel(listPartnerType),
        onClear: () => setListPartnerType(""),
      });
    }
    if (listSpecialization) {
      chips.push({
        key: "spec",
        label: specializationChipLabel(listSpecialization, listTaxonomyLabels),
        onClear: () => setListSpecialization(""),
      });
    }
    if (listCity.trim()) {
      chips.push({
        key: "city",
        label: `Город: ${listCity.trim()}`,
        onClear: () => setListCity(""),
      });
    }
    if (listStage) {
      chips.push({
        key: "stage",
        label: stageChipLabel(listStage, listTaxonomyLabels),
        onClear: () => setListStage(""),
      });
    }
    return chips;
  }, [isAgentR04, listCity, listPartnerType, listSpecialization, listStage, listTaxonomyLabels]);

  const partnersEmptyPresentation = useMemo(
    () =>
      resolvePartnersEmptyPresentation({
        partnerships,
        isActiveSegment: (status) => partnershipAgentSegment(status) === "active",
      }),
    [partnerships],
  );

  const listFiltersEngaged = useMemo(
    () =>
      listFilterChips.length > 0 || listSearch.trim().length > 0 || listStatus !== "",
    [listFilterChips.length, listSearch, listStatus],
  );

  const termEditingActive = Boolean(
    expandedTermPartnershipId || pendingTermOpenId || termDiscardOpen || termDraftDirty,
  );

  const overviewLegacyChromePinned = useMemo(
    () =>
      isOverview &&
      shouldPinOverviewLegacyChrome({
        bulkOutcomePresent: bulkOutcome != null,
        selectedPartnerCount: selectedPartnerIds.size,
        listArchiveView,
        listFiltersEngaged,
        termsDeepLinkId: termsPartnershipId,
        termsDeepLinkResolving: termsDeepLinkPending,
        lifecycleConfirmOpen: lifecycleConfirm != null,
        termEditingActive,
      }),
    [
      bulkOutcome,
      isOverview,
      lifecycleConfirm,
      listArchiveView,
      listFiltersEngaged,
      selectedPartnerIds.size,
      termEditingActive,
      termsDeepLinkPending,
      termsPartnershipId,
    ],
  );

  const resetListFilters = useCallback(() => {
    // Clears query + restrictions; preserves selected sort and list/cards view.
    setListArchiveView("active");
    setListPartnerType("");
    setListSpecialization("");
    setListCity("");
    setListStage("");
    setListStatus("");
    setListSearch("");
    setListPage(0);
    setSelectedPartnerIds(new Set());
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
    const autoKey = partnershipSearchAutoKey({
      query,
      city,
      filterProducts,
      filterServices,
      filterStages,
      searchPartnerType,
      searchRole,
    });
    // Same filter snapshot already issued — no silent re-search on find re-entry /
    // modal close→open while Hub stays mounted. Leaving and returning to a prior
    // key still re-issues so an in-flight stale SlowCity/q can be aborted.
    if (searchAutoIssuedKeyRef.current === autoKey) return;
    searchAutoIssuedKeyRef.current = autoKey;
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
    () => countNeedsMyResponse(partnerships, subjectUserId),
    [subjectUserId, partnerships],
  );

  useEffect(() => {
    onAttentionCountChange?.(attentionCount);
  }, [attentionCount, onAttentionCountChange]);

  type PartnershipActionResult =
    | { ok: true }
    | { ok: false; error: string; reason: "busy" | "failed" };

  /** Sole PATCH transport for partnership UI actions (incl. pause/resume/withdraw confirm). */
  async function runPartnershipAction(
    partnership: Partnership,
    action: string,
    options?: { suppressHubError?: boolean },
  ): Promise<PartnershipActionResult> {
    if (partnershipPatchInFlightRef.current.has(partnership.id)) {
      return { ok: false, error: "", reason: "busy" };
    }
    if (isPartnershipInvitationWithdrawAction(action)) {
      const snapKey = partnershipInvitationWithdrawSnapshotKey(partnership, action);
      if (partnershipWithdrawSettledRef.current.has(snapKey)) {
        return { ok: false, error: "", reason: "busy" };
      }
    }
    if (!partnershipInvitationWithdrawPatchAllowed(partnership, action)) {
      return {
        ok: false,
        error: "Действие недоступно для текущего статуса",
        reason: "failed",
      };
    }
    // Per-id busy: other partnership cards stay clickable.
    if (busyId === partnership.id) {
      return { ok: false, error: "", reason: "busy" };
    }
    partnershipPatchInFlightRef.current.add(partnership.id);
    setBusyId(partnership.id);
    if (!options?.suppressHubError) {
      setActionError("");
    }
    try {
      const body: Record<string, unknown> = { action };
      if (action === "accept_pending") {
        body.expectedUpdatedAt = partnership.updatedAt;
      }
      await remcardFetch(`/api/partnership/${partnership.id}`, {
        method: "PATCH",
        body,
      });
      if (isPartnershipInvitationWithdrawAction(action)) {
        partnershipWithdrawSettledRef.current.add(
          partnershipInvitationWithdrawSnapshotKey(partnership, action),
        );
      }
      await loadList();
      return { ok: true };
    } catch (caught) {
      const error =
        caught instanceof RemcardApiError ? caught.message : "Действие не выполнено";
      if (!options?.suppressHubError) {
        setActionError(error);
      }
      return { ok: false, error, reason: "failed" };
    } finally {
      partnershipPatchInFlightRef.current.delete(partnership.id);
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
    if (
      actionKind === "pause" ||
      actionKind === "resume" ||
      actionKind === "cancel" ||
      actionKind === "withdraw_counter"
    ) {
      if (!canMutatePartnerships || !partnershipAllowsUiAction(partnership, subjectUserId, actionKind)) {
        setActionError("Действие недоступно для текущего контекста");
        return;
      }
      setLifecycleConfirmError("");
      setLifecycleConfirm({
        partnershipId: partnership.id,
        action: actionKind,
        snapshotUpdatedAt: partnership.updatedAt,
        snapshotStatus: partnership.status,
        snapshotPendingProposedBy: partnership.pendingProposedBy ?? null,
      });
      return;
    }
    void runPartnershipAction(partnership, actionKind);
  }

  async function confirmLifecycleAction() {
    if (!lifecycleConfirm) return;
    const partnershipId = lifecycleConfirm.partnershipId;
    if (
      partnershipPatchInFlightRef.current.has(partnershipId) ||
      busyId === partnershipId
    ) {
      return;
    }
    const action = lifecycleConfirm.action;
    const current = findPartnershipById(partnerships, partnershipId);
    if (
      !current ||
      !canMutatePartnerships ||
      !partnershipAllowsUiAction(current, subjectUserId, action)
    ) {
      // Keep confirm open — surface error inside the active workflow, not under the modal.
      setLifecycleConfirmError("Действие недоступно: партнёр или права изменились");
      return;
    }
    if (isPartnershipInvitationWithdrawAction(action)) {
      const openedSnap = partnershipInvitationWithdrawSnapshotKey(
        {
          id: partnershipId,
          updatedAt: lifecycleConfirm.snapshotUpdatedAt,
          status: lifecycleConfirm.snapshotStatus,
          pendingProposedBy: lifecycleConfirm.snapshotPendingProposedBy,
        },
        action,
      );
      if (partnershipWithdrawSettledRef.current.has(openedSnap)) {
        // Same opened snapshot already PATCHed — dismiss, no additional request.
        setLifecycleConfirm(null);
        setLifecycleConfirmError("");
        return;
      }
      const currentSnap = partnershipInvitationWithdrawSnapshotKey(current, action);
      if (currentSnap !== openedSnap) {
        // List moved to a newer proposal/state — close stale confirm; user re-opens for new snap.
        setLifecycleConfirm(null);
        setLifecycleConfirmError("");
        return;
      }
    }
    setLifecycleConfirmError("");
    const result = await runPartnershipAction(current, action, { suppressHubError: true });
    if (result.ok) {
      setLifecycleConfirm(null);
      setLifecycleConfirmError("");
      setPendingPartnerFocusId(partnershipId);
      return;
    }
    if (result.reason === "failed") {
      setLifecycleConfirmError(result.error);
    }
  }

  function rememberTermTrigger(partnershipId: string, el?: HTMLElement | null) {
    if (!el) return;
    termTriggerRefs.current.set(partnershipId, el);
  }

  function scheduleTermTriggerFocusRestore(partnershipId: string | null) {
    if (!partnershipId) return;
    // Must run after confirm/term focus traps unmount — sync restore is stolen back to BODY.
    pendingTermFocusRestoreRef.current = partnershipId;
  }

  function restoreTermTriggerFocus(partnershipId: string | null) {
    if (!partnershipId) return;

    const tryFocus = (el: HTMLElement | null | undefined): boolean => {
      if (!el || !isVisiblyInteractable(el)) return false;
      if (typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
      el.focus({ preventScroll: true });
      return document.activeElement === el || el.contains(document.activeElement);
    };

    // 1) Exact remembered trigger from open (same node the user activated).
    if (tryFocus(termTriggerRefs.current.get(partnershipId))) return;

    // 2) Visible term-change CTA for this partnership (prefer laid-out copies).
    const termMatches = Array.from(
      document.querySelectorAll<HTMLElement>(
        `[data-testid="partner-term-change-${partnershipId}"]`,
      ),
    );
    const sized = termMatches.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && isVisiblyInteractable(el);
    });
    const pool = sized.length > 0 ? sized : termMatches.filter(isVisiblyInteractable);
    for (const el of pool) {
      if (tryFocus(el)) return;
    }

    // 3) Broader list/detail fallback (pause/resume/name) if term CTA is gone.
    focusPartnerInList(partnershipId);
  }

  function forceOpenTermChange(partnershipId: string) {
    const current = findPartnershipById(partnerships, partnershipId);
    if (!current || !isPartnershipParticipant(current, subjectUserId)) {
      setActionError("Нельзя открыть условия: партнёр недоступен в текущем контексте");
      return;
    }
    termDraftDirtyRef.current = false;
    setTermDraftDirty(false);
    setTermDiscardOpen(false);
    setTermPanelBusy(false);
    setPendingTermOpenId(null);
    termOpenIdRef.current = partnershipId;
    setExpandedTermPartnershipId(partnershipId);
    bumpTermReveal();
    void loadTermRequests(partnershipId, { expand: false });
  }

  function requestOpenTermChange(partnershipId: string, trigger?: HTMLElement | null) {
    rememberTermTrigger(partnershipId, trigger);
    if (
      expandedTermPartnershipId &&
      expandedTermPartnershipId !== partnershipId &&
      termDraftDirtyRef.current
    ) {
      setPendingTermOpenId(partnershipId);
      setTermDiscardOpen(true);
      return;
    }
    if (expandedTermPartnershipId === partnershipId) {
      requestCloseTermChange();
      return;
    }
    forceOpenTermChange(partnershipId);
  }

  function requestCloseTermChange() {
    if (!expandedTermPartnershipId && !termOpenIdRef.current) return;
    if (termDraftDirtyRef.current) {
      setPendingTermOpenId(null);
      setTermDiscardOpen(true);
      return;
    }
    const closedId = expandedTermPartnershipId;
    termOpenIdRef.current = null;
    setExpandedTermPartnershipId(null);
    termDraftDirtyRef.current = false;
    setTermDraftDirty(false);
    setTermPanelBusy(false);
    scheduleTermTriggerFocusRestore(closedId);
  }

  function keepTermDraftEditing() {
    setTermDiscardOpen(false);
    setPendingTermOpenId(null);
    // Defer reveal until discard confirm trap unmounts (otherwise focusin steals back).
    pendingTermKeepRevealRef.current = true;
  }

  function discardTermDraftAndContinue() {
    const nextId = pendingTermOpenId;
    const closedId = expandedTermPartnershipId;
    setTermDiscardOpen(false);
    setPendingTermOpenId(null);
    termDraftDirtyRef.current = false;
    setTermDraftDirty(false);
    setTermPanelBusy(false);
    termOpenIdRef.current = null;
    setExpandedTermPartnershipId(null);
    if (nextId) {
      forceOpenTermChange(nextId);
      return;
    }
    scheduleTermTriggerFocusRestore(closedId);
  }

  async function loadTermRequests(
    partnershipId: string,
    options: { expand?: boolean } = {},
  ) {
    const { expand = true } = options;
    const current = findPartnershipById(partnerships, partnershipId);
    if (current && !isPartnershipParticipant(current, subjectUserId)) {
      setActionError("Запросы условий недоступны вне участия в партнёрстве");
      return;
    }
    if (expand) {
      termOpenIdRef.current = partnershipId;
      setExpandedTermPartnershipId(partnershipId);
    }
    const gen = ++termLoadGenRef.current;
    // Clear prior requests on every fetch — error/loading must not keep stale "loaded" data.
    setTermRequests((prev) => ({
      ...prev,
      [partnershipId]: { state: "loading", requests: [], error: "" },
    }));
    try {
      const data = await remcardFetch<{ requests: TermChangeRequest[] }>(
        `/api/partnerships/${partnershipId}/term-change`,
      );
      if (gen !== termLoadGenRef.current) return;
      if (termOpenIdRef.current && termOpenIdRef.current !== partnershipId) {
        return;
      }
      setTermRequests((prev) => ({
        ...prev,
        [partnershipId]: { state: "loaded", requests: data.requests ?? [], error: "" },
      }));
    } catch (caught) {
      if (gen !== termLoadGenRef.current) return;
      if (termOpenIdRef.current && termOpenIdRef.current !== partnershipId) {
        return;
      }
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

  /** Refresh only — never toggles open/close (Retry / post-submit). */
  function refreshTermRequests(partnershipId: string) {
    void loadTermRequests(partnershipId, { expand: false });
  }

  function renderAgentTermChangeHost() {
    if (!expandedTermPartnershipId) return null;
    const partnership = findPartnershipById(partnerships, expandedTermPartnershipId);
    if (!partnership) return null;
    const termState = termRequests[partnership.id] ?? {
      state: "idle" as const,
      requests: [],
      error: "",
    };
    return (
      <TermChangeModal
        open
        title="Предложить изменение условий"
        onClose={requestCloseTermChange}
        busy={termPanelBusy}
        suspendFocusTrap={termDiscardOpen}
      >
        <div
          ref={termHostRef}
          className={styles.termChangeHostModal}
          data-testid="partner-term-change-host"
        >
          <TermChangePanel
            partnership={partnership}
            meId={subjectUserId}
            partnerTitle={cooperationPartnerTitle(partnership, subjectUserId)}
            requests={termState.state === "loaded" ? termState.requests : null}
            loadState={
              termState.state === "idle"
                ? "loading"
                : termState.state === "loaded"
                  ? "loaded"
                  : termState.state
            }
            loadError={termState.error}
            onReload={() => refreshTermRequests(partnership.id)}
            onChanged={() => {
              void loadList();
              refreshTermRequests(partnership.id);
            }}
            onDirtyChange={updateTermDraftDirty}
            onCloseRequest={requestCloseTermChange}
            revealSignal={termRevealSignal}
            presentation="modal"
            onBusyChange={setTermPanelBusy}
          />
        </div>
      </TermChangeModal>
    );
  }

  // After discard + term modal traps unmount, restore the original visible trigger.
  useEffect(() => {
    if (termDiscardOpen || expandedTermPartnershipId) return;
    const id = pendingTermFocusRestoreRef.current;
    if (!id) return;
    pendingTermFocusRestoreRef.current = null;
    restoreTermTriggerFocus(id);
  }, [termDiscardOpen, expandedTermPartnershipId, partnerships]);

  // Keep editing: refocus draft only once the overlying discard trap is gone.
  useEffect(() => {
    if (termDiscardOpen) return;
    if (!pendingTermKeepRevealRef.current) return;
    if (!expandedTermPartnershipId) {
      pendingTermKeepRevealRef.current = false;
      return;
    }
    pendingTermKeepRevealRef.current = false;
    bumpTermReveal();
  }, [termDiscardOpen, expandedTermPartnershipId, bumpTermReveal]);

  useEffect(() => {
    if (!pendingPartnerFocusId || busyId) return;
    const id = pendingPartnerFocusId;
    let cancelled = false;
    let attempts = 0;
    const tick = () => {
      if (cancelled) return;
      if (focusPartnerInList(id) || attempts++ >= 20) {
        setPendingPartnerFocusId(null);
        return;
      }
      window.requestAnimationFrame(tick);
    };
    const frame = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [pendingPartnerFocusId, partnerships, busyId]);

  useEffect(() => {
    if (!expandedTermPartnershipId || !termRevealSignal) return;
    const host = termHostRef.current;
    if (!host) return;
    if (typeof host.scrollIntoView === "function") {
      host.scrollIntoView({ block: "center", inline: "nearest" });
    }
  }, [expandedTermPartnershipId, termRevealSignal]);

  const expandedTermLoadState = expandedTermPartnershipId
    ? termRequests[expandedTermPartnershipId]?.state
    : undefined;

  // After term-change GET settles, re-reveal so focus lands on an enabled field.
  useEffect(() => {
    if (!expandedTermPartnershipId) return;
    if (expandedTermLoadState === "loaded" || expandedTermLoadState === "error") {
      bumpTermReveal();
    }
  }, [expandedTermPartnershipId, expandedTermLoadState, bumpTermReveal]);

  useEffect(() => {
    if (!termsPartnershipId) {
      overviewDeepLinkAppliedRef.current = null;
      setTermsDeepLinkPending(false);
      return;
    }
    setTermsDeepLinkPending(true);
    setTab("list");
    void loadTermRequests(termsPartnershipId);
  }, [termsPartnershipId]);

  useEffect(() => {
    if (!termsPartnershipId) {
      return;
    }
    if (!overviewGroups || loadingList) return;
    if (overviewDeepLinkAppliedRef.current === termsPartnershipId) {
      setTermsDeepLinkPending(false);
      return;
    }
    const match = partnerships.find((p) => p.id === termsPartnershipId);
    if (!match) {
      if (partnershipListReady && !loadingList) {
        setTermsDeepLinkPending(false);
      }
      return;
    }
    const zone = overviewZoneForPartnership(match, subjectUserId);
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
    setTermsDeepLinkPending(false);
  }, [
    termsPartnershipId,
    overviewGroups,
    overviewActiveRows,
    loadingList,
    partnerships,
    subjectUserId,
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
        Поиск по всем партнёрам с одобренным профилем в RemCard. Уточните город, тип, специализацию и этап.
      </p>
      <div className={styles.modalSearchBlock}>
        <TextField
          label="Поиск по словам необязательно"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Название, товар, услуга, этап или ID"
          hint="Можно оставить пустым и искать только по фильтрам ниже"
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
      {/* P22c: modal-full owns the single refine disclosure — no hub dual mount. */}
      <div className={styles.modalFilterBlock}>
        <AgentPartnerDiscoveryFilters layout="modal-full" {...agentDiscoveryFilterProps} />
      </div>
    </>
  );

  // P23q: identity-bound snapshot for open find detail (tick re-reads ref after card callback).
  void publicSummaryHandoffTick;
  const findDetailAgentTermsSnapshot = findDirectoryDetailPartner
    ? agentTermsSnapshotForDetailHandoff(
        findDirectoryDetailPartner.id,
        publicSummaryByPartnerRef.current,
      )
    : undefined;

  /**
   * P23c find modal vs frozen hub-wide:
   * keyword → exactly one refine (P22c modal-full owns details) → showcase.
   * No outer hub findRefine wrapper (would nest a second disclosure).
   */
  const agentFindShowcase = (
    <div
      className={styles.findShell}
      data-testid="agent-partner-find-showcase"
      ref={findShowcaseRef}
    >
      <div className={styles.findIntroRow} data-testid="agent-partner-find-intro-row">
        <p className={styles.modalLead}>
          Найдите, кого рекомендовать своим клиентам. Направления и условия видны сразу.
        </p>
        {agentModalSurface === "find" && onChooseMethod ? (
          <button
            type="button"
            className={styles.findIntroBack}
            data-testid="agent-partner-find-intro-back"
            onClick={onChooseMethod}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <polyline
                points="14,7 8,12 14,17"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Другой способ приглашения
          </button>
        ) : null}
      </div>
      <div className={styles.findToolbarRow}>
        <form
          className={styles.findSearchForm}
          onSubmit={(event) => {
            event.preventDefault();
            void loadSearch("reset");
          }}
        >
          <label className={styles.findSearchBox}>
            <span className={styles.srOnly}>Поиск по словам</span>
            <svg className={styles.findSearchIcon} viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M20 20l-3.5-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Название, товар, услуга, этап или ID"
              enterKeyHint="search"
              maxLength={120}
              data-testid="agent-partner-find-search-input"
            />
          </label>
        </form>
        {/* P22c tip 30231a6: layout=modal-full is the sole refine disclosure owner. */}
        <div className={styles.findFilterSlot} data-testid="agent-partner-find-filter-slot">
          <AgentPartnerDiscoveryFilters layout="modal-full" showDirectionFilters={false} {...agentDiscoveryFilterProps} />
        </div>
      </div>
      {(query || city || searchPartnerType || discoveryStageId || discoverySpecialization) ? (
        <div className={styles.findActiveFilters} aria-label="Выбранные фильтры">
          {query ? <button type="button" onClick={() => setQuery("")}>Снять фильтр «{query}» ×</button> : null}
          {city ? <button type="button" onClick={() => setCity("")}>Город: {city} ×</button> : null}
          {searchPartnerType ? <button type="button" onClick={() => setSearchPartnerType("")}>Тип: {({ agent: "Агент", specialist: "Специалист", store: "Магазин", company: "Компания" })[searchPartnerType]} ×</button> : null}
          {discoveryStageId ? (
            <button type="button" onClick={() => setDiscoveryStageId("")}>
              Этап: {discoveryStageLabel || discoveryStageId} ×
            </button>
          ) : null}
          {discoverySpecialization ? <button type="button" onClick={() => setDiscoverySpecialization("")}>Снять направление ×</button> : null}
          <button type="button" onClick={resetSearchFilters}>Сбросить всё</button>
        </div>
      ) : null}
      <div className={styles.findShowcase}>
        <aside className={styles.findRail}>
          <PartnerDiscoveryNavigator stageId={discoveryStageId} specialization={discoverySpecialization}
            facets={searchFacets} loading={loadingSearch} onStageChange={setDiscoveryStageId}
            onSpecializationChange={setDiscoverySpecialization} />
        </aside>
        <div
          className={styles.findMain}
          ref={findMainRef}
          data-testid="agent-partner-find-main"
          data-results-wide={findResultsWide ? "true" : "false"}
        >
          <div className={styles.findHeading}>
            <span className={styles.findEyebrow}>Партнёры RemCard</span>
            <h2
              data-testid="agent-partner-find-showcase-title"
              tabIndex={-1}
              ref={findShowcaseTitleRef}
            >
              {findShowcaseTitle}
            </h2>
            {findShowcaseCountLine && !loadingSearch ? (
              <p className={styles.findCount} role="status" data-testid="agent-partner-search-count">
                {findShowcaseCountLine}
              </p>
            ) : partnerTaxonomyError ? (
              <p className={styles.findCount} role="status">
                Не удалось загрузить названия этапов
              </p>
            ) : null}
          </div>
          {searchError ? (
            <div className={styles.modalResultsError} role="alert" data-testid="agent-partner-search-error">
              <p>{searchError}</p>
              <Button
                type="button"
                variant="secondary"
                disabled={loadingSearch}
                data-testid="agent-partner-search-retry"
                onClick={() => {
                  pendingSearchRetryFocusRef.current = true;
                  void loadSearch(failedSearchPage?.mode ?? "reset", failedSearchPage?.cursor ?? null);
                }}
              >
                Повторить
              </Button>
            </div>
          ) : null}
          <div
            className={`${styles.modalResults} ${styles.modalResultsFind}`}
            data-testid="agent-partner-search-results"
            data-loading={loadingSearch ? "true" : "false"}
          >
            {loadingSearch && searchResults.length === 0 ? (
              <p className={styles.modalResultsState} data-testid="agent-partner-search-loading">
                Загружаем результаты…
              </p>
            ) : null}
            {searchResults.map((partner) => (
              <PartnerSearchResultCard
                key={partner.id}
                partner={partner}
                title={partnerTitle(partner)}
                showPublishedTerms={showAgentPublishedTerms}
                inviteDisabled={Boolean(inviteTarget) || loadingSearch}
                onInvite={() => beginInviteFromPartner(partner)}
                onDetail={() => openFindDirectoryDetail(partner)}
                onPublicSummaryStateChange={
                  showAgentPublishedTerms ? handlePublicSummaryStateChange : undefined
                }
              />
            ))}
            {!loadingSearch && !searchError && searchResults.length === 0 ? (
              <p className={styles.modalResultsState} data-testid="agent-partner-search-empty">
                По этому запросу партнёров не найдено.
              </p>
            ) : null}
          </div>
          {searchNextCursor ? <Button type="button" variant="secondary" disabled={loadingSearch}
            onClick={() => void loadSearch("append", searchNextCursor)}>
            {loadingSearch ? "Загрузка…" : "Показать ещё"}
          </Button> : null}
          <div className={styles.findInviteInline}>
            <div><strong>Знакомого ещё нет в RemCard?</strong><p>Отправьте персональную ссылку на приглашение.</p></div>
            <Button type="button" variant="secondary" onClick={() => onOpenPartnerHub?.("link")}>Пригласить по ссылке</Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isModalSurface) {
    return (
      <div className={styles.modalSurface} data-testid={`agent-r04-modal-${agentModalSurface}`}>
        {agentModalSurface === "link" ? (
          <>
            {isAgentCooperationInviter(inviterSide) ? (
              <>
                {discussionInviteReady ? null : (
                  <p className={styles.partnerMeta}>
                    Ссылка «к обсуждению» — без процентов. Персональные условия партнёр предложит после
                    запроса.
                  </p>
                )}
                <PartnerDiscussionInvitePanel
                  key={discussionInvitePanelKey}
                  showSectionTitle={false}
                  presentationWizard
                  onReadyChange={onDiscussionInviteReadyChange}
                  onDirtyChange={onDiscussionInviteDirtyChange}
                />
              </>
            ) : (
              <>
                {partnersAudience === "specialist-r04" && !discussionInviteReady ? (
                  <div className={styles.linkModeTabs} role="tablist" aria-label="Тип ссылки">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={linkInviteMode === "discussion"}
                      data-active={linkInviteMode === "discussion"}
                      disabled={linkInviteSubmitting}
                      onClick={(event) => requestLinkMode("discussion", event.currentTarget)}
                    >
                      К обсуждению
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={linkInviteMode === "terms"}
                      data-active={linkInviteMode === "terms"}
                      disabled={linkInviteSubmitting}
                      onClick={(event) => requestLinkMode("terms", event.currentTarget)}
                    >
                      С условиями
                    </button>
                  </div>
                ) : null}
                {partnersAudience === "specialist-r04" && linkInviteMode === "discussion" ? (
                  <PartnerDiscussionInvitePanel
                    key={`discussion-${discussionInvitePanelKey}`}
                    showSectionTitle={false}
                    presentationWizard
                    onReadyChange={onDiscussionInviteReadyChange}
                    onDirtyChange={reportLinkModeDirty}
                    onSubmittingChange={setLinkInviteSubmitting}
                  />
                ) : (
          <PartnerLinkInvitePanel key={`link-${discussionInvitePanelKey}`} meProfile={meProfile} inviterSide={inviterSide} showSectionTitle={false} wizard
            onDirtyChange={reportLinkModeDirty} onReadyChange={onDiscussionInviteReadyChange}
            onSubmittingChange={setLinkInviteSubmitting}
            onAnotherWay={() => onOpenPartnerHub?.("find")} />
                )}
                {pendingLinkInviteMode ? (
                  <PartnerCooperationConfirmDialog
                    open
                    testId="partner-link-mode-discard-confirm"
                    title="Сменить тип приглашения?"
                    body="Введённые данные текущего приглашения не сохранятся. Можно остаться и продолжить заполнение."
                    confirmLabel="Остаться"
                    dismissLabel="Сменить тип"
                    safeAction="confirm"
                    onConfirm={() => {
                      setPendingLinkInviteMode(null);
                      linkModeTriggerRef.current?.focus();
                    }}
                    onDismiss={() => {
                      setLinkInviteMode(pendingLinkInviteMode);
                      setPendingLinkInviteMode(null);
                    }}
                  />
                ) : null}
              </>
            )}
          </>
        ) : (
          <>
            {/* Keep find mounted (hidden) under detail so query/results/scroll/filters survive Back. */}
            <div
              hidden={Boolean(findDirectoryDetailPartner)}
              data-testid="agent-r04-modal-find-results-host"
            >
              {agentFindShowcase}
            </div>
            {findDirectoryDetailPartner ? (
              <PartnerFindDirectoryDetailShell
                key={findDirectoryDetailPartner.id}
                partner={findDirectoryDetailPartner}
                onBack={() => closeFindDirectoryDetail({ restoreFocus: true })}
                onInvite={() => {
                  const target = findDirectoryDetailPartner;
                  if (!target) return;
                  findDetailLifecycleGenRef.current += 1;
                  setFindDirectoryDetailPartner(null);
                  beginInviteFromPartner(target, { fromFindDetail: true });
                }}
                inviteDisabled={Boolean(inviteTarget) || Boolean(busyId) || loadingSearch}
                /* P23n/P23q: AGENT-only via parent gate helper; non-AGENT never fetches/renders. */
                showAgentTerms={showAgentTermsForFindDetailHandoff(showAgentPublishedTerms)}
                agentTermsSnapshot={findDetailAgentTermsSnapshot}
              />
            ) : null}
            {inviteTarget ? (
              <PartnerInviteDialog
                key={`${meId}:${inviteTarget.id}`}
                target={inviteTarget}
                meProfile={meProfile}
                inviterSide={inviterSide}
                busy={Boolean(busyId)}
                showSentState
                showPublishedTerms={showAgentPublishedTerms}
                publishedTermsSnapshot={agentTermsSnapshotForDetailHandoff(
                  inviteTarget.id, publicSummaryByPartnerRef.current,
                )}
                onClose={() => {
                  setInviteTarget(null);
                }}
                onSent={() => {
                  // POST confirmed creation: retain filters, cursor and every loaded row.
                  setSearchResults(rows => rows.map(row => row.id === inviteTarget.id
                    ? { ...row, partnershipStatus: "INVITED" } : row));
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
      {actionError && !lifecycleConfirm ? (
        <p className={styles.error} role="alert" data-testid="partners-hub-action-error">
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
          listReady={partnershipListReady}
          collectionIsEmpty={partnersEmptyPresentation.collectionIsEmpty}
          greetingVariant={partnersEmptyPresentation.greetingVariant}
          hasArchivedOrHiddenActive={partnersEmptyPresentation.hasArchivedOrHiddenActive}
          collectionCount={partnerships.length}
          legacyDisclosureOpen={overviewLegacyDisclosureOpen}
          legacyChromePinned={overviewLegacyChromePinned}
          legacyBulkOutcomeVisible={bulkOutcome != null}
          onLegacyDisclosureOpenChange={setOverviewLegacyDisclosureOpen}
          loading={loadingList}
          error={listError}
          onRetry={() => void loadList()}
          partnersAudience={partnersAudience}
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
            <>
              <AgentInvitationViewSwitch
                flow="incoming"
                viewMode={decideInvitationViewMode}
                onViewModeChange={setDecideInvitationViewMode}
              />
              <AgentPartnerCollection
                partnerships={pagedOverviewDecisions}
                meId={meId}
                listSubjectUserId={subjectUserId}
                viewMode={decideInvitationViewMode}
                busyId={busyId}
                onRunAction={(id, action) => {
                  const partnership = partnerships.find((item) => item.id === id);
                  if (!partnership) return;
                  handlePartnershipUiAction(partnership, action);
                }}
                onUpdated={() => void loadList()}
                termRequests={termRequests}
                onLoadTermRequests={(id, trigger) => requestOpenTermChange(id, trigger)}
                onCloseTermChange={requestCloseTermChange}
                onTermDirtyChange={updateTermDraftDirty}
                expandedTermPartnershipId={expandedTermPartnershipId}
                suspendDetailFocusTrap={Boolean(lifecycleConfirm) || termDiscardOpen}
                detailActionError={actionError}
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
                presentationVariant="invitations"
                invitationFlowHint="incoming"
              />
            </>
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
                  cityOptions={activeListCityOptions}
                  status={listStatus}
                  onStatusChange={setListStatus}
                  sort={listSort}
                  onPartnerTypeChange={setListPartnerType}
                  onSpecializationChange={setListSpecialization}
                  onStageChange={setListStage}
                  onCityChange={setListCity}
                  onSortChange={setListSort}
                  onResetFilters={resetListFilters}
                  taxonomyResetKey={taxonomyFilterResetKey}
                  chips={listFilterChips}
                  onTaxonomyLabelsChange={setListTaxonomyLabels}
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
                  listSubjectUserId={subjectUserId}
                  viewMode={listViewMode}
                  busyId={busyId}
                  onRunAction={(id, action) => {
                    const partnership = partnerships.find((item) => item.id === id);
                    if (!partnership) return;
                    handlePartnershipUiAction(partnership, action);
                  }}
                  onUpdated={() => void loadList()}
                  termRequests={termRequests}
                  onLoadTermRequests={(id, trigger) => requestOpenTermChange(id, trigger)}
                  onCloseTermChange={requestCloseTermChange}
                  onTermDirtyChange={updateTermDraftDirty}
                  expandedTermPartnershipId={expandedTermPartnershipId}
                  suspendDetailFocusTrap={Boolean(lifecycleConfirm) || termDiscardOpen}
                  detailActionError={actionError}
                  selectedIds={selectedPartnerIds}
                  onToggleSelect={togglePartnerSelect}
                  onToggleSelectAll={togglePartnerSelectAll}
                  page={listPage}
                  pageSize={listPageSize}
                  totalCount={overviewActiveRows.length}
                  compactCooperation={Boolean(partnersAudience && partnersAudience !== "agent-r04")}
                  onPageChange={setListPage}
                  onPageSizeChange={(size) => {
                    setListPageSize(size);
                    setListPage(0);
                  }}
                  presentationVariant="active"
                />
              )}
            </>
          }
          waitingSlot={
            overviewGroups.outgoing.length === 0 ? (
              <p className={styles.partnerMeta} data-testid="agent-invitations-outgoing-empty">
                Отправленных приглашений пока нет. Здесь будут предложения, которые вы отправили и
                которые ждут ответа партнёра.
              </p>
            ) : (
              <>
                <AgentInvitationViewSwitch
                  flow="outgoing"
                  viewMode={waitingInvitationViewMode}
                  onViewModeChange={setWaitingInvitationViewMode}
                />
                <AgentPartnerCollection
                  partnerships={pagedOverviewWaiting}
                  meId={meId}
                  listSubjectUserId={subjectUserId}
                  viewMode={waitingInvitationViewMode}
                  busyId={busyId}
                  onRunAction={(id, action) => {
                    const partnership = partnerships.find((item) => item.id === id);
                    if (!partnership) return;
                    handlePartnershipUiAction(partnership, action);
                  }}
                  onUpdated={() => void loadList()}
                  termRequests={termRequests}
                  onLoadTermRequests={(id, trigger) => requestOpenTermChange(id, trigger)}
                  onCloseTermChange={requestCloseTermChange}
                  onTermDirtyChange={updateTermDraftDirty}
                  expandedTermPartnershipId={expandedTermPartnershipId}
                  suspendDetailFocusTrap={Boolean(lifecycleConfirm) || termDiscardOpen}
                  detailActionError={actionError}
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
                  presentationVariant="invitations"
                  invitationFlowHint="outgoing"
                />
              </>
            )
          }
        />
      ) : tab === "list" ? (
        <>
          {isAgentR04 && agentSegment === "invitations" ? (
            <p className={styles.partnerMeta} data-testid="agent-invitations-lead">
              {partnersSharedUiCopy(partnersAudience).invitationsLead}
            </p>
          ) : null}
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
                cityOptions={activeListCityOptions}
                status={listStatus}
                onStatusChange={setListStatus}
                sort={listSort}
                onPartnerTypeChange={setListPartnerType}
                onSpecializationChange={setListSpecialization}
                onStageChange={setListStage}
                onCityChange={setListCity}
                onSortChange={setListSort}
                onResetFilters={resetListFilters}
                taxonomyResetKey={taxonomyFilterResetKey}
                chips={listFilterChips}
                onTaxonomyLabelsChange={setListTaxonomyLabels}
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
              listSubjectUserId={subjectUserId}
              viewMode={listViewMode}
              busyId={busyId}
              onRunAction={(id, action) => {
                const partnership = partnerships.find((item) => item.id === id);
                if (!partnership) return;
                handlePartnershipUiAction(partnership, action);
              }}
              onUpdated={() => void loadList()}
              termRequests={termRequests}
              onLoadTermRequests={(id, trigger) => requestOpenTermChange(id, trigger)}
              onCloseTermChange={requestCloseTermChange}
              onTermDirtyChange={updateTermDraftDirty}
              expandedTermPartnershipId={expandedTermPartnershipId}
              suspendDetailFocusTrap={Boolean(lifecycleConfirm) || termDiscardOpen}
              detailActionError={actionError}
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
              presentationVariant={
                agentSegment === "invitations"
                  ? "invitations"
                  : agentSegment === "active"
                    ? "active"
                    : "default"
              }
              invitationFlowHint={
                agentSegment === "invitations" ? agentInvitationFlow ?? null : null
              }
            />
            </>
          ) : (
            <div className={styles.list}>
            {visiblePartnerships.map((partnership) => {
              const partner =
                partnership.storeUserId === subjectUserId
                  ? partnership.proUser
                  : partnership.storeUser;
              const titles = isAgentR04
                ? partnerDisplayTitle(partnership, subjectUserId)
                : { official: partnerTitle(partner), alias: null };
              const statusLabel =
                PARTNERSHIP_STATUS_LABELS[partnership.status] ?? partnership.status;
              const needsResponse = partnershipNeedsMyResponse(partnership, subjectUserId);
              const actions = filterPartnershipUiActionsForOrgRead(
                getPartnershipUiActions(partnership, subjectUserId),
                organizationReadContext,
              );
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
                          data-testid={`partner-action-${action.kind}`}
                          onClick={() => handlePartnershipUiAction(partnership, action.kind)}
                        >
                          {cooperationActionLabel(action.kind) ?? action.label}
                        </Button>
                      ),
                    )}
                    {partnership.status === "ACTIVE" ? (
                      <>
                        <Button
                          variant="secondary"
                          disabled={busyId === partnership.id}
                          data-testid={`partner-term-change-${partnership.id}`}
                          onClick={(event) =>
                            requestOpenTermChange(partnership.id, event.currentTarget)
                          }
                        >
                          {termChangeActionLabel()}
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
                      meId={subjectUserId}
                      partnerTitle={cooperationPartnerTitle(partnership, subjectUserId)}
                      requests={termState.state === "loaded" ? termState.requests : null}
                      loadState={
                        termState.state === "idle"
                          ? "loading"
                          : termState.state === "loaded"
                            ? "loaded"
                            : termState.state
                      }
                      loadError={termState.error}
                      onReload={() => refreshTermRequests(partnership.id)}
                      onChanged={() => {
                        void loadList();
                        refreshTermRequests(partnership.id);
                      }}
                      onDirtyChange={updateTermDraftDirty}
                      onCloseRequest={requestCloseTermChange}
                      revealSignal={termRevealSignal}
                    />
                  ) : null}
                </Panel>
              );
            })}
            </div>
          )}
        </>
      ) : tab === "link" ? (
        <PartnerLinkInvitePanel meProfile={meProfile} inviterSide={inviterSide} />
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
          inviterSide={inviterSide}
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

      {isAgentR04 ? renderAgentTermChangeHost() : null}

      {lifecycleConfirm
        ? (() => {
            const row = findPartnershipById(partnerships, lifecycleConfirm.partnershipId);
            const partnerName = row ? partnerProfileName(row, subjectUserId) : "партнёром";
            let title: string;
            let body: string;
            let confirmLabel: string;
            if (lifecycleConfirm.action === "pause") {
              ({ title, body } = pauseConfirmCopy(partnerName));
              confirmLabel = "Приостановить";
            } else if (lifecycleConfirm.action === "resume") {
              ({ title, body } = resumeConfirmCopy(partnerName));
              confirmLabel = "Возобновить сотрудничество";
            } else {
              ({ title, body, confirmLabel } = invitationWithdrawConfirmCopy(
                lifecycleConfirm.action,
                partnerName,
              ));
            }
            return (
              <PartnerCooperationConfirmDialog
                open
                testId={`partner-${lifecycleConfirm.action}-confirm`}
                title={title}
                body={body}
                confirmLabel={confirmLabel}
                dismissLabel="Отмена"
                safeAction="dismiss"
                busy={
                  busyId === lifecycleConfirm.partnershipId ||
                  partnershipPatchInFlightRef.current.has(lifecycleConfirm.partnershipId)
                }
                error={lifecycleConfirmError}
                onConfirm={() => void confirmLifecycleAction()}
                onDismiss={() => {
                  if (busyId === lifecycleConfirm.partnershipId) return;
                  setLifecycleConfirm(null);
                  setLifecycleConfirmError("");
                }}
              />
            );
          })()
        : null}

      {termDiscardOpen ? (
        <PartnerCooperationConfirmDialog
          open
          testId="partner-term-discard-confirm"
          title={discardTermDraftCopy().title}
          body={discardTermDraftCopy().body}
          confirmLabel={discardTermDraftCopy().keep}
          dismissLabel={discardTermDraftCopy().discard}
          safeAction="confirm"
          onConfirm={keepTermDraftEditing}
          onDismiss={discardTermDraftAndContinue}
        />
      ) : null}
    </div>
  );
}
