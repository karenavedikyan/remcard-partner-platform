"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { fetchPartnerTaxonomy } from "@/lib/partner-taxonomy";
import {
  applySearchPageIfCurrent,
  createSearchRequestGate,
} from "@/lib/partnership-search-ui";
import {
  adaptDiscoveryFacets,
  DISCOVERY_FACETS_UNAVAILABLE,
  stageSelectionResetsDirection,
} from "@/lib/partners-prototype-v1/repair-path";
import { buildVitrineCard } from "@/lib/partners-prototype-v1/vitrine-card";
import type { PartnerSearchResult, PartnerTaxonomyItem } from "@/lib/types";
import type { SearchRole } from "@/lib/partnership-rules";
import type { AgentPartnerTypeFilter } from "@/lib/agent-r04/partner-filters";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import { PartnerRepairPathNav } from "./PartnerRepairPathNav";
import { PartnerVitrineDetails } from "./PartnerVitrineDetails";
import styles from "./PartnerFindVitrine.module.css";

type Props = {
  searchRole: SearchRole;
  partnerType: AgentPartnerTypeFilter;
  onPartnerTypeChange: (v: AgentPartnerTypeFilter) => void;
  onInvite: (partner: PartnerSearchResult) => void;
  onOpenDetails?: (partner: PartnerSearchResult) => void;
};

