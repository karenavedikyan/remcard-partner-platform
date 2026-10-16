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
  partnershipAgentSegment,
  partnershipNeedsMyResponse,
  profileUserToPartnerSide,
  type SearchRole,
} from "@/lib/partnership-rules";
import {
  matchesListPartnerType,
  matchesListSpecialization,
  partnerDisplayTitle,
  partnershipPartnerUser,
  type AgentPartnerTypeFilter,
} from "@/lib/agent-r04/partner-filters";
import { AgentPartnerRecordActions } from "@/components/partners/AgentPartnerRecordActions";
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
import { PartnerSearchFilters } from "@/components/partners/PartnerSearchFilters";
import { PartnerLinkInvitePanel } from "@/components/partners/PartnerLinkInvitePanel";
import { TermChangePanel } from "@/components/partners/TermChangePanel";
import {
  hasCustomPartnershipSearchFilters,
  mergeSearchResultPages,
} from "@/lib/partnership-search-ui";
import styles from "./PartnersHub.module.css";

export type PartnersHubProps = {
  meId: string;
  initialProfile: ProProfileResponse;
  onAttentionCountChange?: (count: number) => void;
  variant?: "legacy" | "agent-r04";
  agentSegment?: "active" | "invitations";
  forcedTab?: TabId;
  defaultSearchRole?: SearchRole;
};

