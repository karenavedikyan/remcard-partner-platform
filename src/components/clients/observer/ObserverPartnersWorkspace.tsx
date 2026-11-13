"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchObserverReferredAppeals } from "@/lib/clients-parity/fetch-observer-appeals";
import { filterObserverAppeals } from "@/lib/clients-parity/filter-observer";
import { groupAppealsByPartner } from "@/lib/clients-parity/observer-stats";
import type { ObserverFilterState, ObserverReferredAppeal } from "@/lib/clients-parity/types";
import { ObserverContractBlocked } from "./ObserverContractBlocked";
import { ObserverPartnerCard } from "./ObserverPartnerCard";
import styles from "./observer.module.css";

const defaultFilters: ObserverFilterState = {
  q: "",
  period: "all",
  bucket: "active",
};

export function ObserverPartnersWorkspace({ showHeading = true }: { showHeading?: boolean }) {
  const [loadState, setLoadState] = useState<"loading" | "blocked" | "ready">("loading");
  const [blocker, setBlocker] = useState<{
    id: string;
    message: string;
    routes: string[];
  } | null>(null);
  const [appeals, setAppeals] = useState<ObserverReferredAppeal[]>([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [openPartners, setOpenPartners] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    void fetchObserverReferredAppeals().then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setLoadState("blocked");
        setBlocker({
          id: res.blockerId,
          message: res.message,
          routes: res.missingRoutes,
        });
        return;
      }
      setAppeals(res.appeals);
      setLoadState("ready");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const partnersById = useMemo(() => {
    const map = new Map<string, { id: string; name: string; city?: string | null; category?: string | null }>();
    if (loadState !== "ready") return map;
    return map;
  }, [loadState]);

  const filtered = useMemo(
    () => filterObserverAppeals(filters, appeals, partnersById, {}),
    [appeals, filters, partnersById],
  );

  const grouped = useMemo(() => groupAppealsByPartner(filtered), [filtered]);

  const onPartnerToggle = useCallback((partnerId: string, open: boolean) => {
    setOpenPartners((prev) => ({ ...prev, [partnerId]: open }));
  }, []);

  return (
    <div className={styles.section} data-testid="ca-observer-partners-list">
      {showHeading ? (
        <>
          <h2 className={styles.heading}>Мои клиенты у партнёров</h2>
          <p className={styles.intro}>
            Направленные клиенты и их статусы у принимающих партнёров. Личные заметки не меняют данные партнёра.
          </p>
        </>
      ) : null}

      {loadState === "blocked" && blocker ? (
        <ObserverContractBlocked
          title="Данные направлений недоступны"
          blockerId={blocker.id}
          message={blocker.message}
          missingRoutes={blocker.routes}
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
            disabled={loadState === "blocked"}
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
            disabled={loadState === "blocked"}
          >
            <option value="all">Всё время</option>
            <option value="30">30 дней</option>
            <option value="90">90 дней</option>
            <option value="365">Год</option>
          </select>
        </label>
      </div>

      {loadState === "loading" ? <p className={styles.intro}>Загрузка…</p> : null}

      {loadState === "ready" && grouped.size === 0 ? (
        <section className={styles.empty} data-testid="ca-observer-empty">
          <h2>В активном списке нет записей</h2>
          <p className={styles.intro}>Переключите вкладку списка. Данные у партнёров не удаляются.</p>
        </section>
      ) : null}

      {loadState === "ready" && grouped.size > 0 ? (
        <div className={styles.partnerGrid}>
          {[...grouped.entries()].map(([partnerId, list]) => {
            const partner = partnersById.get(partnerId) ?? {
              id: partnerId,
              name: "Партнёр",
              city: "",
              category: "",
            };
            const expanded = openPartners[partnerId] ?? Boolean(filters.q.trim());
            return (
              <ObserverPartnerCard
                key={partnerId}
                partner={partner}
                appeals={list}
                expanded={expanded}
                onToggle={(open) => onPartnerToggle(partnerId, open)}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
