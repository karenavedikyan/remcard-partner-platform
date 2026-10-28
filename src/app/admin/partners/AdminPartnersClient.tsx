"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  registryFiltersFromSearchParams,
  urlRegistryFilterKey,
} from "@/app/admin/partners/adminPartnersUrlFilters";
import { AdminPartnersBulkPanel } from "@/app/admin/partners/AdminPartnersBulkPanel";
import { AdminPartnersRegistryList } from "@/app/admin/partners/AdminPartnersRegistryList";
import {
  bulkSnapshotMatches,
  fetchBulkPreviews,
  runBulkApplyQueue,
  type BulkApplyRowResult,
  type BulkPreviewSnapshot,
} from "@/app/admin/partners/adminPartnersBulkLifecycle";
import {
  REGISTRY_PAGE_SIZES,
  type BulkLifecycleAction,
  type RegistryPageSize,
} from "@/app/admin/partners/adminPartnersRegistryConstants";
import { countActiveRegistryFilters } from "@/app/admin/partners/adminPartnersFilterHelpers";
import { usePartnersRegistryViewMode } from "@/app/admin/partners/adminPartnersViewMode";
import type { PartnerRegistryItem } from "@/lib/prof-admin-partners-api";
import {
  clearAllSelection,
  clearPageSelection,
  pageSelectionState,
  selectAllPartnersOnPage,
  selectedOnOtherPagesCount,
  togglePartnerSelection,
  type SelectedPartnerRef,
} from "@/app/admin/partners/adminPartnersSelection";
import { selectedPartnerRef } from "@/app/admin/partners/partnerRegistryDisplay";
import { Button } from "@/components/ui/Button";
import styles from "./AdminPartners.module.css";
import type { PartnerRegistryFacets } from "@/lib/prof-admin-management-api";
import {
  applyPartnerLifecycle,
  fetchPartnerRegistry,
  previewPartnerLifecycle,
} from "@/lib/prof-admin-partners-api";
import { AdminPartnersMetricsBar } from "./AdminPartnersMetricsBar";
import {
  autoPartnerSearchLifecycleReason,
  isPartnerSearchLifecycleAction,
} from "./partnerSearchControl";

type PendingPreview = {
  action: string;
  effects: string[];
  warnings: string[];
  confirmToken: string;
};

