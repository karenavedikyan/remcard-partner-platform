"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  partnershipNeedsMyResponse,
  profileUserToPartnerSide,
  type SearchRole,
} from "@/lib/partnership-rules";
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
import styles from "./PartnersHub.module.css";

type PartnersHubProps = {
  meId: string;
  initialProfile: ProProfileResponse;
  onAttentionCountChange?: (count: number) => void;
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

export function PartnersHub({ meId, initialProfile, onAttentionCountChange }: PartnersHubProps) {
  const searchParams = useSearchParams();
  const termsPartnershipId = searchParams.get("terms")?.trim() || null;
  const [tab, setTab] = useState<TabId>("list");
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

  const searchMeta = SEARCH_ROLE_OPTIONS.find((item) => item.value === searchRole)!;

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
      setLoadingSearch(true);
      setSearchError("");
      try {
        const params = new URLSearchParams({ role: searchRole, limit: "20" });
        if (query.trim()) params.set("q", query.trim());
        if (city.trim()) params.set("city", city.trim());
        if (filterProducts.length) params.set("product", filterProducts.join(","));
        if (filterServices.length) params.set("service", filterServices.join(","));
        if (filterStages.length) params.set("stage", filterStages.join(","));
        if (mode === "append" && cursor) {
          params.set("cursor", cursor);
        }
        const data = await remcardFetch<{
          partners: PartnerSearchResult[];
          nextCursor?: string | null;
          hasMore?: boolean;
        }>(`/api/partnership/search?${params.toString()}`);
        const batch = data.partners ?? [];
        setSearchResults((prev) => {
          if (mode === "append") {
            const seen = new Set(prev.map((p) => p.id));
            return [...prev, ...batch.filter((p) => !seen.has(p.id))];
          }
          return batch;
        });
        setSearchNextCursor(data.nextCursor ?? null);
      } catch (caught) {
        if (mode === "reset") setSearchResults([]);
        setSearchError(
          caught instanceof RemcardApiError ? caught.message : "Не удалось выполнить поиск",
        );
      } finally {
        setLoadingSearch(false);
      }
    },
    [city, filterProducts, filterServices, filterStages, query, searchRole],
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (tab !== "find") return;
    setSearchNextCursor(null);
    void loadSearch("reset");
  }, [tab, city, filterProducts, filterServices, filterStages, query, searchRole, loadSearch]);

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
    <div>
      <Tabs
        active={tab}
        onChange={setTab}
        items={[
          { id: "list", label: "Мои партнёры", count: partnerships.length || undefined },
          { id: "find", label: "Найти в RemCard" },
          { id: "link", label: "Пригласить по ссылке" },
        ]}
      />

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
      {searchError && tab === "find" ? (
        <p className={styles.error} role="alert">
          {searchError}
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
        ) : partnerships.length === 0 ? (
          <Panel
            title="Партнёров пока нет"
            hint="Перейдите во вкладку «Найти партнёра», чтобы отправить первое приглашение."
          />
        ) : (
          <div className={styles.list}>
            {partnerships.map((partnership) => {
              const partner =
                partnership.storeUserId === meId ? partnership.proUser : partnership.storeUser;
              const statusLabel =
                PARTNERSHIP_STATUS_LABELS[partnership.status] ?? partnership.status;
              const needsResponse = partnershipNeedsMyResponse(partnership, meId);
              const actions = getPartnershipUiActions(partnership, meId);
              const termState = termRequests[partnership.id] ?? {
                state: "idle" as const,
                requests: [],
                error: "",
              };

              return (
                <Panel key={partnership.id} compact>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3>{partnerTitle(partner)}</h3>
                      <p className={styles.partnerMeta}>
                        {partner.city ?? "Город не указан"}
                        {needsResponse ? " · ожидает вашего решения" : ""}
                      </p>
                    </div>
                    <StatusBadge
                      label={statusLabel}
                      tone={partnershipStatusTone(partnership.status)}
                    />
                  </div>

                  {partnership.note ? (
                    <p className={styles.note}>Комментарий: {partnership.note}</p>
                  ) : null}

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
                      <Button
                        variant="secondary"
                        disabled={busyId === partnership.id}
                        onClick={() => void loadTermRequests(partnership.id)}
                      >
                        Изменение условий
                      </Button>
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
        )
      ) : tab === "link" ? (
        <PartnerLinkInvitePanel meProfile={meProfile} />
      ) : (
        <>
          <Panel compact>
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
            <PartnerSearchFilters
              productIds={filterProducts}
              serviceIds={filterServices}
              stageIds={filterStages}
              onChangeProducts={setFilterProducts}
              onChangeServices={setFilterServices}
              onChangeStages={setFilterStages}
            />
          </Panel>

          {loadingSearch ? (
            <Panel>Ищем партнёров…</Panel>
          ) : searchResults.length === 0 ? (
            <Panel title="Никого не найдено" hint="Измените запрос или город." />
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
            setTab("list");
            void loadList();
          }}
        />
      ) : null}
    </div>
  );
}