export function PartnerFindVitrine({
  searchRole,
  partnerType,
  onPartnerTypeChange,
  onInvite,
  onOpenDetails,
}: Props) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [stageId, setStageId] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [taxonomy, setTaxonomy] = useState<{
    products: PartnerTaxonomyItem[];
    services: PartnerTaxonomyItem[];
    stages: PartnerTaxonomyItem[];
  } | null>(null);
  const [taxonomyError, setTaxonomyError] = useState("");
  const [results, setResults] = useState<PartnerSearchResult[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [facets, setFacets] = useState<ReturnType<typeof adaptDiscoveryFacets>>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [facetsGap, setFacetsGap] = useState<string | null>(null);
  const [detailsPartner, setDetailsPartner] = useState<PartnerSearchResult | null>(null);
  const searchGate = useRef(createSearchRequestGate());
  const abortRef = useRef<AbortController | null>(null);
  const pageRef = useRef<{ items: PartnerSearchResult[]; nextCursor: string | null }>({
    items: [],
    nextCursor: null,
  });

  useEffect(() => {
    let cancelled = false;
    void fetchPartnerTaxonomy()
      .then((data) => {
        if (cancelled) return;
        setTaxonomyError("");
        setTaxonomy({
          products: data.products ?? [],
          services: data.services ?? [],
          stages: data.stages ?? [],
        });
      })
      .catch((caught) => {
        if (cancelled) return;
        setTaxonomy(null);
        setTaxonomyError(
          caught instanceof Error ? caught.message : "Не удалось загрузить путь ремонта",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadSearch = useCallback(
    async (mode: "reset" | "append", cursor: string | null = null) => {
      // Abort prior in-flight fetch (optimization). Sequence still required: a
      // late resolve can ignore abort and must not overwrite replace OR append.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const seq = searchGate.current.begin();

      setLoading(true);
      if (mode === "reset") {
        setError("");
        pageRef.current = { items: [], nextCursor: null };
        setResults([]);
        setNextCursor(null);
      }
      try {
        const params = new URLSearchParams({ role: searchRole, limit: "20" });
        if (query.trim()) params.set("q", query.trim());
        if (city.trim()) params.set("city", city.trim());
        if (partnerType) params.set("partnerType", partnerType);
        if (stageId) params.set("stage", stageId);
        if (specialization.startsWith("products:")) {
          params.set("product", specialization.slice("products:".length));
        } else if (specialization.startsWith("services:")) {
          params.set("service", specialization.slice("services:".length));
        }
        if (mode === "append" && cursor) params.set("cursor", cursor);

        const data = await remcardFetch<{
          partners: PartnerSearchResult[];
          nextCursor?: string | null;
          hasMore?: boolean;
          facets?: {
            total?: number | null;
            stages?: Record<string, number> | null;
            products?: Record<string, number> | null;
            services?: Record<string, number> | null;
          };
        }>(`/api/partnership/search?${params.toString()}`, {
          signal: controller.signal,
        });

        const applied = applySearchPageIfCurrent({
          requestSeq: seq,
          latestSeq: searchGate.current.latest.current,
          mode,
          prev: pageRef.current,
          batch: data.partners ?? [],
          nextCursor: data.nextCursor,
        });
        if (!applied) return;

        pageRef.current = applied;
        setResults(applied.items);
        setNextCursor(applied.nextCursor);
        const adapted = adaptDiscoveryFacets(data.facets);
        setFacets(adapted);
        setFacetsGap(adapted ? null : DISCOVERY_FACETS_UNAVAILABLE);
      } catch (caught) {
        if (controller.signal.aborted || !searchGate.current.isCurrent(seq)) return;
        if (mode === "reset") {
          pageRef.current = { items: [], nextCursor: null };
          setResults([]);
          setNextCursor(null);
        }
        setError(
          caught instanceof RemcardApiError ? caught.message : "Не удалось выполнить поиск",
        );
      } finally {
        if (searchGate.current.isCurrent(seq)) setLoading(false);
      }
    },
    [city, partnerType, query, searchRole, specialization, stageId],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadSearch("reset");
    }, 200);
    return () => window.clearTimeout(handle);
  }, [loadSearch]);

  const cards = results.map(buildVitrineCard);

  function openDetails(partner: PartnerSearchResult) {
    if (onOpenDetails) onOpenDetails(partner);
    else setDetailsPartner(partner);
  }

  return (
    <div className={styles.root} data-testid="partner-find-vitrine">
      <div className={styles.layout}>
        {taxonomyError ? (
          <p className={styles.error} role="alert" data-testid="vitrine-taxonomy-error">
            {taxonomyError}
          </p>
        ) : null}
        {taxonomy ? (
          <PartnerRepairPathNav
            stages={taxonomy.stages}
            products={taxonomy.products}
            services={taxonomy.services}
            facets={facets}
            selectedStageId={stageId}
            selectedSpecialization={specialization}
            countsUnavailableReason={facetsGap}
            onStageChange={(next) => {
              const nextState = stageSelectionResetsDirection(
                { specialization, stageId },
                next,
              );
              setStageId(nextState.stageId);
              setSpecialization(nextState.specialization);
            }}
            onSpecializationChange={setSpecialization}
          />
        ) : null}

        <section className={styles.main} aria-label="Карточки партнёров">
          <TextField
            label="Поиск по словам"
            hint="необязательно"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Название, товар, услуга, этап или ID"
            data-testid="vitrine-query"
          />

          <details
            open={filtersOpen}
            onToggle={(e) => setFiltersOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary data-testid="vitrine-filters-summary">Уточнить: город и тип партнёра</summary>
            <div className={styles.filtersBody}>
              <label>
                <span>Город</span>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Любой"
                  data-testid="vitrine-city"
                />
              </label>
              <label>
                <span>Тип партнёра</span>
                <select
                  value={partnerType}
                  onChange={(e) =>
                    onPartnerTypeChange(e.target.value as AgentPartnerTypeFilter)
                  }
                  data-testid="vitrine-partner-type"
                >
                  <option value="">Все типы</option>
                  <option value="agent">Агент</option>
                  <option value="specialist">Специалист</option>
                  <option value="store">Магазин</option>
                  <option value="company">Компания</option>
                </select>
              </label>
            </div>
          </details>

          <div className={styles.meta}>
            {loading ? <span className={styles.loading}>Ищем…</span> : null}
            {!loading && facets?.total != null ? (
              <strong data-testid="vitrine-total">Найдено: {facets.total}</strong>
            ) : !loading ? (
              <span data-testid="vitrine-page-count">
                На экране: {results.length}
                {nextCursor ? " · есть ещё" : ""}
                {facetsGap ? " · полный счётчик временно недоступен" : ""}
              </span>
            ) : null}
          </div>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          {!loading && !error && results.length === 0 ? (
            <p className={styles.empty} data-testid="vitrine-empty">
              По этим условиям партнёров нет. Смените этап, направление или сбросьте уточнения.
            </p>
          ) : null}

          <div className={styles.grid}>
            {cards.map((card, index) => {
              const partner = results[index];
              const terms = partner.publishedTerms ?? [];
              const percents = terms
                .map((t) => t.poolPercent)
                .filter((n) => typeof n === "number");
              const percentLabel =
                percents.length === 0
                  ? ""
                  : Math.min(...percents) === Math.max(...percents)
                    ? `${Math.min(...percents)}%`
                    : `от ${Math.min(...percents)} до ${Math.max(...percents)}%`;
              return (
                <article key={card.id} className={styles.card} data-testid="vitrine-card">
                  <div className={styles.cardCover} data-kind={card.kind ?? "company"}>
                    <span>{card.kindLabel}</span>
                    {!partner.partnershipStatus ? (
                      <span className={styles.openBadge}>Открыт к партнёрству</span>
                    ) : null}
                  </div>
                  <div className={styles.cardHeader}>
                    <div>
                      <h4 className={styles.title}>
                        <button
                          type="button"
                          onClick={() => openDetails(partner)}
                          className={styles.nameBtn}
                          data-testid="vitrine-card-name"
                        >
                          {card.title}
                        </button>
                      </h4>
                      <p className={styles.sub}>{card.city}</p>
                    </div>
                  </div>
                  <p className={styles.sub}>{card.specializationLine}</p>
                  {card.stagesLine ? <p className={styles.sub}>{card.stagesLine}</p> : null}
                  {card.description ? <p className={styles.desc}>{card.description}</p> : null}
                  <div className={styles.termsBlock}>
                    <span className={styles.termsTitle}>Условия для агентов</span>
                    {percentLabel ? <strong>{percentLabel}</strong> : null}
                    {terms.length > 0 ? (
                      <ul>
                        {terms.slice(0, 3).map((t) => (
                          <li key={t.category}>
                            <span>{t.categoryLabel || t.category}</span>
                            <b>{t.poolPercent}%</b>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <small>
                        Общие условия пока не опубликованы. Можно запросить персональное предложение.
                      </small>
                    )}
                  </div>
                  <div className={styles.actions}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => openDetails(partner)}
                      data-testid="vitrine-card-details"
                    >
                      Подробнее
                    </Button>
                    <Button type="button" onClick={() => onInvite(partner)}>
                      Пригласить
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          {nextCursor ? (
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => void loadSearch("append", nextCursor)}
              data-testid="vitrine-load-more"
            >
              Показать ещё
            </Button>
          ) : null}
        </section>
      </div>

      {detailsPartner ? (
        <PartnerVitrineDetails
          partner={detailsPartner}
          onClose={() => setDetailsPartner(null)}
          onInvite={onInvite}
        />
      ) : null}
    </div>
  );
}
