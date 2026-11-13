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
import { ObserverClientDetailView } from "./ObserverClientDetailView";
import { ObserverContractBlocked } from "./ObserverContractBlocked";
import { ObserverFilterChips } from "./ObserverFilterChips";
import { ObserverPartnerCard } from "./ObserverPartnerCard";
import { ObserverPartnerDetailView } from "./ObserverPartnerDetailView";
import { ObserverPersonalClientRow } from "./ObserverPersonalClientRow";
import { ObserverPersonalConfirmPanel } from "./ObserverPersonalConfirmPanel";
import { ObserverPersonalEditPanel } from "./ObserverPersonalEditPanel";
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

type Props = {
  showHeading?: boolean;
  appeals: ObserverReferredAppeal[];
  partners: ObserverPartnerMeta[];
  dataContract: ObserverDataContractState;
  initialLayout?: "partners" | "list";
  /** Read-only display seed (tests); never mutated on save. */
  displayPersonalMeta?: Record<string, ObserverPersonalMeta>;
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
  displayPersonalMeta = {},
}: Props) {
  const [filters, setFilters] = useState<ObserverFilterState>({
    q: "",
    period: "all",
    bucket: "active",
  });
  const [layout, setLayout] = useState<"partners" | "list">(initialLayout);
  const [openPartners, setOpenPartners] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [nav, setNav] = useState<Nav>({ view: "partners" });
  const [panel, setPanel] = useState<Panel>(null);
  const [persistenceNotice, setPersistenceNotice] = useState<string | null>(null);

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

  if (nav.view === "partner") {
    const partner = partnersById.get(nav.partnerId);
  if (partner) {
      const list = appeals.filter(
        (a) =>
          (a.receivingPartnerUserId ?? a.receivingPartnerId) === nav.partnerId &&
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
  }

  if (nav.view === "client") {
    const appeal = appeals.find((a) => a.id === nav.clientId);
    if (appeal) {
      return (
        <ObserverClientDetailView
          appeal={appeal}
          partner={partnersById.get(appeal.receivingPartnerUserId ?? appeal.receivingPartnerId)}
          onBack={backFromSubView}
        />
      );
    }
  }

  const showFilterEmpty = filtered.length === 0 && appeals.length > 0;
  const showDatasetEmpty =
    dataContract.status === "ready" && appeals.length === 0 && !filters.q && filters.period === "all";

  const editInitial =
    panel?.kind === "edit" && panel.mode === "single" && panel.ids[0]
      ? {
          alias: personalMeta[panel.ids[0]]?.alias ?? "",
          tag: personalMeta[panel.ids[0]]?.tag ?? "",
          note: personalMeta[panel.ids[0]]?.note ?? "",
        }
      : undefined;

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
            <option value="365">Год</option>
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
          onCancel={() => setPanel(null)}
          onAttemptSave={() => notifyPersistenceBlock("Сохранить личные поля")}
        />
      ) : null}

      {panel?.kind === "confirm" ? (
        <ObserverPersonalConfirmPanel
          kind={panel.action}
          count={panel.ids.length}
          onCancel={() => setPanel(null)}
          onConfirm={() => notifyPersistenceBlock(panel.action)}
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

      {showDatasetEmpty ? (
        <section className={styles.empty} data-testid="ca-observer-empty">
          <h2>В активном списке нет записей</h2>
          <p className={styles.intro}>Переключите вкладку списка. Данные у партнёров не удаляются.</p>
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
              city: "",
              category: "",
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
    </div>
  );
}
