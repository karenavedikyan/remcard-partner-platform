"use client";

import { useCallback, useMemo, useState } from "react";
import { filterObserverAppeals } from "@/lib/clients-parity/filter-observer";
import { groupAppealsByPartner } from "@/lib/clients-parity/observer-stats";
import type { ObserverFilterState } from "@/lib/clients-parity/filter-observer";
import type {
  ObserverPartnerMeta,
  ObserverPersonalBucket,
  ObserverPersonalMeta,
  ObserverReferredAppeal,
} from "@/lib/clients-parity/types";
import { ObserverClientDetailHost } from "./ObserverClientDetailHost";
import {
  observerClientBackFrom,
  type ObserverClientBackFrom,
} from "./observer-client-back";

export { observerClientBackFrom, type ObserverClientBackFrom };
import { ObserverContractBlocked } from "./ObserverContractBlocked";
import { ObserverFilterChips } from "./ObserverFilterChips";
import { ObserverPartnerCard } from "./ObserverPartnerCard";
import { ObserverPartnerDetailMissing } from "./ObserverPartnerDetailMissing";
import { ObserverPartnerDetailView } from "./ObserverPartnerDetailView";
import { ObserverPersonalClientRow } from "./ObserverPersonalClientRow";
import { ObserverPersonalConfirmPanel } from "./ObserverPersonalConfirmPanel";
import {
  ObserverPersonalEditPanel,
  type ObserverPersonalPersistenceStatus,
  type PersonalEditDraft,
} from "./ObserverPersonalEditPanel";
import { ObserverPersonalTools } from "./ObserverPersonalTools";
import styles from "./observer.module.css";

export type ObserverDataContractState =
  | { status: "blocked"; blockerId: string; message: string; missingRoutes: string[] }
  | { status: "ready" };

type Nav =
  | { view: "partners" }
  | { view: "partner"; partnerId: string }
  | { view: "client"; clientId: string; partnerId?: string };

type Panel =
  | { kind: "edit"; mode: "single" | "bulk"; ids: string[] }
  | { kind: "confirm"; action: "archived" | "trash" | "restore"; ids: string[] }
  | null;

export type ObserverPersonalPersistResult =
  | { ok: true; meta: Record<string, ObserverPersonalMeta>; failedIds?: string[] }
  | { ok: false; message: string; failedIds?: string[] };

export type ObserverPersonalPersistenceCallbacks = {
  onSavePersonal?: (args: {
    mode: "single" | "bulk";
    ids: string[];
    draft: PersonalEditDraft;
  }) => Promise<ObserverPersonalPersistResult>;
  onBucketAction?: (args: {
    action: "archived" | "trash" | "restore";
    ids: string[];
  }) => Promise<ObserverPersonalPersistResult>;
};

type Props = {
  showHeading?: boolean;
  appeals: ObserverReferredAppeal[];
  partners: ObserverPartnerMeta[];
  dataContract: ObserverDataContractState;
  initialLayout?: "partners" | "list";
  /** Synthetic QA only — seed sub-view without mutating production routes. */
  initialNav?: Nav;
  /** Overlay from GET / parent merge after persist. */
  displayPersonalMeta?: Record<string, ObserverPersonalMeta>;
  personalPersistence?: ObserverPersonalPersistenceCallbacks;
  onPersonalMetaUpdated?: (meta: Record<string, ObserverPersonalMeta>) => void;
};

function partnersMap(partners: ObserverPartnerMeta[]) {
  return new Map(partners.map((p) => [p.id, p]));
}

function bucketCounts(
  appeals: ObserverReferredAppeal[],
  personalMeta: Record<string, ObserverPersonalMeta>,
): Record<ObserverPersonalBucket, number> {
  const counts: Record<ObserverPersonalBucket, number> = {
    active: 0,
    archived: 0,
    trash: 0,
  };
  for (const a of appeals) {
    const b = personalMeta[a.id]?.bucket ?? "active";
    counts[b] += 1;
  }
  return counts;
}

