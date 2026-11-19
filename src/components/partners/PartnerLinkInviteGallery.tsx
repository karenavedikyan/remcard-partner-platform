"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
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
  matchesLinkInviteSearch,
  mergeLinkInvitePhaseItems,
  participatingTermCount,
  sortLinkInviteRows,
  type LinkInviteGallerySort,
} from "@/lib/link-invite-gallery";
import type { ProProfileResponse } from "@/lib/types";
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
  const [revokeConfirm, setRevokeConfirm] = useState<RevokeConfirm>(null);
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
  }, [debouncedSearch, phase, open]);

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
      if (revokeConfirm || editingId) return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, revokeConfirm, editingId]);

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

  function selectAllFiltered() {
    if (searchInFlight) return;
    setSelectedIds(new Set(pendingFilteredIds));
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
    const url = inviteAbsoluteUrl(invite.previewPath, getAppUrl());
    if (!invite.canCopyLink || !url || listMode === "legacy" || !inviteList.resurfaceEnabled) {
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
    } catch {
      setRowHint(invite.id, "Не удалось скопировать. Скопируйте ссылку вручную.");
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

  function renderActions(invite: LinkInviteListRow, archive: boolean, layout: ViewMode) {
    const pending = !archive && invite.status === "PENDING";
    const termsOpen = expandedTermsId === invite.id;
    const editOpen = editingId === invite.id;
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
            <ul>
              {invite.terms.map((term) => (
                <li key={term.category}>
                  {term.categoryLabel}: {term.isExcluded ? "Не участвует" : `${term.storePercent}%`}
                </li>
              ))}
            </ul>
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
        {!archive ? (
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
        {rowHints[invite.id] ? (
          <p className={styles.hint} role="status" aria-live="polite" data-testid={`link-invite-gallery-hint-${invite.id}`}>
            {rowHints[invite.id]}
          </p>
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
        <header className={styles.head}>
          <h2 id={titleId}>Ссылки-приглашения</h2>
          <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="Раздел ссылок">
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

        <div className={styles.toolbar}>
          <label className={styles.searchWrap}>
            <span className={styles.hint} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
              Найти приглашение
            </span>
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
          <div className={styles.segmented} role="group" aria-label="Вид">
            <button type="button" data-active={viewMode === "cards"} onClick={() => setViewMode("cards")}>
              Карты
            </button>
            <button type="button" data-active={viewMode === "list"} onClick={() => setViewMode("list")}>
              Список
            </button>
          </div>
          <select
            className={styles.sortSelect}
            aria-label="Сортировка"
            value={sort}
            onChange={(e) => setSort(e.target.value as LinkInviteGallerySort)}
          >
            <option value="newest">Сначала новые</option>
            <option value="oldest">Сначала старые</option>
          </select>
          {phase === "active" ? (
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setSelectionMode((v) => !v);
                setSelectedIds(new Set());
              }}
            >
              {selectionMode ? "Готово" : "Выбрать"}
            </Button>
          ) : null}
          {phase === "active" && selectionMode && searchActive ? (
            <Button
              variant="secondary"
              type="button"
              disabled={searchInFlight}
              onClick={selectAllFiltered}
              data-testid="link-invite-gallery-select-matches"
            >
              Выбрать найденные
            </Button>
          ) : null}
          {phase === "active" && selectionMode && selectedIds.size > 0 ? (
            <Button
              variant="secondary"
              type="button"
              onClick={() => setRevokeConfirm({ kind: "bulk", ids: [...selectedIds] })}
            >
              Отозвать ({selectedIds.size})
            </Button>
          ) : null}
          {phase === "active" ? (
            <p className={styles.toolbarHint}>Действуют до принятия или отзыва</p>
          ) : (
            <p className={styles.toolbarHint}>Принятые приглашения — только для чтения</p>
          )}
          {searchInFlight ? (
            <p className={styles.toolbarHint} data-testid="link-invite-gallery-search-loading">
              Загружаем остальные страницы раздела для поиска…
            </p>
          ) : null}
        </div>

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

        <div className={styles.body}>
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
            <ul className={styles.grid} data-testid={`link-invite-gallery-${phase}-cards`}>
              {filteredRows.map((invite) => (
                <li key={invite.id}>
                  <article
                    className={`${styles.card} ${phase === "archive" ? styles.archiveReadonly : ""}`}
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
                    <InviteCardChrome invite={invite} />
                    {renderActions(invite, phase === "archive", "cards")}
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <ul className={styles.list} data-testid={`link-invite-gallery-${phase}-list`}>
              {filteredRows.map((invite) => (
                <li key={invite.id} className={styles.listRow} data-testid={`link-invite-list-row-${invite.id}`}>
                  <div className={styles.listRowHead}>
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
          <div>
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

      {revokeConfirm ? (
        <PartnerCooperationConfirmDialog
          open
          testId="link-invite-revoke-confirm"
          title="Отозвать ссылку?"
          body={
            revokeConfirm.kind === "bulk"
              ? `Будет отозвано ссылок: ${revokeConfirm.ids.length}. Принятые приглашения в архив не попадут.`
              : "Ссылка перестанет открываться. Действие нельзя отменить."
          }
          confirmLabel={revoking ? "Отзываем…" : "Отозвать"}
          dismissLabel="Отмена"
          safeAction="dismiss"
          onConfirm={() => {
            if (revoking) return;
            void revokeIds(revokeConfirm.kind === "bulk" ? revokeConfirm.ids : [revokeConfirm.id]);
          }}
          onDismiss={() => setRevokeConfirm(null)}
        />
      ) : null}
    </div>
  );

  if (typeof document === "undefined") return content;
  return createPortal(content, document.body);
}

function InviteCardChrome({ invite }: { invite: LinkInviteListRow }) {
  const type = invite.intendedPartnerType ?? "";
  const title = linkInviteCardTitle(invite);
  return (
    <>
      <div className={styles.cardHead}>
        <span className={styles.typeBadge} data-kind={type}>
          {linkInviteIntendedLabel(invite.intendedPartnerType) ?? "Партнёр"}
        </span>
        <span className={styles.lockup} aria-hidden="true">
          remcard<em>.</em>
        </span>
      </div>
      <div className={styles.cardMain}>
        <h3 className={styles.cardTitle} title={title}>
          {title}
        </h3>
        <p className={styles.cardMeta}>
          Создал приглашение {invite.createdBy.displayName} · {formatInviteListDate(invite.createdAt)}
        </p>
        {invite.acceptedBy ? (
          <p className={styles.cardMeta}>
            Принял: {invite.acceptedBy.displayName} · {formatInviteListDate(invite.acceptedBy.at)}
          </p>
        ) : null}
      </div>
    </>
  );
}

function InviteListTitle({ invite, archive }: { invite: LinkInviteListRow; archive: boolean }) {
  const title = linkInviteCardTitle(invite);
  const showTitleDisclosure = invite.canEditPersonalLabel !== true;
  return (
    <div>
      <strong className={styles.listTitle} title={title}>
        {title}
      </strong>
      {showTitleDisclosure ? (
        <details className={styles.titleDisclosure} data-testid={`link-invite-title-disclosure-${invite.id}`}>
          <summary>Полное название</summary>
          <p className={styles.titleDisclosureBody}>{title}</p>
        </details>
      ) : null}
      <p className={styles.hint}>
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
  const Wrapper = props.layout === "card" ? "div" : "div";
  const className = props.layout === "card" ? styles.cardFoot : styles.listActions;
  return (
    <Wrapper
      className={className}
      data-testid={props.layout === "card" ? "link-invite-card-foot" : undefined}
    >
      <button
        type="button"
        className={props.layout === "card" ? styles.termsBtn : undefined}
        aria-expanded={props.termsOpen}
        onClick={props.onToggleTerms}
      >
        Условия [{props.count}] {props.termsOpen ? "▴" : "▾"}
      </button>
      {props.canEditPersonalLabel ? (
        <button
          type="button"
          className={styles.iconAction}
          aria-label="Изменить частное название"
          onClick={props.onEdit}
        >
          ✎
        </button>
      ) : null}
      <button
        type="button"
        className={props.layout === "card" ? styles.copyBtn : undefined}
        onClick={props.onCopy}
        data-testid="link-invite-copy"
      >
        Копировать
      </button>
      <button
        type="button"
        className={styles.iconAction}
        aria-label="Отозвать ссылку"
        onClick={props.onRevoke}
      >
        🗑
      </button>
    </Wrapper>
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