export function AdminPartnersClient() {
  const searchParams = useSearchParams();
  const initialUrlFilters = registryFiltersFromSearchParams(searchParams);
  const urlFilterKey = urlRegistryFilterKey(searchParams);
  const lastSyncedUrlKeyRef = useRef(urlFilterKey);

  const [items, setItems] = useState<PartnerRegistryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<PartnerRegistryFacets | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [registration, setRegistration] = useState(initialUrlFilters.registration);
  const [partnerType, setPartnerType] = useState(initialUrlFilters.partnerType);
  const [city, setCity] = useState("");
  const [catalog, setCatalog] = useState("");
  const [archived, setArchived] = useState("");
  const [pageLimit, setPageLimit] = useState<RegistryPageSize>(25);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [stackIndex, setStackIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const error = actionError ?? registryError;
  const { storedViewMode, setStoredViewMode, effectiveViewMode, mobileDense } =
    usePartnersRegistryViewMode();
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
  const [bulkFormExpanded, setBulkFormExpanded] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Map<string, SelectedPartnerRef>>(() => new Map());
  const [selectionLimitHit, setSelectionLimitHit] = useState(false);

  const [singleSelected, setSingleSelected] = useState<PartnerRegistryItem | null>(null);
  const [pendingPreview, setPendingPreview] = useState<PendingPreview | null>(null);
  const [reason, setReason] = useState("");
  const [isApplyingSingle, setIsApplyingSingle] = useState(false);

  const [bulkReason, setBulkReason] = useState("");
  const [bulkAction, setBulkAction] = useState<BulkLifecycleAction | "">("");
  const [bulkPreview, setBulkPreview] = useState<BulkPreviewSnapshot | null>(null);
  const [bulkPreviewFailures, setBulkPreviewFailures] = useState<
    { userId: string; displayName: string | null; message: string }[] | null
  >(null);
  const [bulkPreviewLoading, setBulkPreviewLoading] = useState(false);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkApplyProgress, setBulkApplyProgress] = useState({ done: 0, total: 0 });
  const [bulkApplyResults, setBulkApplyResults] = useState<BulkApplyRowResult[] | null>(null);
  const bulkStopRef = useRef(false);
  const bulkRevisionRef = useRef(0);
  const previewRequestGen = useRef(0);
  const mountedRef = useRef(true);

  const loadVersion = useRef(0);
  const headerSelectRef = useRef<HTMLInputElement>(null);
  const cardsPageSelectRef = useRef<HTMLInputElement>(null);

  const currentCursor = cursorStack[stackIndex] ?? null;

  const filterSignature = useMemo(
    () =>
      [q, registration, partnerType, city, catalog, archived, pageLimit, urlFilterKey].join("|"),
    [q, registration, partnerType, city, catalog, archived, pageLimit, urlFilterKey],
  );

  const interactionsDisabled = bulkApplying || isApplyingSingle || bulkPreviewLoading;
  const listInteractionsDisabled = interactionsDisabled || loading;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      bulkStopRef.current = true;
      loadVersion.current += 1;
      previewRequestGen.current += 1;
    };
  }, []);

  function guardFilterChange<T>(setter: (value: T) => void, value: T) {
    if (interactionsDisabled) return;
    setter(value);
  }

  useLayoutEffect(() => {
    if (lastSyncedUrlKeyRef.current === urlFilterKey) return;
    lastSyncedUrlKeyRef.current = urlFilterKey;
    const next = registryFiltersFromSearchParams(searchParams);
    setRegistration(next.registration);
    setPartnerType(next.partnerType);
    if (interactionsDisabled) return;
    resetPagination();
    resetWorkflowForFilterChange();
  }, [urlFilterKey, searchParams, interactionsDisabled]);

  useEffect(() => {
    if (selectedIds.size === 0) setBulkFormExpanded(false);
  }, [selectedIds.size]);

  const activeFilterCount = countActiveRegistryFilters({
    registration,
    partnerType,
    city,
    catalog,
    archived,
  });

  function resetOptionalFilters() {
    if (interactionsDisabled) return;
    setRegistration("");
    setPartnerType("");
    setCity("");
    setCatalog("");
    setArchived("");
    resetPagination();
    resetWorkflowForFilterChange();
  }

  function resetWorkflowForFilterChange() {
    setSelectedIds(clearAllSelection());
    setSelectionLimitHit(false);
    setBulkPreview(null);
    setBulkPreviewFailures(null);
    setBulkApplyResults(null);
    bulkRevisionRef.current += 1;
  }

  function resetPagination() {
    setCursorStack([null]);
    setStackIndex(0);
  }

  const loadPage = useCallback(
    async (cursor: string | null) => {
      const version = ++loadVersion.current;
      setLoading(true);
      setRegistryError(null);
      try {
        const params = new URLSearchParams();
        params.set("limit", String(pageLimit));
        if (q.trim()) params.set("q", q.trim());
        if (registration) params.set("registration", registration);
        if (partnerType) params.set("partnerType", partnerType);
        if (city.trim()) params.set("city", city.trim());
        if (catalog === "visible") params.set("catalogHidden", "false");
        if (catalog === "hidden") params.set("catalogHidden", "true");
        if (catalog === "not_public") params.set("catalogVisibility", "not_public");
        if (archived) params.set("projectArchived", archived);
        if (cursor) params.set("cursor", cursor);
        const data = await fetchPartnerRegistry(params);
        if (version !== loadVersion.current || !mountedRef.current) return;
        setItems(data.items);
        setTotal(data.total);
        setFacets(data.facets ?? null);
        setNextCursor(data.nextCursor);
      } catch (e) {
        if (version === loadVersion.current) {
          setRegistryError(e instanceof Error ? e.message : "Ошибка загрузки");
        }
      } finally {
        if (version === loadVersion.current) setLoading(false);
      }
    },
    [q, registration, partnerType, city, catalog, archived, pageLimit],
  );

  const prevFilterSignature = useRef(filterSignature);
  useEffect(() => {
    let cursorToLoad = cursorStack[stackIndex] ?? null;
    if (prevFilterSignature.current !== filterSignature) {
      prevFilterSignature.current = filterSignature;
      cursorToLoad = null;
      setItems([]);
      setCursorStack([null]);
      setStackIndex(0);
      if (!interactionsDisabled) {
        resetWorkflowForFilterChange();
        setSingleSelected(null);
        setPendingPreview(null);
        setReason("");
      }
    }
    void loadPage(cursorToLoad);
  }, [filterSignature, stackIndex, loadPage]);

  const pageIds = useMemo(() => items.map((i) => i.id), [items]);
  const pageSelect = pageSelectionState(selectedIds, pageIds);
  const otherPagesSelected = selectedOnOtherPagesCount(selectedIds, pageIds);

  useLayoutEffect(() => {
    for (const el of [headerSelectRef.current, cardsPageSelectRef.current]) {
      if (!el) continue;
      el.indeterminate = pageSelect === "partial";
    }
  }, [pageSelect, effectiveViewMode]);

  function invalidateBulkPreview() {
    setBulkPreview(null);
    setBulkPreviewFailures(null);
    bulkRevisionRef.current += 1;
  }

  function onToggleRow(row: PartnerRegistryItem) {
    const { next, blockedByLimit } = togglePartnerSelection(selectedIds, selectedPartnerRef(row));
    setSelectedIds(next);
    setSelectionLimitHit(blockedByLimit);
    invalidateBulkPreview();
  }

  function onTogglePageSelect() {
    if (pageSelect === "all") {
      setSelectedIds(clearPageSelection(selectedIds, pageIds));
    } else {
      const partners = items.map(selectedPartnerRef);
      const { next, capped } = selectAllPartnersOnPage(selectedIds, partners);
      setSelectedIds(next);
      setSelectionLimitHit(capped);
    }
    invalidateBulkPreview();
  }

  async function requestPreview(action: string) {
    if (!singleSelected) return;
    setActionError(null);
    if (!isPartnerSearchLifecycleAction(action) && !reason.trim()) {
      setActionError("Укажите причину перед получением preview");
      return;
    }
    try {
      const preview = await previewPartnerLifecycle(singleSelected.id, action);
      setPendingPreview({
        action,
        effects: preview.preview.effects,
        warnings: preview.preview.warnings,
        confirmToken: preview.preview.confirmToken,
      });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Ошибка проверки");
    }
  }

  async function confirmApply() {
    if (!singleSelected || !pendingPreview || isApplyingSingle || bulkApplying) return;
    setActionError(null);
    setIsApplyingSingle(true);
    try {
      const applyReason = isPartnerSearchLifecycleAction(pendingPreview.action)
        ? autoPartnerSearchLifecycleReason(pendingPreview.action)
        : reason.trim();
      await applyPartnerLifecycle(
        singleSelected.id,
        pendingPreview.action,
        applyReason,
        pendingPreview.confirmToken,
      );
      setPendingPreview(null);
      setReason("");
      setSingleSelected(null);
      setActionError(null);
      await loadPage(currentCursor);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Ошибка применения");
    } finally {
      setIsApplyingSingle(false);
    }
  }

  async function requestBulkPreviewForMembers(members: SelectedPartnerRef[]) {
    if (members.length === 0 || !bulkAction || !bulkReason.trim()) return;
    const gen = ++previewRequestGen.current;
    setBulkPreviewLoading(true);
    setBulkPreviewFailures(null);
    setActionError(null);
    const result = await fetchBulkPreviews(
      members.map((m) => ({ userId: m.id, displayName: m.displayName })),
      bulkAction,
      previewPartnerLifecycle,
    );
    if (gen !== previewRequestGen.current || !mountedRef.current) return;
    setBulkPreviewLoading(false);
    if ("failures" in result) {
      setBulkPreview(null);
      setBulkPreviewFailures(result.failures);
      return;
    }
    setBulkPreviewFailures(null);
    setBulkPreview({
      action: bulkAction,
      reason: bulkReason,
      members: result.ok,
      revision: bulkRevisionRef.current,
    });
  }

  async function requestBulkPreview() {
    await requestBulkPreviewForMembers([...selectedIds.values()]);
  }

  async function confirmBulkApply() {
    if (!bulkPreview || bulkApplying || (bulkPreviewFailures && bulkPreviewFailures.length > 0)) return;
    const memberIds = [...selectedIds.keys()];
    if (
      bulkPreview.members.length !== memberIds.length ||
      !bulkSnapshotMatches(bulkPreview, bulkAction as BulkLifecycleAction, bulkReason, memberIds)
    ) {
      setActionError("Группа или причина изменились — получите preview заново");
      invalidateBulkPreview();
      return;
    }
    setBulkApplying(true);
    bulkStopRef.current = false;
    setBulkApplyProgress({ done: 0, total: bulkPreview.members.length });
    setBulkApplyResults([]);
    const liveResults: BulkApplyRowResult[] = [];
    try {
      await runBulkApplyQueue({
        snapshot: bulkPreview,
        applyFn: applyPartnerLifecycle,
        shouldStop: () => bulkStopRef.current || !mountedRef.current,
        onRowStart: () => {},
        onRowDone: (row) => {
          if (!mountedRef.current) return;
          liveResults.push(row);
          setBulkApplyProgress((p) => ({ ...p, done: p.done + 1 }));
          setBulkApplyResults([...liveResults]);
        },
      });
      if (!mountedRef.current) return;
      setBulkPreview(null);
      setSelectedIds(clearAllSelection());
      try {
        await loadPage(currentCursor);
      } catch {
        /* keep apply report */
      }
    } finally {
      if (mountedRef.current) setBulkApplying(false);
    }
  }

  function goNextPage() {
    if (!nextCursor || interactionsDisabled) return;
    setCursorStack((prev) => {
      const trimmed = prev.slice(0, stackIndex + 1);
      return [...trimmed, nextCursor];
    });
    setStackIndex((i) => i + 1);
  }

  function goPrevPage() {
    if (stackIndex <= 0 || interactionsDisabled) return;
    setStackIndex((i) => i - 1);
  }

  const pageFrom = total === 0 ? 0 : stackIndex * pageLimit + 1;
  const pageTo = Math.min(total, (stackIndex + 1) * pageLimit);

  return (
    <div className={styles.registry} data-mobile-dense={mobileDense || undefined}>
      <div className={styles.heading}>
        <h1>Партнёры (реестр)</h1>
        <p className={styles.headingMeta}>
          {mobileDense ? (
            <>
              {total} в выборке · {items.length} на стр.
              {total > 0 ? ` · ${pageFrom}–${pageTo}` : null}
            </>
          ) : (
            <>
              В выборке: {total} · на странице: {items.length}
              {total > 0 ? ` · показаны ${pageFrom}–${pageTo}` : null}
            </>
          )}
        </p>
      </div>
      <AdminPartnersMetricsBar
        compact={mobileDense}
        facets={facets}
        matchedTotal={total}
        partnerType={partnerType}
        registration={registration}
        catalog={catalog}
        archived={archived}
        filtersDisabled={interactionsDisabled}
        onPartnerType={(v) => guardFilterChange(setPartnerType, v)}
        onRegistration={(v) => guardFilterChange(setRegistration, v)}
        onCatalog={(v) => guardFilterChange(setCatalog, v)}
        onArchived={(v) => guardFilterChange(setArchived, v)}
      />
      <div className={styles.filters}>
        <label className={`${styles.field} ${styles.filtersSearchField}`}>
          <span className={styles.fieldLabelMobileHidden}>Поиск партнёров</span>
          <input
            placeholder="Поиск"
            value={q}
            onChange={(e) => guardFilterChange(setQ, e.target.value)}
            aria-label="Поиск партнёров"
            disabled={interactionsDisabled}
          />
        </label>
        <div className={styles.filtersMobileBar}>
          <button
            type="button"
            className={styles.filtersToggle}
            aria-expanded={filtersPanelOpen}
            disabled={interactionsDisabled}
            onClick={() => setFiltersPanelOpen((v) => !v)}
          >
            Фильтры{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
          {activeFilterCount > 0 ? (
            <button
              type="button"
              className={styles.filtersReset}
              disabled={interactionsDisabled}
              onClick={resetOptionalFilters}
            >
              Сбросить
            </button>
          ) : null}
          <Button
            variant="secondary"
            disabled={interactionsDisabled || loading}
            onClick={() => void loadPage(currentCursor)}
          >
            Обновить
          </Button>
        </div>
        <div
          className={styles.filtersExpandable}
          data-open={filtersPanelOpen || !mobileDense ? "true" : "false"}
        >
        <label className={styles.field}>
          Регистрация
          <select
            value={registration}
            onChange={(e) => guardFilterChange(setRegistration, e.target.value)}
            aria-label="Регистрация"
            disabled={interactionsDisabled}
          >
            <option value="">Все</option>
            <option value="active">Активный</option>
            <option value="demo">Демо</option>
          </select>
        </label>
        <label className={styles.field}>
          Тип партнёра
          <select
            aria-label="Тип партнёра"
            value={partnerType}
            onChange={(e) => guardFilterChange(setPartnerType, e.target.value)}
            disabled={interactionsDisabled}
          >
            <option value="">Все типы партнёров</option>
            <option value="AGENT">Агент</option>
            <option value="MASTER">Специалист</option>
            <option value="STORE">Магазин</option>
            <option value="COMPANY">Компания</option>
          </select>
        </label>
        <label className={styles.field}>
          Город
          <input
            aria-label="Город"
            placeholder="Например, Краснодар"
            value={city}
            onChange={(e) => guardFilterChange(setCity, e.target.value)}
            disabled={interactionsDisabled}
          />
        </label>
        <label className={styles.field}>
          Видимость в каталоге
          <select
            aria-label="Видимость в каталоге"
            value={catalog}
            onChange={(e) => guardFilterChange(setCatalog, e.target.value)}
            disabled={interactionsDisabled}
          >
            <option value="">Вся видимость</option>
            <option value="visible">Виден в каталоге</option>
            <option value="hidden">Скрыт администратором</option>
            <option value="not_public">Не виден в каталоге</option>
          </select>
        </label>
        <label className={styles.field}>
          Архив
          <select aria-label="Архив" value={archived} onChange={(e) => guardFilterChange(setArchived, e.target.value)} disabled={interactionsDisabled}>
            <option value="">Все профили</option>
            <option value="false">Не архивные</option>
            <option value="true">В архиве</option>
          </select>
        </label>
        <label className={styles.field}>
          Записей на странице
          <select
            aria-label="Записей на странице"
            value={pageLimit}
            disabled={interactionsDisabled}
            onChange={(e) =>
              guardFilterChange(setPageLimit, Number(e.target.value) as RegistryPageSize)
            }
          >
            {REGISTRY_PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.toolbarRow}>
          <div
            className={`${styles.viewToggle} ${styles.viewToggleDesktop}`}
            role="group"
            aria-label="Вид реестра"
          >
            <button
              type="button"
              className={storedViewMode === "table" ? styles.viewToggleActive : undefined}
              aria-pressed={storedViewMode === "table"}
              disabled={interactionsDisabled || mobileDense}
              onClick={() => setStoredViewMode("table")}
            >
              Компактная таблица
            </button>
            <button
              type="button"
              className={storedViewMode === "cards" ? styles.viewToggleActive : undefined}
              aria-pressed={storedViewMode === "cards"}
              disabled={interactionsDisabled || mobileDense}
              onClick={() => setStoredViewMode("cards")}
            >
              Карточки
            </button>
          </div>
          <Button
            variant="secondary"
            className={styles.refreshDesktop}
            disabled={interactionsDisabled || loading}
            onClick={() => void loadPage(currentCursor)}
          >
            Обновить
          </Button>
        </div>
        </div>
      </div>

      {selectionLimitHit ? (
        <p role="status" className={styles.bulkHint}>
          Достигнут лимит выбора ({selectedIds.size} из 100). Снимите часть выбора, чтобы добавить других.
        </p>
      ) : null}

      <AdminPartnersBulkPanel
        selectedCount={selectedIds.size}
        otherPagesCount={otherPagesSelected}
        onClearSelection={() => {
          setSelectedIds(clearAllSelection());
          invalidateBulkPreview();
        }}
        bulkReason={bulkReason}
        onBulkReasonChange={(v) => {
          setBulkReason(v);
          invalidateBulkPreview();
        }}
        bulkAction={bulkAction}
        onBulkActionChange={(a) => {
          setBulkAction(a);
          invalidateBulkPreview();
        }}
        onRequestBulkPreview={() => void requestBulkPreview()}
        bulkPreview={bulkPreview}
        onConfirmBulk={() => void confirmBulkApply()}
        onCancelBulkPreview={invalidateBulkPreview}
        previewLoading={bulkPreviewLoading}
        applying={bulkApplying}
        applyProgress={bulkApplyProgress}
        applyResults={bulkApplyResults}
        onStopApply={() => {
          bulkStopRef.current = true;
        }}
        onExcludeFailedAndRetryPreview={(ids) => {
          setSelectedIds((prev) => {
            const next = new Map(prev);
            for (const id of ids) next.delete(id);
            queueMicrotask(() => {
              if (next.size === 0) return;
              void requestBulkPreviewForMembers([...next.values()]);
            });
            return next;
          });
          invalidateBulkPreview();
        }}
        previewFailures={bulkPreviewFailures}
        disabled={interactionsDisabled}
        compactSelectionBar={mobileDense}
        selectionFormExpanded={bulkFormExpanded}
        onOpenSelectionForm={() => setBulkFormExpanded(true)}
      />

      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      {loading ? <p role="status">Загрузка…</p> : null}

      <div
        className={`${styles.tableWrap} ${effectiveViewMode === "table" ? styles.tableWrapCompact : ""} ${effectiveViewMode === "dense" ? styles.tableWrapDense : ""}`}
      >
        <AdminPartnersRegistryList
          viewMode={effectiveViewMode}
          items={items}
          loading={loading}
          selectedIds={selectedIds}
          pageSelectState={pageSelect}
          onTogglePageSelect={onTogglePageSelect}
          onToggleRow={onToggleRow}
          selectionBlocked={selectionLimitHit}
          singleSelected={singleSelected}
          onSelectSingle={(row) => {
            setSingleSelected(row);
            setPendingPreview(null);
            setReason("");
            setActionError(null);
          }}
          onToggleExpand={(row) => {
            if (singleSelected?.id === row.id) {
              setSingleSelected(null);
              setPendingPreview(null);
              setActionError(null);
              return;
            }
            setSingleSelected(row);
            setPendingPreview(null);
            setReason("");
            setActionError(null);
          }}
          onCloseSingle={() => {
            setSingleSelected(null);
            setPendingPreview(null);
            setActionError(null);
          }}
          reason={reason}
          onReasonChange={setReason}
          pendingPreview={pendingPreview}
          onCancelPreview={() => setPendingPreview(null)}
          onRequestPreview={(action) => void requestPreview(action)}
          onConfirmApply={() => void confirmApply()}
          isApplyingSingle={isApplyingSingle}
          interactionsDisabled={listInteractionsDisabled}
          headerSelectRef={headerSelectRef}
          cardsPageSelectRef={cardsPageSelectRef}
        />
        {!loading && !error && items.length === 0 ? (
          <p className={styles.empty}>Партнёры не найдены. Измените условия поиска.</p>
        ) : null}
      </div>

      <div className={styles.pagination}>
        <Button variant="secondary" disabled={stackIndex === 0 || loading || interactionsDisabled} onClick={goPrevPage}>
          Предыдущая страница
        </Button>
        <span className={styles.paginationMeta}>
          Страница {stackIndex + 1}
          {nextCursor ? " · есть следующая" : stackIndex > 0 ? " · последняя" : ""}
        </span>
        <Button
          variant="secondary"
          disabled={!nextCursor || loading || interactionsDisabled}
          onClick={goNextPage}
        >
          Следующая страница
        </Button>
      </div>
    </div>
  );
}