export function ObserverPartnersListView({
  showHeading = true,
  appeals,
  partners,
  dataContract,
  initialLayout = "partners",
  initialNav,
  displayPersonalMeta = {},
  personalPersistence,
  onPersonalMetaUpdated,
}: Props) {
  const [filters, setFilters] = useState<ObserverFilterState>({
    q: "",
    period: "all",
    bucket: "active",
  });
  const [layout, setLayout] = useState<"partners" | "list">(initialLayout);
  const [openPartners, setOpenPartners] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [nav, setNav] = useState<Nav>(initialNav ?? { view: "partners" });
  const [panel, setPanel] = useState<Panel>(null);
  const [persistenceNotice, setPersistenceNotice] = useState<string | null>(null);
  const [persisting, setPersisting] = useState(false);

  const personalMeta = displayPersonalMeta;
  const partnersById = useMemo(() => partnersMap(partners), [partners]);

  const filtered = useMemo(
    () => filterObserverAppeals(filters, appeals, partnersById, personalMeta),
    [appeals, filters, partnersById, personalMeta],
  );

  const visibleIds = useMemo(() => filtered.map((a) => a.id), [filtered]);
  const grouped = useMemo(() => groupAppealsByPartner(filtered), [filtered]);
  const counts = useMemo(() => bucketCounts(appeals, personalMeta), [appeals, personalMeta]);

  const selectedInView = useMemo(() => {
    const visible = new Set(visibleIds);
    return [...selected].filter((id) => visible.has(id));
  }, [selected, visibleIds]);

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisibleSelected = visibleIds.some((id) => selected.has(id));

  const notifyPersistenceBlock = useCallback((action: string) => {
    setPersistenceNotice(
      `BLOCKED_PERSISTENCE: «${action}» не выполняется без API personal-meta. Данные партнёра не изменены.`,
    );
    setPanel(null);
    setSelected(new Set());
  }, []);

  const finishPersist = useCallback(
    (res: ObserverPersonalPersistResult, ids: string[]) => {
      if (res.ok) {
        onPersonalMetaUpdated?.(res.meta);
        const failed = new Set(res.failedIds ?? []);
        setSelected(failed.size ? new Set([...ids].filter((id) => failed.has(id))) : new Set());
        if (failed.size) {
          setPersistenceNotice(
            `Обновлено: ${ids.length - failed.size}, пропущено: ${failed.size}.`,
          );
        } else {
          setPersistenceNotice(null);
        }
        setPanel(null);
        return;
      }
      const failed = new Set(res.failedIds ?? ids);
      setSelected(new Set([...ids].filter((id) => failed.has(id))));
      setPersistenceNotice(res.message);
    },
    [onPersonalMetaUpdated],
  );

  const handleConfirmBucket = useCallback(async () => {
    if (!panel || panel.kind !== "confirm" || persisting) return;
    const { action, ids } = panel;
    if (!ids.length) {
      setPanel(null);
      return;
    }
    if (!personalPersistence?.onBucketAction) {
      notifyPersistenceBlock(action);
      return;
    }
    setPersistenceNotice(null);
    setPersisting(true);
    try {
      const res = await personalPersistence.onBucketAction({ action, ids });
      finishPersist(res, ids);
    } finally {
      setPersisting(false);
    }
  }, [finishPersist, notifyPersistenceBlock, panel, personalPersistence, persisting]);

  const handleAttemptSave = useCallback(
    async (draft: PersonalEditDraft) => {
      if (!panel || panel.kind !== "edit" || persisting) return;
      const { mode, ids } = panel;
      if (!ids.length) {
        setPanel(null);
        return;
      }
      if (!personalPersistence?.onSavePersonal) {
        notifyPersistenceBlock("Сохранить личные поля");
        return;
      }
      setPersistenceNotice(null);
      setPersisting(true);
      try {
        const res = await personalPersistence.onSavePersonal({ mode, ids, draft });
        finishPersist(res, ids);
      } finally {
        setPersisting(false);
      }
    },
    [finishPersist, notifyPersistenceBlock, panel, personalPersistence, persisting],
  );

  const onPartnerToggle = useCallback((partnerId: string, open: boolean) => {
    setOpenPartners((prev) => ({ ...prev, [partnerId]: open }));
  }, []);

  const toggleSelected = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const onSelectAll = useCallback(
    (checked: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of visibleIds) {
          if (checked) next.add(id);
          else next.delete(id);
        }
        return next;
      });
    },
    [visibleIds],
  );

  const onPartnerSelect = useCallback(
    (partnerId: string, checked: boolean) => {
      const ids = grouped.get(partnerId)?.map((a) => a.id) ?? [];
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of ids) {
          if (checked) next.add(id);
          else next.delete(id);
        }
        return next;
      });
    },
    [grouped],
  );

  const partnerSelectionState = useCallback(
    (partnerId: string) => {
      const ids = grouped.get(partnerId)?.map((a) => a.id) ?? [];
      if (!ids.length) return { selected: false, partial: false };
      const hit = ids.filter((id) => selected.has(id)).length;
      return {
        selected: hit === ids.length,
        partial: hit > 0 && hit < ids.length,
      };
    },
    [grouped, selected],
  );

  const openPartnerPage = (partnerId: string) => {
    setNav({ view: "partner", partnerId });
  };

  const openClientPage = (clientId: string, partnerId?: string) => {
    setNav({ view: "client", clientId, partnerId });
  };

  const backFromSubView = () => {
    if (nav.view === "client" && nav.partnerId) {
      setNav({ view: "partner", partnerId: nav.partnerId });
      return;
    }
    setNav({ view: "partners" });
  };

  const editSessionKey =
    panel?.kind === "edit" ? `${panel.mode}:${[...panel.ids].sort().join(",")}` : "";
  const editInitial =
    panel?.kind === "edit" && panel.mode === "single" && panel.ids[0]
      ? {
          alias: personalMeta[panel.ids[0]]?.alias ?? "",
          tag: personalMeta[panel.ids[0]]?.tag ?? "",
          note: personalMeta[panel.ids[0]]?.note ?? "",
        }
      : undefined;

  const editPersistenceStatus = useMemo((): ObserverPersonalPersistenceStatus => {
    if (persisting && panel?.kind === "edit") return "pending";
    if (!personalPersistence?.onSavePersonal) return "blocked";
    if (panel?.kind === "edit" && persistenceNotice) return "error";
    return "ready";
  }, [panel, persisting, persistenceNotice, personalPersistence]);

  const confirmPersistenceStatus = useMemo((): ObserverPersonalPersistenceStatus => {
    if (persisting && panel?.kind === "confirm") return "pending";
    if (!personalPersistence?.onBucketAction) return "blocked";
    if (panel?.kind === "confirm" && persistenceNotice) return "error";
    return "ready";
  }, [panel, persisting, persistenceNotice, personalPersistence]);

  if (nav.view === "partner") {
    const partner = partnersById.get(nav.partnerId);
    if (!partner) {
      return (
        <ObserverPartnerDetailMissing
          partnerId={nav.partnerId}
          onBack={() => setNav({ view: "partners" })}
        />
      );
    }
    const list = appeals.filter(
      (a) =>
        a.receivingPartnerId === nav.partnerId &&
        filterObserverAppeals(filters, [a], partnersById, personalMeta).length > 0,
    );
    return (
      <ObserverPartnerDetailView
        partner={partner}
        appeals={list}
        selectedIds={selected}
        onBack={() => setNav({ view: "partners" })}
        onClientOpen={(id) => openClientPage(id, nav.partnerId)}
        onClientSelect={toggleSelected}
      />
    );
  }

  if (nav.view === "client") {
    const clientBackFrom = observerClientBackFrom({ partnerId: nav.partnerId }, layout);
    const appeal = appeals.find((a) => a.id === nav.clientId);
    return (
      <ObserverClientDetailHost
        clientId={nav.clientId}
        listAppeal={appeal}
        listPartner={appeal ? partnersById.get(appeal.receivingPartnerId) : undefined}
        backFrom={clientBackFrom}
        onBack={backFromSubView}
      />
    );
  }

  const bucketEmpty =
    appeals.length > 0 &&
    !appeals.some((a) => (personalMeta[a.id]?.bucket ?? "active") === filters.bucket);
  const showBucketEmpty =
    dataContract.status === "ready" && filtered.length === 0 && appeals.length > 0 && bucketEmpty;
  const showFilterEmpty =
    dataContract.status === "ready" && filtered.length === 0 && appeals.length > 0 && !bucketEmpty;
  const showDatasetEmpty = dataContract.status === "ready" && appeals.length === 0;

  const bucketEmptyHeading =
    filters.bucket === "archived"
      ? "В архиве пока нет записей"
      : filters.bucket === "trash"
        ? "Корзина пуста"
        : "В активном списке нет записей";

  const listReady = dataContract.status === "ready";

  return (
    <div className={styles.section} data-testid="ca-observer-partners-list">
      {showHeading ? (
        <>
          <h2 className={styles.heading}>Мои клиенты у партнёров</h2>
          <p className={styles.intro}>
            Направленные клиенты и их статусы у принимающих партнёров. Личные заметки не меняют данные
            партнёра.
          </p>
        </>
      ) : null}

      {dataContract.status === "blocked" ? (
        <ObserverContractBlocked
          title="Данные направлений недоступны"
          blockerId={dataContract.blockerId}
          message={dataContract.message}
          missingRoutes={dataContract.missingRoutes}
        />
      ) : null}

      {listReady ? (
        <>
      <div className={styles.filters} aria-label="Фильтры направлений">
        <label className={styles.searchField}>
          Поиск партнёра или клиента
          <input
            type="search"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Имя, партнёр, сертификат"
            data-ca-input="observer-q"
          />
        </label>
        <label className={styles.selectField}>
          Период направления
          <select
            value={filters.period}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                period: e.target.value as ObserverFilterState["period"],
              }))
            }
            data-ca-input="observer-period"
          >
            <option value="all">Всё время</option>
            <option value="30">30 дней</option>
            <option value="90">90 дней</option>
          </select>
        </label>
      </div>

      <ObserverFilterChips
        q={filters.q}
        period={filters.period}
        onClearQ={() => setFilters((f) => ({ ...f, q: "" }))}
        onClearPeriod={() => setFilters((f) => ({ ...f, period: "all" }))}
      />

      <ObserverPersonalTools
        bucket={filters.bucket}
        layout={layout}
        counts={counts}
        selectedCount={selectedInView.length}
        visibleCount={visibleIds.length}
        allVisibleSelected={allVisibleSelected}
        someVisibleSelected={someVisibleSelected}
        showLayoutToggle
        onBucket={(b) => {
          setFilters((f) => ({ ...f, bucket: b }));
          setSelected(new Set());
        }}
        onLayout={setLayout}
        onSelectAll={onSelectAll}
        onClearSelection={() => setSelected(new Set())}
        onEditSelected={() => {
          const ids = selectedInView;
          if (!ids.length) return;
          setPanel({ kind: "edit", mode: ids.length === 1 ? "single" : "bulk", ids });
        }}
        onRequestArchive={() =>
          setPanel({ kind: "confirm", action: "archived", ids: selectedInView })
        }
        onRequestTrash={() => setPanel({ kind: "confirm", action: "trash", ids: selectedInView })}
        onRequestRestore={() =>
          setPanel({ kind: "confirm", action: "restore", ids: selectedInView })
        }
        persistenceNotice={persistenceNotice}
      />

      {panel?.kind === "edit" ? (
        <ObserverPersonalEditPanel
          mode={panel.mode}
          count={panel.ids.length}
          initial={editInitial}
          editSessionKey={editSessionKey}
          persistenceStatus={editPersistenceStatus}
          persistenceError={editPersistenceStatus === "error" ? persistenceNotice : null}
          onCancel={() => {
            setPersistenceNotice(null);
            setPanel(null);
          }}
          onSave={(draft) => {
            void handleAttemptSave(draft);
          }}
        />
      ) : null}

      {panel?.kind === "confirm" ? (
        <ObserverPersonalConfirmPanel
          kind={panel.action}
          count={panel.ids.length}
          persistenceStatus={confirmPersistenceStatus}
          persistenceError={confirmPersistenceStatus === "error" ? persistenceNotice : null}
          onCancel={() => {
            setPersistenceNotice(null);
            setPanel(null);
          }}
          onConfirm={() => {
            void handleConfirmBucket();
          }}
        />
      ) : null}

      {showFilterEmpty ? (
        <section className={styles.empty} data-testid="ca-observer-filter-empty">
          <h2>По выбранным фильтрам ничего не найдено</h2>
          <p className={styles.intro}>Измените поиск или период направления.</p>
          <button
            type="button"
            className={styles.ghostBtn}
            data-ca-action="observer:reset-filters"
            onClick={() => setFilters({ q: "", period: "all", bucket: filters.bucket })}
          >
            Сбросить фильтры
          </button>
        </section>
      ) : null}

      {showBucketEmpty ? (
        <section className={styles.empty} data-testid="ca-observer-empty">
          <h2>{bucketEmptyHeading}</h2>
          <p className={styles.intro}>Переключите вкладку списка. Данные у партнёров не удаляются.</p>
        </section>
      ) : null}

      {showDatasetEmpty ? (
        <section className={styles.empty} data-testid="ca-observer-empty-dataset">
          <h2>Пока нет направленных клиентов</h2>
          <p className={styles.intro}>
            Здесь появятся клиенты, которых вы направили партнёрам по сертификату. Личные архив и корзина не
            меняют данные у принимающего партнёра.
          </p>
        </section>
      ) : null}

      {filtered.length > 0 && layout === "list" ? (
        <div className={styles.personalRowsFlat}>
          {filtered.map((a) => (
            <ObserverPersonalClientRow
              key={a.id}
              appeal={a}
              meta={personalMeta[a.id]}
              selected={selected.has(a.id)}
              onSelect={(c) => toggleSelected(a.id, c)}
              showEdit={filters.bucket !== "trash"}
              onEdit={() => setPanel({ kind: "edit", mode: "single", ids: [a.id] })}
              onOpen={() => openClientPage(a.id)}
            />
          ))}
        </div>
      ) : null}

      {filtered.length > 0 && layout === "partners" ? (
        <div className={`${styles.partnerGrid} ${styles.partnerGridGrouped}`}>
          {[...grouped.entries()].map(([partnerId, list]) => {
            const partner = partnersById.get(partnerId) ?? {
              id: partnerId,
              name: "Партнёр",
              city: null,
              category: null,
              receivingOrganizationId: null,
              receivingBranchId: null,
            };
            const { selected: pSel, partial } = partnerSelectionState(partnerId);
            const expanded = openPartners[partnerId] ?? Boolean(filters.q.trim());
            return (
              <ObserverPartnerCard
                key={partnerId}
                partner={partner}
                appeals={list}
                expanded={expanded}
                onToggle={(open) => onPartnerToggle(partnerId, open)}
                partnerSelected={pSel}
                partnerPartial={partial}
                onPartnerSelect={(c) => onPartnerSelect(partnerId, c)}
                selectedIds={selected}
                onClientSelect={toggleSelected}
                personalMeta={personalMeta}
                bucket={filters.bucket}
                onEditClient={(id) => setPanel({ kind: "edit", mode: "single", ids: [id] })}
                onPartnerOpen={() => openPartnerPage(partnerId)}
                onClientOpen={(id) => openClientPage(id, partnerId)}
              />
            );
          })}
        </div>
      ) : null}
        </>
      ) : null}
    </div>
  );
}