type TabId = "list" | "find" | "link";

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
  forcedTab,
  defaultSearchRole: defaultSearchRoleProp,
}: PartnersHubProps) {
  const isAgentR04 = variant === "agent-r04";
  const searchParams = useSearchParams();
  const termsPartnershipId = searchParams.get("terms")?.trim() || null;
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
  const [expandedTermPartnershipId, setExpandedTermPartnershipId] = useState<string | null>(null);
  const [termRequests, setTermRequests] = useState<Record<string, TermRequestState>>({});
  const [taxonomyFilterResetKey, setTaxonomyFilterResetKey] = useState(0);
  const [listArchiveView, setListArchiveView] = useState<"active" | "archive">("active");
  const [listPartnerType, setListPartnerType] = useState<AgentPartnerTypeFilter>("");
  const [listSpecialization, setListSpecialization] = useState("");
  const [listCity, setListCity] = useState("");
  const [listStage, setListStage] = useState("");
  const [searchPartnerType, setSearchPartnerType] = useState<AgentPartnerTypeFilter>("");
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

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setListError("");
    try {
      const data = await remcardFetch<{ partnerships: Partnership[] }>("/api/partnership/list");
      setPartnerships(data.partnerships ?? []);
    } catch (caught) {
      setPartnerships([]);
      setListError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить список");
    } finally {
      setLoadingList(false);
    }
  }, []);

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

  const visiblePartnerships = useMemo(() => {
    let rows = partnerships;
    if (isAgentR04 && agentSegment) {
      rows = rows.filter((p) => partnershipAgentSegment(p.status) === agentSegment);
    }
    if (isAgentR04) {
      rows = rows.filter((p) => {
        const archived = Boolean(p.listPreference?.archivedAt);
        return listArchiveView === "archive" ? archived : !archived;
      });
      if (listPartnerType || listSpecialization || listCity.trim() || listStage) {
        rows = rows.filter((p) => {
          const partner = partnershipPartnerUser(p, meId);
          if (listCity.trim() && (partner.city ?? "").toLowerCase() !== listCity.trim().toLowerCase()) {
            return false;
          }
          if (!matchesListPartnerType(partner, listPartnerType)) return false;
          if (!matchesListSpecialization(partner, listSpecialization)) return false;
          if (listStage && !partner.storeCategories.includes(listStage)) {
            const specHit = partner.specializations.includes(listStage);
            if (!specHit) return false;
          }
          return true;
        });
      }
    }
    return rows;
  }, [
    agentSegment,
    isAgentR04,
    listArchiveView,
    listCity,
    listPartnerType,
    listSpecialization,
    listStage,
    meId,
    partnerships,
  ]);

  const resetSearchFilters = useCallback(() => {
    setQuery("");
    setCity("");
    setFilterProducts([]);
    setFilterServices([]);
    setFilterStages([]);
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

  async function runPartnershipAction(partnershipId: string, action: string) {
    setBusyId(partnershipId);
    setActionError("");
    try {
      await remcardFetch(`/api/partnership/${partnershipId}`, {
        method: "PATCH",
        body: { action },
      });
      await loadList();
    } catch (caught) {
      setActionError(caught instanceof RemcardApiError ? caught.message : "Действие не выполнено");
    } finally {
      setBusyId(null);
    }
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

  async function refreshProfile() {
    try {
      const profile = await remcardFetch<ProProfileResponse>("/api/pro/profile");
      setMeProfile(profile);
    } catch {
      // keep previous profile for invite resolution
    }
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

      {attentionCount > 0 ? (
        <Panel compact>
          <p className={styles.attention}>
            Требует внимания: {attentionCount}{" "}
            {attentionCount === 1 ? "партнёрство ждёт вашего решения" : "партнёрства ждут вашего решения"}.
          </p>
        </Panel>
      ) : null}

      {listError && tab === "list" ? (
        <p className={styles.error} role="alert">
          {listError}
        </p>
      ) : null}
      {actionError ? (
        <p className={styles.error} role="alert">
          {actionError}
        </p>
      ) : null}

      {tab === "list" ? (
        loadingList ? (
          <Panel>Загрузка партнёрств…</Panel>
        ) : visiblePartnerships.length === 0 ? (
          <Panel
            title={
              isAgentR04 && listArchiveView === "archive"
                ? "В архиве пока нет записей"
                : "Партнёров пока нет"
            }
            hint={
              isAgentR04
                ? "Используйте «Найти в RemCard» или «Пригласить по ссылке» выше."
                : "Перейдите во вкладку «Найти партнёра», чтобы отправить первое приглашение."
            }
          />
        ) : (
          <>
            {isAgentR04 ? (
              <Panel compact>
                <div className={styles.collectionCount}>
                  <span>Найдено: {visiblePartnerships.length}</span>
                  <label className={styles.compactField}>
                    Показывать
                    <select
                      value={listArchiveView}
                      onChange={(e) =>
                        setListArchiveView(e.target.value as "active" | "archive")
                      }
                    >
                      <option value="active">Активные</option>
                      <option value="archive">Архив</option>
                    </select>
                  </label>
                </div>
                <details className={styles.filterFold}>
                  <summary>Фильтры действующих</summary>
                  <div className={styles.filterGrid}>
                    <label className={styles.compactField}>
                      Тип партнёра
                      <select
                        value={listPartnerType}
                        onChange={(e) =>
                          setListPartnerType(e.target.value as AgentPartnerTypeFilter)
                        }
                      >
                        <option value="">Все типы</option>
                        <option value="agent">Агент</option>
                        <option value="specialist">Специалист</option>
                        <option value="store">Магазин</option>
                        <option value="company">Компания</option>
                      </select>
                    </label>
                    <label className={styles.compactField}>
                      Город
                      <input
                        value={listCity}
                        onChange={(e) => setListCity(e.target.value)}
                        placeholder="Любой"
                      />
                    </label>
                  </div>
                </details>
              </Panel>
            ) : null}
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
                          onClick={() => void runPartnershipAction(partnership.id, action.kind)}
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
          </>
        )
      ) : tab === "link" ? (
        <PartnerLinkInvitePanel meProfile={meProfile} />
      ) : (
        <>
          <Panel compact>
            {isAgentR04 ? (
              <>
                <p className={styles.searchLead}>
                  Специализация и этап ремонта помогают найти исполнителя, даже если вы не знаете
                  точное название.
                </p>
                <PartnerSearchFilters
                  productIds={filterProducts}
                  serviceIds={filterServices}
                  stageIds={filterStages}
                  onChangeProducts={setFilterProducts}
                  onChangeServices={setFilterServices}
                  onChangeStages={setFilterStages}
                  taxonomyFilterResetKey={taxonomyFilterResetKey}
                />
              </>
            ) : null}
            <p className={styles.searchDescription}>{searchMeta.description}</p>
            <div className={styles.searchGrid}>
              <TextField
                label="Поиск по имени"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchMeta.namePlaceholder}
                hint="Поиск по публичному имени или названию организации"
              />
              <TextField
                label="Город"
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
              {isAgentR04 ? (
                <label className={styles.roleField}>
                  <span>Тип партнёра</span>
                  <select
                    value={searchPartnerType}
                    onChange={(event) =>
                      setSearchPartnerType(event.target.value as AgentPartnerTypeFilter)
                    }
                  >
                    <option value="">Все типы</option>
                    <option value="agent">Агент</option>
                    <option value="specialist">Специалист</option>
                    <option value="store">Магазин</option>
                    <option value="company">Компания</option>
                  </select>
                </label>
              ) : (
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
              )}
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
    </div>
  );
}
