"use client";

import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { getAppUrl } from "@/lib/config";
import {
  formatInviteListDate,
  inviteAbsoluteUrl,
  parseLinkInviteListPayload,
  emptyLinkInviteList,
  type LinkInviteListResponse,
  type LinkInviteListRow,
} from "@/lib/link-invite-list";
import {
  formatLinkInviteCopyText,
  linkInviteCardTitle,
  linkInviteIntendedLabel,
  linkInviteOriginalRecipientLabel,
  appendLinkInviteListPhase,
  inviteRowAllowsPublicCopy,
  manualCopySnapshotStillValid,
  matchesLinkInviteSearch,
  mergeLinkInvitePhaseItems,
  participatingTermCount,
  sortLinkInviteRows,
  type LinkInviteGallerySort,
  type ManualCopySnapshot,
} from "@/lib/link-invite-gallery";
import type { ProProfileResponse } from "@/lib/types";
import { ThemeContext } from "@/contexts/ThemeContext";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { PartnerCooperationConfirmDialog } from "@/components/partners/PartnerCooperationConfirmDialog";
import styles from "./PartnerLinkInviteGallery.module.css";

export type PartnerLinkInviteGalleryProps = {
  open: boolean;
  onClose: () => void;
  meProfile: ProProfileResponse;
  /** Bump to force reload after create. */
  refreshToken?: number;
  defaultPhase?: "active" | "archive";
};

type ViewMode = "cards" | "list";

type RevokeConfirm =
  | { kind: "one"; id: string }
  | { kind: "bulk"; ids: string[] }
  | null;

const SEARCH_DEBOUNCE_MS = 300;

function inviteRibbonDataType(intendedPartnerType: string | null): string {
  switch (intendedPartnerType) {
    case "STORE":
      return "store";
    case "COMPANY":
      return "company";
    case "MASTER":
      return "specialist";
    case "AGENT":
      return "agent";
    default:
      return "store";
  }
}

function InviteGalleryThemeToggle() {
  const themeCtx = useContext(ThemeContext);
  if (!themeCtx) return null;
  return <ThemeToggle />;
}

