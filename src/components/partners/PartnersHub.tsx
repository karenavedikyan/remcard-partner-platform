"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import {
  PARTNERSHIP_STATUS_LABELS,
  categoryLabel,
  partnershipStatusTone,
} from "@/lib/partnership-labels";
import type {
  InviteTermInput,
  PartnerSearchResult,
  Partnership,
  TermChangePayload,
  TermChangeRequest,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { TextField } from "@/components/ui/FormField";
import styles from "./PartnersHub.module.css";

type PartnersHubProps = {
  meId: string;
};

type TabId = "list" | "find";

function partnerTitle(partner: { displayName: string | null; organizationName?: string | null }) {
  return partner.organizationName?.trim() || partner.displayName?.trim() || "Партнёр";
}

function parseTermChanges(raw: unknown): TermChangePayload[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const category = String((entry as { category?: unknown }).category ?? "").trim();
      const newPercent = Number((entry as { newPercent?: unknown }).newPercent);
      if (!category || !Number.isFinite(newPercent)) return null;
      return { category, newPercent };
    })
    .filter((entry): entry is TermChangePayload => Boolean(entry));
}

export function PartnersHub({ meId }: PartnersHubProps) {
  const [tab, setTab] = useState<TabId>("list");
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [searchResults, setSearchResults] = useState<PartnerSearchResult[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [searchRole, setSearchRole] = useState<"store" | "pro">("store");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inviteTarget, setInviteTarget] = useState<PartnerSearchResult | null>(null);
  const [inviteNote, setInviteNote] = useState("");
  const [termRequests, setTermRequests] = useState<Record<string, TermChangeRequest[]>>({});

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setError("");
    try {
      const data = await remcardFetch<{ partnerships: Partnership[] }>("/api/partnership/list");
      setPartnerships(data.partnerships ?? []);
    } catch (caught) {
      setPartnerships([]);
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить список");
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadSearch = useCallback(async () => {
    setLoadingSearch(true);
    setError("");
    try {
      const params = new URLSearchParams({ role: searchRole });
      if (query.trim()) params.set("q", query.trim());
      if (city.trim()) params.set("city", city.trim());
      const data = await remcardFetch<PartnerSearchResult[] | { partners: PartnerSearchResult[] }>(
        `/api/partnership/search?${params.toString()}`,
      );
      const partners = Array.isArray(data) ? data : (data.partners ?? []);
      setSearchResults(partners);
    } catch (caught) {
      setSearchResults([]);
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось выполнить поиск");
    } finally {
      setLoadingSearch(false);
    }
  }, [city, query, searchRole]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (tab === "find") {
      void loadSearch();
    }
  }, [tab, loadSearch]);

  const incomingCount = useMemo(
    () =>
      partnerships.filter(
        (item) =>
          (item.status === "INVITED" || item.status === "PENDING") &&
          item.initiatedBy !== meId,
      ).length,
    [meId, partnerships],
  );

  async function runPartnershipAction(partnershipId: string, action: string, terms?: InviteTermInput[]) {
    setBusyId(partnershipId);
    setActionError("");
    try {
      await remcardFetch(`/api/partnership/${partnershipId}`, {
        method: "PATCH",
        body: { action, ...(terms ? { terms } : {}) },
      });
      await loadList();
    } catch (caught) {
      setActionError(caught instanceof RemcardApiError ? caught.message : "Действие не выполнено");
    } finally {
      setBusyId(null);
    }
  }

  async function sendInvite() {
    if (!inviteTarget) return;
    setBusyId(inviteTarget.id);
    setActionError("");
    try {
      const terms: InviteTermInput[] = (inviteTarget.storeCategories.length
        ? inviteTarget.storeCategories
        : inviteTarget.specializations.length
          ? inviteTarget.specializations
          : ["general"]
      ).slice(0, 3).map((category) => ({
        category,
        categoryLabel: categoryLabel(category),
        storePercent: 10,
      }));

      await remcardFetch("/api/partnership/invite", {
        method: "POST",
        body: {
          targetUserId: inviteTarget.id,
          note: inviteNote.trim() || null,
          terms,
        },
      });
      setInviteTarget(null);
      setInviteNote("");
      setTab("list");
      await loadList();
    } catch (caught) {
      setActionError(caught instanceof RemcardApiError ? caught.message : "Не удалось отправить приглашение");
    } finally {
      setBusyId(null);
    }
  }

  async function loadTermRequests(partnershipId: string) {
    try {
      const data = await remcardFetch<{ requests: TermChangeRequest[] }>(
        `/api/partnerships/${partnershipId}/term-change`,
      );
      setTermRequests((prev) => ({ ...prev, [partnershipId]: data.requests ?? [] }));
    } catch {
      setTermRequests((prev) => ({ ...prev, [partnershipId]: [] }));
    }
  }

  async function respondTermChange(
    partnershipId: string,
    requestId: string,
    action: "approve" | "reject",
  ) {
    setBusyId(requestId);
    setActionError("");
    try {
      await remcardFetch(`/api/partnerships/${partnershipId}/term-change/${requestId}/respond`, {
        method: "POST",
        body: { action },
      });
      await loadList();
      await loadTermRequests(partnershipId);
    } catch (caught) {
      setActionError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось обработать изменение условий",
      );
    } finally {
      setBusyId(null);
    }
  }

  function renderActions(partnership: Partnership) {
    const isInitiator = partnership.initiatedBy === meId;
    const partner =
      partnership.storeUserId === meId ? partnership.proUser : partnership.storeUser;
    const disabled = busyId === partnership.id;

    if (partnership.status === "INVITED" && !isInitiator) {
      return (
        <div className={styles.rowActions}>
          <Button disabled={disabled} onClick={() => void runPartnershipAction(partnership.id, "accept")}>
            Принять
          </Button>
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={() => void runPartnershipAction(partnership.id, "reject")}
          >
            Отклонить
          </Button>
        </div>
      );
    }

    if (partnership.status === "INVITED" && isInitiator) {
      return (
        <Button
          variant="secondary"
          disabled={disabled}
          onClick={() => void runPartnershipAction(partnership.id, "cancel")}
        >
          Отозвать приглашение
        </Button>
      );
    }

    if (partnership.status === "PENDING" && !isInitiator) {
      return (
        <div className={styles.rowActions}>
          <Button
            disabled={disabled}
            onClick={() => void runPartnershipAction(partnership.id, "accept_pending")}
          >
            Принять условия
          </Button>
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={() => void runPartnershipAction(partnership.id, "reject")}
          >
            Отклонить
          </Button>
        </div>
      );
    }

    if (partnership.status === "PENDING" && isInitiator) {
      return (
        <Button
          variant="secondary"
          disabled={disabled}
          onClick={() => void runPartnershipAction(partnership.id, "cancel")}
        >
          Отменить предложение
        </Button>
      );
    }

    if (partnership.status === "ACTIVE") {
      return (
        <div className={styles.rowActions}>
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={() => void loadTermRequests(partnership.id)}
          >
            Запросы на изменение
          </Button>
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={() => void runPartnershipAction(partnership.id, "pause")}
          >
            Приостановить
          </Button>
        </div>
      );
    }

    if (partnership.status === "PAUSED") {
      return (
        <Button
          disabled={disabled}
          onClick={() => void runPartnershipAction(partnership.id, "resume")}
        >
          Возобновить
        </Button>
      );
    }

    return (
      <p className={styles.partnerMeta}>
        Партнёр: {partnerTitle(partner)}
        {partner.city ? ` · ${partner.city}` : ""}
      </p>
    );
  }

  return (
    <div>
      <Tabs
        active={tab}
        onChange={setTab}
        items={[
          { id: "list", label: "Мои партнёры", count: partnerships.length || undefined },
          { id: "find", label: "Найти партнёра" },
        ]}
      />

      {incomingCount > 0 ? (
        <Panel compact>
          <p className={styles.attention}>
            Требует внимания: {incomingCount} приглашени{incomingCount === 1 ? "е" : "й"} ждут вашего
            решения.
          </p>
        </Panel>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
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
              const waitingForMe =
                (partnership.status === "INVITED" || partnership.status === "PENDING") &&
                partnership.initiatedBy !== meId;

              return (
                <Panel key={partnership.id} compact>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3>{partnerTitle(partner)}</h3>
                      <p className={styles.partnerMeta}>
                        {partner.city ?? "Город не указан"}
                        {waitingForMe ? " · ожидает вашего решения" : ""}
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
                          <td>{term.categoryLabel || categoryLabel(term.category)}</td>
                          <td>{term.isExcluded ? "—" : `${term.storePercent}%`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {renderActions(partnership)}

                  {termRequests[partnership.id]?.length ? (
                    <div className={styles.termRequests}>
                      <h4>Изменения условий</h4>
                      {termRequests[partnership.id]?.map((request) => (
                        <div key={request.id} className={styles.termRequestRow}>
                          <div>
                            <StatusBadge
                              label={request.status}
                              tone={
                                request.status === "PENDING"
                                  ? "pending"
                                  : request.status === "APPROVED"
                                    ? "active"
                                    : "declined"
                              }
                            />
                            <ul>
                              {parseTermChanges(request.changes).map((change) => (
                                <li key={`${request.id}-${change.category}`}>
                                  {categoryLabel(change.category)} → {change.newPercent}%
                                </li>
                              ))}
                            </ul>
                          </div>
                          {request.status === "PENDING" && request.requestedBy !== meId ? (
                            <div className={styles.rowActions}>
                              <Button
                                disabled={busyId === request.id}
                                onClick={() =>
                                  void respondTermChange(partnership.id, request.id, "approve")
                                }
                              >
                                Согласовать
                              </Button>
                              <Button
                                variant="secondary"
                                disabled={busyId === request.id}
                                onClick={() =>
                                  void respondTermChange(partnership.id, request.id, "reject")
                                }
                              >
                                Отклонить
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </Panel>
              );
            })}
          </div>
        )
      ) : (
        <>
          <Panel compact>
            <div className={styles.searchGrid}>
              <TextField
                label="Поиск"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Имя или описание"
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
                  onChange={(event) => setSearchRole(event.target.value as "store" | "pro")}
                >
                  <option value="store">Магазины и компании</option>
                  <option value="pro">Мастеров и специалистов</option>
                </select>
              </label>
              <div className={styles.searchAction}>
                <Button type="button" onClick={() => void loadSearch()} disabled={loadingSearch}>
                  {loadingSearch ? "Поиск…" : "Найти"}
                </Button>
              </div>
            </div>
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
                          {partner.description ? ` · ${partner.description.slice(0, 120)}` : ""}
                        </p>
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
                          setInviteTarget(partner);
                          setInviteNote("");
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
        </>
      )}

      {inviteTarget ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setInviteTarget(null)}>
          <div
            className={styles.modal}
            role="dialog"
            aria-labelledby="invite-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="invite-title">Пригласить {partnerTitle(inviteTarget)}</h3>
            <TextField
              label="Комментарий"
              value={inviteNote}
              onChange={(event) => setInviteNote(event.target.value)}
              hint="Необязательно. Партнёр увидит комментарий вместе с приглашением."
            />
            <div className={styles.rowActions}>
              <Button disabled={busyId === inviteTarget.id} onClick={() => void sendInvite()}>
                {busyId === inviteTarget.id ? "Отправка…" : "Отправить приглашение"}
              </Button>
              <Button variant="secondary" onClick={() => setInviteTarget(null)}>
                Отмена
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