export function PartnerLinkInviteGallery({
  open,
  onClose,
  meProfile,
  refreshToken = 0,
  defaultPhase = "active",
}: PartnerLinkInviteGalleryProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"active" | "archive">(defaultPhase);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [sort, setSort] = useState<LinkInviteGallerySort>("newest");
  const [search, setSearch] = useState("");
  const [listMode, setListMode] = useState<"v2" | "legacy">("v2");
  const [inviteList, setInviteList] = useState<LinkInviteListResponse>(emptyLinkInviteList());
  const [listError, setListError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [expandedTermsId, setExpandedTermsId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [rowHints, setRowHints] = useState<Record<string, string>>({});
  const [manualCopyById, setManualCopyById] = useState<Record<string, ManualCopySnapshot>>({});
  const [selectAllBusy, setSelectAllBusy] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState<RevokeConfirm>(null);
  const [bulkConfirmIds, setBulkConfirmIds] = useState<string[] | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [reissueConfirmId, setReissueConfirmId] = useState<string | null>(null);
  const [reissueWarning, setReissueWarning] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchPaging, setSearchPaging] = useState(false);
  const [searchPagingComplete, setSearchPagingComplete] = useState(true);
  const [searchPagingError, setSearchPagingError] = useState("");

  const inviteListRef = useRef(inviteList);
  inviteListRef.current = inviteList;
  const loadGenerationRef = useRef(0);
  const searchPagingGenRef = useRef(0);

  const inviterName = useMemo(
  () =>
    meProfile.organization?.name?.trim() ||
    meProfile.user.displayName?.trim() ||
    "RemCard PROF",
  [meProfile],
);

  const appUrl = useMemo(() => getAppUrl(), []);

  const fetchListPayload = useCallback(
    async (opts: {
      appendArchive?: boolean;
      appendActive?: boolean;
      archiveCursor?: string | null;
      activeCursor?: string | null;
    }) => {
      const params = new URLSearchParams({ listVersion: "2" });
      if (opts.appendArchive && opts.archiveCursor) {
        params.set("archiveCursor", opts.archiveCursor);
      }
      if (opts.appendActive && opts.activeCursor) {
        params.set("activeCursor", opts.activeCursor);
      }
      const data = await remcardFetch<LinkInviteListResponse & { invites?: unknown }>(
        `/api/partnership/link-invite?${params.toString()}`,
      );
      return parseLinkInviteListPayload(data);
    },
    [],
  );

  const loadInvites = useCallback(
    async (opts?: {
      appendArchive?: boolean;
      appendActive?: boolean;
      archiveCursor?: string | null;
      activeCursor?: string | null;
    }) => {
      const gen = ++loadGenerationRef.current;
      searchPagingGenRef.current += 1;
      setListError("");
      setLoading(true);
      try {
        const parsed = await fetchListPayload(opts ?? {});
        if (gen !== loadGenerationRef.current) return;
        setListMode(parsed.mode);
        const nextList = parsed.list;
        if (opts?.appendArchive && opts.archiveCursor) {
          setInviteList((prev) => ({
            ...nextList,
            active: prev.active,
            archive: {
              items: mergeLinkInvitePhaseItems(prev.archive.items, nextList.archive.items),
              nextCursor: nextList.archive.nextCursor,
            },
          }));
        } else if (opts?.appendActive && opts.activeCursor) {
          setInviteList((prev) => ({
            ...nextList,
            archive: prev.archive,
            active: {
              items: mergeLinkInvitePhaseItems(prev.active.items, nextList.active.items),
              nextCursor: nextList.active.nextCursor,
            },
          }));
        } else {
          setInviteList(nextList);
          setManualCopyById({});
          setRowHints({});
        }
      } catch (caught) {
        if (gen !== loadGenerationRef.current) return;
        setListError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить ссылки");
      } finally {
        if (gen === loadGenerationRef.current) setLoading(false);
      }
    },
    [fetchListPayload],
  );

  const fetchListPage = useCallback(
    async (listPhase: "active" | "archive", cursor: string) => {
      const parsed = await fetchListPayload(
        listPhase === "archive"
          ? { appendArchive: true, archiveCursor: cursor }
          : { appendActive: true, activeCursor: cursor },
      );
      return parsed.list;
    },
    [fetchListPayload],
  );

  useEffect(() => {
    if (!open) return;
    setPhase(defaultPhase);
    setSearch("");
    setDebouncedSearch("");
    setSearchPagingComplete(true);
    setSearchPagingError("");
    void loadInvites();
  }, [open, defaultPhase, refreshToken, loadInvites]);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [search, open]);

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
    setSelectionMode(false);
    setRevokeConfirm(null);
    setBulkConfirmIds(null);
  }, [search, phase, open]);

  const copyContext = useMemo(
    () => ({ listMode, resurfaceEnabled: inviteList.resurfaceEnabled }),
    [listMode, inviteList.resurfaceEnabled],
  );

  useEffect(() => {
    setManualCopyById((prev) => {
      let changed = false;
      const next: Record<string, ManualCopySnapshot> = {};
      for (const row of inviteList.active.items) {
        const snap = prev[row.id];
        if (!snap) continue;
        const absolute = inviteAbsoluteUrl(row.previewPath, appUrl);
        if (manualCopySnapshotStillValid(row, snap, absolute, copyContext)) {
          next[row.id] = snap;
        } else {
          changed = true;
        }
      }
      if (!changed && Object.keys(prev).length === Object.keys(next).length) return prev;
      return next;
    });
    setRowHints((prev) => {
      const activeIds = new Set(inviteList.active.items.map((row) => row.id));
      const next: Record<string, string> = {};
      let changed = false;
      for (const [id, hint] of Object.entries(prev)) {
        if (activeIds.has(id)) next[id] = hint;
        else changed = true;
      }
      if (!changed) return prev;
      return next;
    });
  }, [inviteList, copyContext, appUrl]);

  useEffect(() => {
    if (!open) return;
    const q = debouncedSearch.trim();
    if (!q) {
      searchPagingGenRef.current += 1;
      setSearchPaging(false);
      setSearchPagingComplete(true);
      setSearchPagingError("");
      return;
    }
    const cursor = inviteListRef.current[phase].nextCursor;
    setSearchPagingComplete(!cursor);
    setSearchPagingError("");
    if (!cursor) return;

    const gen = ++searchPagingGenRef.current;

    void (async () => {
      setSearchPaging(true);
      try {
        let list = inviteListRef.current;
        let cursor = list[phase].nextCursor;
        while (cursor) {
          if (searchPagingGenRef.current !== gen) return;
          const page = await fetchListPage(phase, cursor);
          if (searchPagingGenRef.current !== gen) return;
          list = appendLinkInviteListPhase(list, page, phase);
          inviteListRef.current = list;
          setInviteList(list);
          cursor = list[phase].nextCursor;
        }
        if (searchPagingGenRef.current === gen) setSearchPagingComplete(true);
      } catch (caught) {
        if (searchPagingGenRef.current !== gen) return;
        setSearchPagingError(
          caught instanceof RemcardApiError ? caught.message : "Не удалось подгрузить ссылки для поиска",
        );
        setSearchPagingComplete(false);
      } finally {
        if (searchPagingGenRef.current === gen) setSearchPaging(false);
      }
    })();
  }, [open, debouncedSearch, phase, fetchListPage, refreshToken]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (revokeConfirm || editingId || bulkConfirmIds) return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, revokeConfirm, editingId, bulkConfirmIds]);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  const sourceRows = phase === "active" ? inviteList.active.items : inviteList.archive.items;
  const filteredRows = useMemo(() => {
    const searched = sourceRows.filter((row) => matchesLinkInviteSearch(row, debouncedSearch));
    return sortLinkInviteRows(searched, sort);
  }, [sourceRows, debouncedSearch, sort]);

  const pendingFilteredIds = useMemo(
    () => new Set(filteredRows.filter((row) => row.status === "PENDING").map((row) => row.id)),
    [filteredRows],
  );

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => pendingFilteredIds.has(id)));
      if (next.size === prev.size) {
        for (const id of prev) {
          if (!next.has(id)) return next;
        }
        return prev;
      }
      return next;
    });
  }, [pendingFilteredIds]);

  const searchActive = debouncedSearch.trim().length > 0;
  const searchTyping = search.trim() !== debouncedSearch.trim();
  const searchInFlight = searchActive && (!searchPagingComplete || searchPaging || searchTyping);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resolveRevokeTargetIds(ids: Iterable<string>): string[] {
    return [...ids].filter((id) => pendingFilteredIds.has(id));
  }

  const revokeSelectionReady =
    !searchTyping &&
    !searchInFlight &&
    !selectAllBusy &&
    [...selectedIds].length > 0 &&
    [...selectedIds].every((id) => pendingFilteredIds.has(id));

  function selectAllFiltered() {
    if (searchInFlight || searchTyping) return;
    setSelectedIds(new Set(pendingFilteredIds));
  }

  async function selectAllActivePending() {
    if (searchTyping || searchInFlight || phase !== "active" || searchActive) return;
    setSelectAllBusy(true);
    setListError("");
    try {
      let list = inviteListRef.current;
      while (list.active.nextCursor) {
        const page = await fetchListPage("active", list.active.nextCursor);
        list = appendLinkInviteListPhase(list, page, "active");
        inviteListRef.current = list;
        setInviteList(list);
      }
      const ids = list.active.items.filter((row) => row.status === "PENDING").map((row) => row.id);
      setSelectedIds(new Set(ids));
    } catch (caught) {
      setListError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить активные ссылки");
    } finally {
      setSelectAllBusy(false);
    }
  }

  function setRowHint(id: string, hint: string) {
    setRowHints((prev) => ({ ...prev, [id]: hint }));
  }

  async function reissueInvite(id: string) {
    if (reissueConfirmId !== id) {
      setReissueConfirmId(id);
      setReissueWarning(
        "Перевыпуск заменит адрес ссылки: старый перестанет открываться. Нажмите «Подтвердить перевыпуск» для продолжения.",
      );
      return;
    }
    setReissueWarning("");
    try {
      const result = await remcardFetch<{ previewPath: string; reissueWarning?: string }>(
        `/api/partnership/link-invite/${id}/reissue`,
        { method: "POST", body: { confirmLegacyReplace: true } },
      );
      setReissueConfirmId(null);
      setReissueWarning(
        result.reissueWarning ?? "Выдана новая ссылка. Старый адрес приглашения больше не откроется.",
      );
      await loadInvites();
    } catch (caught) {
      setListError(caught instanceof RemcardApiError ? caught.message : "Не удалось перевыпустить ссылку");
    }
  }

  async function copyInvite(invite: LinkInviteListRow) {
    const url = inviteAbsoluteUrl(invite.previewPath, appUrl);
    if (!inviteRowAllowsPublicCopy(invite, copyContext) || !url) {
      if (invite.canReissue) {
        setRowHint(invite.id, "Старую ссылку восстановить нельзя. Перевыпустите ссылку в условиях.");
      } else {
        setRowHint(invite.id, "Копирование недоступно для этой записи.");
      }
      return;
    }
    const text = formatLinkInviteCopyText({
      invite,
      url,
      inviterName,
      inviterType: meProfile.user.partnerType,
    });
    try {
      await navigator.clipboard.writeText(text);
      setRowHint(invite.id, "Текст приглашения скопирован");
      setManualCopyById((prev) => {
        if (!prev[invite.id]) return prev;
        const next = { ...prev };
        delete next[invite.id];
        return next;
      });
    } catch {
      setRowHint(invite.id, "Не удалось скопировать. Скопируйте ссылку вручную.");
      if (invite.previewPath) {
        setManualCopyById((prev) => ({
          ...prev,
          [invite.id]: { url, previewPath: invite.previewPath as string },
        }));
      }
    }
  }

  async function revokeIds(ids: string[]) {
    setRevoking(true);
    setListError("");
    let failures = 0;
    for (const id of ids) {
      try {
        await remcardFetch(`/api/partnership/link-invite/${id}`, { method: "DELETE" });
      } catch {
        failures += 1;
      }
    }
    setRevoking(false);
    setRevokeConfirm(null);
    setBulkConfirmIds(null);
    setSelectedIds(new Set());
    setSelectionMode(false);
    await loadInvites();
    if (failures > 0) {
      setListError(
        failures === ids.length
          ? "Не удалось отозвать выбранные ссылки"
          : `Часть ссылок не отозвана (${failures} из ${ids.length}). Список обновлён.`,
      );
    }
  }

  function openEdit(invite: LinkInviteListRow) {
    setEditingId(invite.id);
    setEditDraft(linkInviteCardTitle(invite));
    setExpandedTermsId(null);
  }

  async function saveEdit(invite: LinkInviteListRow) {
    const trimmed = editDraft.trim();
    try {
      const result = await remcardFetch<{ ok: boolean; personalLabel: string | null }>(
        `/api/partnership/link-invite/${invite.id}`,
        { method: "PATCH", body: { personalLabel: trimmed || null } },
      );
      const patchRow = (row: LinkInviteListRow): LinkInviteListRow =>
        row.id === invite.id ? { ...row, personalLabel: result.personalLabel } : row;
      setInviteList((prev) => ({
        ...prev,
        active: { ...prev.active, items: prev.active.items.map(patchRow) },
        archive: { ...prev.archive, items: prev.archive.items.map(patchRow) },
      }));
      setEditingId(null);
      setEditDraft("");
      setRowHint(invite.id, "Частное название сохранено в вашем аккаунте");
    } catch (caught) {
      setRowHint(
        invite.id,
        caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить название",
      );
    }
  }

  function renderActions(invite: LinkInviteListRow, archive: boolean, layout: ViewMode, showFoot = true) {
    const pending = !archive && invite.status === "PENDING";
    const termsOpen = expandedTermsId === invite.id;
    const editOpen = editingId === invite.id;
    const manualSnapshot = manualCopyById[invite.id];
  const absoluteUrl = inviteAbsoluteUrl(invite.previewPath, appUrl);
  const manualUrl =
    !archive &&
    manualSnapshot &&
    manualCopySnapshotStillValid(invite, manualSnapshot, absoluteUrl, copyContext)
      ? manualSnapshot.url
      : null;
    return (
      <>
        {termsOpen ? (
          <div
            className={styles.termsPanel}
            role="region"
            aria-label="Условия приглашения"
            data-testid={`link-invite-terms-panel-${invite.id}`}
          >
            <strong>Категории</strong>
            <table className={styles.conditionsTable}>
              <thead>
                <tr>
                  <th scope="col">Категория</th>
                  <th scope="col">Условие</th>
                </tr>
              </thead>
              <tbody>
                {invite.terms.map((term) => (
                  <tr key={term.category}>
                    <td>{term.categoryLabel}</td>
                    <td>{term.isExcluded ? "Не участвует" : `${term.storePercent}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invite.canReissue && listMode === "v2" ? (
              <div className={styles.listActions}>
                <button type="button" onClick={() => void reissueInvite(invite.id)}>
                  {reissueConfirmId === invite.id ? "Подтвердить перевыпуск" : "Перевыпустить ссылку"}
                </button>
                <p className={styles.hint}>
                  Старую ссылку восстановить нельзя. Перевыпуск создаст новый адрес, прежний перестанет работать.
                </p>
              </div>
            ) : null}
            {reissueWarning && expandedTermsId === invite.id ? (
              <p className={styles.hint} role="status">
                {reissueWarning}
              </p>
            ) : null}
          </div>
        ) : null}
        {editOpen ? (
          <InviteEditPanel
            invite={invite}
            draft={editDraft}
            onDraftChange={setEditDraft}
            onSave={() => saveEdit(invite)}
            onCancel={() => {
              setEditingId(null);
              setEditDraft("");
            }}
          />
        ) : null}
        {!archive && showFoot ? (
          <InviteCardFoot
            invite={invite}
            pending={pending}
            termsOpen={termsOpen}
            layout={layout === "list" ? "list" : "card"}
            onToggleTerms={() => setExpandedTermsId(termsOpen ? null : invite.id)}
            onEdit={() => openEdit(invite)}
            onCopy={() => void copyInvite(invite)}
            onRevoke={() => setRevokeConfirm({ kind: "one", id: invite.id })}
          />
        ) : null}
        {!archive && rowHints[invite.id] ? (
          <p className={styles.hint} role="status" aria-live="polite" data-testid={`link-invite-gallery-hint-${invite.id}`}>
            {rowHints[invite.id]}
          </p>
        ) : null}
        {manualUrl ? (
          <label className={styles.copyFallback}>
            <span className={styles.srOnly}>Публичная ссылка</span>
            <input
              type="text"
              readOnly
              aria-label="Ссылка"
              className={styles.copyFallbackField}
              value={manualUrl}
              data-testid={`link-invite-manual-url-${invite.id}`}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
        ) : null}
      </>
    );
  }

  if (!open) return null;

  const content = (
    <div className={styles.backdrop} data-testid="link-invite-gallery-backdrop" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="link-invite-gallery"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.sheetHead}>
          <span className={styles.sheetHeadIcon} aria-hidden="true">
            <IconLinkInvites />
          </span>
          <div className={styles.sheetHeadCopy}>
            <p className={styles.sheetOverline}>Партнёры</p>
            <h2 id={titleId}>Ссылки-приглашения</h2>
          </div>
          <div className={styles.sheetHeadActions}>
            <InviteGalleryThemeToggle />
            <button type="button" className={styles.iconButton} aria-label="Закрыть" onClick={onClose}>
              <IconClose />
            </button>
          </div>
        </header>

        <div className={styles.viewTabs} role="tablist" aria-label="Раздел ссылок">
          <button
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={phase === "active"}
            data-active={phase === "active"}
            onClick={() => {
              setPhase("active");
              setExpandedTermsId(null);
              setEditingId(null);
            }}
          >
            Активные <span className={styles.tabBadge}>{inviteList.active.items.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={phase === "archive"}
            data-active={phase === "archive"}
            onClick={() => {
              setPhase("archive");
              setExpandedTermsId(null);
              setEditingId(null);
              setSelectionMode(false);
              setSelectedIds(new Set());
            }}
          >
            Архив <span className={styles.tabBadge}>{inviteList.archive.items.length}</span>
          </button>
        </div>

        <div className={styles.browseBar}>
          <label className={styles.inviteSearchBox}>
            <IconSearch />
            <span className={styles.srOnly}>Найти приглашение</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Найти приглашение"
              data-testid="link-invite-gallery-search"
            />
            {search ? (
              <button type="button" className={styles.clearSearch} onClick={() => setSearch("")}>
                Очистить
              </button>
            ) : null}
          </label>
          <div className={styles.layoutSwitch} role="group" aria-label="Вид">
            <button type="button" data-active={viewMode === "cards"} onClick={() => setViewMode("cards")}>
              Карты
            </button>
            <button type="button" data-active={viewMode === "list"} onClick={() => setViewMode("list")}>
              Список
            </button>
          </div>
        </div>

        <div className={styles.listHead}>
          <h3>{phase === "active" ? "Активные приглашения" : "Архив приглашений"}</h3>
          <div className={styles.listTopControls}>
            <label className={styles.sectionCaption}>
              Сортировка
              <select
                className={styles.sortSelect}
                aria-label="Сортировка"
                value={sort}
                onChange={(e) => setSort(e.target.value as LinkInviteGallerySort)}
              >
                <option value="newest">Сначала новые</option>
                <option value="oldest">Сначала старые</option>
              </select>
            </label>
            {phase === "active" ? (
              <button
                type="button"
                className={styles.selectionModeToggle}
                data-active={selectionMode}
                onClick={() => {
                  setSelectionMode((v) => !v);
                  setSelectedIds(new Set());
                  setBulkConfirmIds(null);
                }}
              >
                {selectionMode ? "Готово" : "Выбрать"}
              </button>
            ) : null}
          </div>
        </div>

        {phase === "active" ? (
          <p className={styles.phaseHint}>Действуют до принятия или отзыва</p>
        ) : (
          <p className={styles.phaseHint}>Принятые приглашения — только для чтения</p>
        )}
        {searchInFlight ? (
          <p className={styles.phaseHint} data-testid="link-invite-gallery-search-loading">
            Загружаем остальные страницы раздела для поиска…
          </p>
        ) : null}

        {phase === "active" && selectionMode ? (
          <div className={styles.bulkBar} role="region" aria-label="Массовые действия">
            <strong>Выбрано: {selectedIds.size}</strong>
            {searchActive ? (
              <button
                type="button"
                className={styles.bulkBarBtn}
                disabled={searchInFlight || searchTyping}
                onClick={selectAllFiltered}
                data-testid="link-invite-gallery-select-matches"
              >
                Выбрать найденные
              </button>
            ) : null}
            {!searchActive && !search.trim() ? (
              <button
                type="button"
                className={styles.bulkBarBtn}
                disabled={selectAllBusy || searchTyping}
                onClick={() => void selectAllActivePending()}
                data-testid="link-invite-gallery-select-all-active"
              >
                {selectAllBusy ? "Загружаем…" : "Выбрать все активные"}
              </button>
            ) : null}
            {revokeSelectionReady ? (
              <button
                type="button"
                className={styles.bulkBarBtnDanger}
                onClick={() => {
                  const ids = resolveRevokeTargetIds(selectedIds);
                  if (!ids.length) return;
                  setBulkConfirmIds(ids);
                }}
                data-testid="link-invite-gallery-bulk-revoke"
              >
                Отозвать ({selectedIds.size})
              </button>
            ) : null}
          </div>
        ) : null}

        {bulkConfirmIds ? (
          <div
            className={styles.bulkConfirm}
            role="region"
            aria-label="Подтверждение массового отзыва"
          >
            <p className={styles.bulkConfirmLead}>
              Будет отозвано ссылок: {bulkConfirmIds.length}. Принятые приглашения в архив не попадут.
            </p>
            <div className={styles.bulkConfirmActions}>
              <button type="button" onClick={() => setBulkConfirmIds(null)} disabled={revoking}>
                Отмена
              </button>
              <button
                type="button"
                data-variant="danger"
                disabled={revoking}
                onClick={() => {
                  if (revoking) return;
                  void revokeIds(bulkConfirmIds);
                }}
              >
                {revoking ? "Отзываем…" : "Отозвать"}
              </button>
            </div>
          </div>
        ) : null}

        {listError ? (
          <p className={styles.error} role="alert">
            {listError}
          </p>
        ) : null}
        {searchPagingError ? (
          <p className={styles.error} role="alert" data-testid="link-invite-gallery-search-error">
            {searchPagingError}
          </p>
        ) : null}

        <div className={styles.listScroll}>
          {loading && sourceRows.length === 0 ? <p className={styles.empty}>Загружаем…</p> : null}
          {searchInFlight && filteredRows.length === 0 ? (
            <p className={styles.empty} data-testid="link-invite-gallery-searching">
              Ищем по всему разделу…
            </p>
          ) : null}
          {!loading && !searchInFlight && filteredRows.length === 0 ? (
            <p className={styles.empty} data-testid="link-invite-gallery-empty">
              {searchActive ? "Ничего не найдено" : "Пока нет ссылок в этом разделе"}
            </p>
          ) : null}

          {viewMode === "cards" ? (
            <ul className={styles.cardGrid} data-testid={`link-invite-gallery-${phase}-cards`}>
              {filteredRows.map((invite) => (
                <li key={invite.id}>
                  <article
                    className={`${styles.inviteCard} ${phase === "archive" ? styles.archiveReadonly : ""}`}
                    data-testid={`link-invite-card-${invite.id}`}
                  >
                    {selectionMode && phase === "active" && invite.status === "PENDING" ? (
                      <label className={styles.selectMark}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(invite.id)}
                          onChange={() => toggleSelected(invite.id)}
                          aria-label={`Выбрать ${linkInviteCardTitle(invite)}`}
                        />
                      </label>
                    ) : null}
                    <InviteCardChrome
                      invite={invite}
                      foot={
                        phase !== "archive" && invite.status === "PENDING" ? (
                          <InviteCardFoot
                            invite={invite}
                            pending
                            termsOpen={expandedTermsId === invite.id}
                            layout="card"
                            onToggleTerms={() =>
                              setExpandedTermsId(
                                expandedTermsId === invite.id ? null : invite.id,
                              )
                            }
                            onEdit={() => openEdit(invite)}
                            onCopy={() => void copyInvite(invite)}
                            onRevoke={() => setRevokeConfirm({ kind: "one", id: invite.id })}
                          />
                        ) : null
                      }
                    />
                    {renderActions(invite, phase === "archive", "cards", false)}
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <ul className={styles.listPane} data-testid={`link-invite-gallery-${phase}-list`}>
              {filteredRows.map((invite) => (
                <li
                  key={invite.id}
                  className={`${styles.listRow} ${phase === "archive" ? styles.listRowArchive : ""}`}
                  data-testid={`link-invite-list-row-${invite.id}`}
                >
                  <div className={styles.recordTop}>
                    <InviteListTitle invite={invite} archive={phase === "archive"} />
                    {selectionMode && phase === "active" && invite.status === "PENDING" ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(invite.id)}
                        onChange={() => toggleSelected(invite.id)}
                        aria-label={`Выбрать ${linkInviteCardTitle(invite)}`}
                      />
                    ) : null}
                  </div>
                  {renderActions(invite, phase === "archive", "list")}
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className={styles.footer}>
          <p data-testid="link-invite-gallery-footer-count">
            {searchActive && !searchPagingComplete
              ? `Найдено пока: ${filteredRows.length} (поиск по разделу не завершён)`
              : `Всего ссылок: ${filteredRows.length}`}
            {searchActive && searchPagingComplete ? ` (из ${sourceRows.length} в разделе)` : null}
          </p>
          <div className={styles.footerActions}>
            {phase === "active" && inviteList.active.nextCursor ? (
              <Button
                variant="secondary"
                type="button"
                disabled={loading}
                onClick={() =>
                  void loadInvites({
                    appendActive: true,
                    activeCursor: inviteList.active.nextCursor,
                  })
                }
              >
                Показать ещё активные
              </Button>
            ) : null}
            {phase === "archive" && inviteList.archive.nextCursor ? (
              <Button
                variant="secondary"
                type="button"
                disabled={loading}
                onClick={() =>
                  void loadInvites({
                    appendArchive: true,
                    archiveCursor: inviteList.archive.nextCursor,
                  })
                }
              >
                Показать ещё в архиве
              </Button>
            ) : null}
          </div>
        </footer>
      </div>

      {revokeConfirm?.kind === "one" ? (
        <PartnerCooperationConfirmDialog
          open
          testId="link-invite-revoke-confirm"
          title="Отозвать ссылку?"
          body="Ссылка перестанет открываться. Действие нельзя отменить."
          confirmLabel={revoking ? "Отзываем…" : "Отозвать"}
          dismissLabel="Отмена"
          safeAction="dismiss"
          onConfirm={() => {
            if (revoking) return;
            void revokeIds([revokeConfirm.id]);
          }}
          onDismiss={() => setRevokeConfirm(null)}
        />
      ) : null}
    </div>
  );

  if (typeof document === "undefined") return content;
  return createPortal(content, document.body);
}

function InviteCardChrome({
  invite,
  foot,
}: {
  invite: LinkInviteListRow;
  foot?: ReactNode;
}) {
  const ribbonType = inviteRibbonDataType(invite.intendedPartnerType);
  const title = linkInviteCardTitle(invite);
  const recipient = linkInviteOriginalRecipientLabel(invite);
  const showRecipient = recipient && recipient !== title;
  const createdWhen = formatInviteListDate(invite.createdAt);
  return (
    <div className={styles.inviteFace}>
      <InviteFaceTexture className={styles.inviteTexture} />
      <div className={styles.inviteCardHead}>
        <span className={styles.inviteRibbon} data-type={ribbonType}>
          {linkInviteIntendedLabel(invite.intendedPartnerType) ?? "Партнёр"}
        </span>
        <span className={styles.inviteWordmark} aria-hidden="true">
          remcard<em>.</em>
        </span>
      </div>
      <div className={styles.inviteFaceMain}>
        <h3 className={styles.inviteFaceTitle} title={title}>
          {title}
        </h3>
        {showRecipient ? <p className={styles.inviteRecipient}>Для: {recipient}</p> : null}
      </div>
      <div className={styles.authorBlock}>
        <p className={styles.authorLine}>
          {`Создал приглашение ${invite.createdBy.displayName}`}
        </p>
        <span className={styles.authorWhen}>{createdWhen}</span>
        {invite.acceptedBy ? (
          <p className={styles.inviteAccepted}>
            Принял: {invite.acceptedBy.displayName} · {formatInviteListDate(invite.acceptedBy.at)}
          </p>
        ) : null}
      </div>
      {foot}
    </div>
  );
}

function InviteListTitle({ invite, archive }: { invite: LinkInviteListRow; archive: boolean }) {
  const title = linkInviteCardTitle(invite);
  const showTitleDisclosure = invite.canEditPersonalLabel !== true;
  return (
    <div className={styles.recordTopMain}>
      <strong className={styles.listTitle} title={title}>
        {title}
      </strong>
      {showTitleDisclosure ? (
        <details className={styles.titleDisclosure} data-testid={`link-invite-title-disclosure-${invite.id}`}>
          <summary>Полное название</summary>
          <p className={styles.titleDisclosureBody}>{title}</p>
        </details>
      ) : null}
      <p className={styles.recordMeta}>
        {linkInviteIntendedLabel(invite.intendedPartnerType) ?? "—"} · {invite.createdBy.displayName} ·{" "}
        {formatInviteListDate(invite.createdAt)}
        {archive && invite.acceptedBy
          ? ` · Принял: ${invite.acceptedBy.displayName} · ${formatInviteListDate(invite.acceptedBy.at)}`
          : ""}
      </p>
    </div>
  );
}

function InviteCardFoot(props: {
  invite: LinkInviteListRow;
  pending: boolean;
  termsOpen: boolean;
  layout: "card" | "list";
  onToggleTerms: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onRevoke: () => void;
}) {
  const count = participatingTermCount(props.invite);
  return (
    <InviteFootInner
      pending={props.pending}
      termsOpen={props.termsOpen}
      count={count}
      canEditPersonalLabel={props.invite.canEditPersonalLabel === true}
      onToggleTerms={props.onToggleTerms}
      onEdit={props.onEdit}
      onCopy={props.onCopy}
      onRevoke={props.onRevoke}
      layout={props.layout}
    />
  );
}

function InviteFootInner(props: {
  pending: boolean;
  termsOpen: boolean;
  count: number;
  canEditPersonalLabel: boolean;
  onToggleTerms: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onRevoke: () => void;
  layout: "card" | "list";
}) {
  if (!props.pending) return null;
  const className = props.layout === "card" ? styles.inviteCardActions : styles.listActions;
  return (
    <div
      className={className}
      data-testid={props.layout === "card" ? "link-invite-card-foot" : undefined}
    >
      <button
        type="button"
        className={styles.conditionsToggle}
        aria-expanded={props.termsOpen}
        onClick={props.onToggleTerms}
      >
        <span>Условия</span>
        <span className={styles.conditionsCountBadge}>{props.count}</span>
        {props.termsOpen ? <IconChevronUp /> : <IconChevronDown />}
      </button>
      {props.canEditPersonalLabel ? (
        <button
          type="button"
          className={styles.iconOnlyAction}
          aria-label="Изменить частное название"
          onClick={props.onEdit}
        >
          <IconPencil />
        </button>
      ) : null}
      <button type="button" className={styles.quickCopy} onClick={props.onCopy} data-testid="link-invite-copy">
        <IconCopy />
        Копировать
      </button>
      <button
        type="button"
        className={styles.iconOnlyAction}
        aria-label="Отозвать ссылку"
        onClick={props.onRevoke}
      >
        <IconRevoke />
      </button>
    </div>
  );
}

function InviteEditPanel(props: {
  invite: LinkInviteListRow;
  draft: string;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const original = linkInviteOriginalRecipientLabel(props.invite);
  return (
    <div className={styles.editPanel} data-testid={`link-invite-edit-${props.invite.id}`}>
      <p className={styles.hint}>Для: {original ?? "не указано"}</p>
      <label>
        Частное название
        <input
          type="text"
          maxLength={120}
          value={props.draft}
          onChange={(e) => props.onDraftChange(e.target.value)}
        />
      </label>
      <InviteEditActions onSave={props.onSave} onCancel={props.onCancel} />
      <p className={styles.hint}>Частное название не попадает в ссылку и текст для получателя.</p>
    </div>
  );
}

function InviteEditActions(props: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className={styles.listActions}>
      <button type="button" onClick={props.onSave}>
        Сохранить
      </button>
      <button type="button" onClick={props.onCancel}>
        Отмена
      </button>
    </div>
  );
}

function IconLinkInvites() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 13a5 5 0 0 1 7.07 0l1.06 1.06a5 5 0 0 1-7.07 7.07L10 21.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M14 11a5 5 0 0 1-7.07 0L5.87 9.94a5 5 0 0 1 7.07-7.07L14 2.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 16h3l8.5-8.5a1.5 1.5 0 0 0-2.12-2.12L4.88 13.88 4 16z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="7" y="7" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 13V5.8A1.8 1.8 0 0 1 6.8 4H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconRevoke() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 6h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M7.5 6V5a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 9v5M12 9v5M6.5 6l.7 10a1.5 1.5 0 0 0 1.5 1.4h3.6a1.5 1.5 0 0 0 1.5-1.4l.7-10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InviteFaceTexture({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 340 230" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id="inviteTex" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
          <rect width="28" height="28" fill="transparent" />
          <path d="M0 14h28M14 0v28" stroke="currentColor" strokeWidth="0.6" opacity="0.35" />
          <rect x="11" y="11" width="6" height="6" rx="1" fill="currentColor" opacity="0.22" />
        </pattern>
      </defs>
      <rect width="340" height="230" fill="url(#inviteTex)" />
      <path
        d="M40 180c30-45 70-60 120-40s80 15 140-30"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.18"
        fill="none"
      />
    </svg>
  );
}