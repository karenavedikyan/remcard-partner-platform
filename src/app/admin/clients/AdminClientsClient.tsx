"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import {
  ADMIN_CLIENTS_DEFAULT_LIMIT,
  clientAvatarUrl,
  clientInitials,
  clientsErrorKind,
  fetchAdminClients,
  formatClientRegisteredAt,
  labelClientPeriod,
  type AdminClient,
  type AdminClientPeriod,
  type AdminClientsListResponse,
} from "@/lib/prof-admin-clients-api";
import styles from "./AdminClients.r1.module.css";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "empty" }
  | { kind: "forbidden" }
  | { kind: "unauthorized" }
  | { kind: "error"; message: string };

type ViewMode = "cards" | "list";

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {dir === "left" ? (
        <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function ClientAvatar({ client }: { client: AdminClient }) {
  const [broken, setBroken] = useState(false);
  const src = clientAvatarUrl(client);
  if (src && !broken) {
    return (
      <span className={styles.avatar} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" onError={() => setBroken(true)} />
      </span>
    );
  }
  return (
    <span className={styles.avatar} aria-hidden="true">
      {clientInitials(client.displayName)}
    </span>
  );
}

function StatusPill({ client }: { client: AdminClient }) {
  if (client.isBlocked) {
    return <span className={`${styles.pill} ${styles.pillBlocked}`}>Заблокирован</span>;
  }
  return <span className={`${styles.pill} ${styles.pillOk}`}>Активен</span>;
}

export function AdminClientsClient() {
  const titleId = useId();
  const searchId = useId();
  const periodId = useId();
  const [data, setData] = useState<AdminClientsListResponse>({
    users: [],
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [period, setPeriod] = useState<AdminClientPeriod>("all");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const flightRef = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, period]);

  const load = useCallback(async () => {
    const flight = ++flightRef.current;
    setLoadState({ kind: "loading" });
    try {
      const res = await fetchAdminClients({
        page,
        limit: ADMIN_CLIENTS_DEFAULT_LIMIT,
        search: debouncedQuery,
        period,
      });
      if (flight !== flightRef.current) return;
      setData(res);
      setLoadState(res.users.length === 0 ? { kind: "empty" } : { kind: "ready" });
    } catch (caught) {
      if (flight !== flightRef.current) return;
      setData({ users: [], total: 0, page: 1, totalPages: 1 });
      const kind = clientsErrorKind(caught);
      if (kind === "forbidden") {
        setLoadState({ kind: "forbidden" });
        return;
      }
      if (kind === "unauthorized") {
        setLoadState({ kind: "unauthorized" });
        return;
      }
      const message =
        caught instanceof RemcardApiError
          ? caught.message
          : "Не удалось загрузить клиентов";
      setLoadState({ kind: "error", message });
    }
  }, [page, debouncedQuery, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const from = data.total === 0 || data.users.length === 0 ? 0 : (data.page - 1) * ADMIN_CLIENTS_DEFAULT_LIMIT + 1;
  const to =
    data.total === 0 || data.users.length === 0
      ? 0
      : Math.min(data.total, (data.page - 1) * ADMIN_CLIENTS_DEFAULT_LIMIT + data.users.length);
  const canPrev = data.page > 1;
  const canNext = data.page < data.totalPages && data.total > 0;

  return (
    <div className={styles.page} aria-labelledby={titleId}>
      <header className={styles.pageHead}>
        <div className={styles.pageHeadCopy}>
          <h1 id={titleId} className={styles.pageTitle}>
            Клиенты
          </h1>
          <p className={styles.pageLead}>
            Клиентская база RemCard — только для просмотра. Список строится из GET
            /api/admin/users с role=CLIENT; поля этапа, источника-партнёра и активности
            без согласия в этом блоке не выдумываются.
          </p>
        </div>
      </header>

      <div className={styles.stats} aria-label="Сводка по клиентам">
        <div className={styles.statTile}>
          <strong data-testid="clients-total">{data.total}</strong>
          <small>
            {debouncedQuery || period !== "all"
              ? "Совпадает с текущими фильтрами"
              : "Клиентов в базе (CLIENT)"}
          </small>
        </div>
        <div className={styles.statTile}>
          <strong>{labelClientPeriod(period)}</strong>
          <small>Фильтр периода регистрации (API period)</small>
        </div>
      </div>

      <section className={styles.panel} aria-label="Список клиентов">
        <div className={styles.toolbar}>
          <div className={styles.searchField}>
            <SearchIcon />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Имя клиента"
              aria-label="Поиск клиентов"
              data-testid="client-search"
            />
          </div>
          <select
            id={periodId}
            className={styles.filterSelect}
            value={period}
            aria-label="Период регистрации"
            onChange={(e) => setPeriod(e.target.value as AdminClientPeriod)}
          >
            <option value="all">Все периоды</option>
            <option value="today">Сегодня</option>
            <option value="week">Эта неделя</option>
            <option value="month">Этот месяц</option>
          </select>
          <span className={styles.countHint} data-testid="clients-count-hint">
            {data.total} клиентов
          </span>
          <div className={styles.viewToggle} role="group" aria-label="Вид списка">
            <button
              type="button"
              aria-pressed={viewMode === "cards"}
              onClick={() => setViewMode("cards")}
            >
              Карточки
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
            >
              Таблица
            </button>
          </div>
        </div>

        {loadState.kind === "loading" ? (
          <div className={styles.stateBox} role="status">
            Загрузка клиентов…
          </div>
        ) : null}

        {loadState.kind === "error" ? (
          <div className={styles.stateBox} data-kind="error" role="alert">
            <div>{loadState.message}</div>
            <button type="button" className={styles.retry} onClick={() => void load()}>
              Повторить
            </button>
          </div>
        ) : null}

        {loadState.kind === "forbidden" ? (
          <div className={styles.stateBox} data-kind="forbidden" role="alert">
            Недостаточно прав для просмотра клиентов.
          </div>
        ) : null}

        {loadState.kind === "unauthorized" ? (
          <div className={styles.stateBox} data-kind="unauthorized" role="alert">
            Сессия недействительна. Войдите снова.
          </div>
        ) : null}

        {loadState.kind === "empty" ? (
          <div className={styles.stateBox} role="status">
            {debouncedQuery
              ? "Никого не найдено по этому запросу"
              : "Клиентов пока нет"}
          </div>
        ) : null}

        {loadState.kind === "ready" ? (
          <>
            <div
              className={styles.tableWrap}
              data-mode={viewMode}
              data-testid="clients-table"
            >
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Клиент</th>
                    <th scope="col">Город</th>
                    <th scope="col">Статус</th>
                    <th scope="col">Регистрация</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <div className={styles.clientName}>
                          <strong>{client.displayName}</strong>
                          <small>{client.publicId}</small>
                        </div>
                      </td>
                      <td>{client.city ?? "—"}</td>
                      <td>
                        <StatusPill client={client} />
                      </td>
                      <td>{formatClientRegisteredAt(client.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              className={styles.cards}
              data-mode={viewMode}
              data-testid="clients-cards"
              aria-label="Карточки клиентов"
            >
              {data.users.map((client) => (
                <article className={styles.card} key={client.id}>
                  <div className={styles.cardTop}>
                    <div className={styles.cardTopMain}>
                      <ClientAvatar client={client} />
                      <div className={styles.clientName}>
                        <strong>{client.displayName}</strong>
                        <small>
                          {client.publicId}
                          {client.city ? ` · ${client.city}` : ""}
                        </small>
                      </div>
                    </div>
                    <StatusPill client={client} />
                  </div>
                  <div className={styles.cardMeta}>
                    <span>Регистрация</span>
                    <span>{formatClientRegisteredAt(client.createdAt)}</span>
                  </div>
                </article>
              ))}
            </div>

            <div className={styles.footer}>
              <span data-testid="clients-range">
                {from}–{to} из {data.total}
              </span>
              <div className={styles.pagination}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  aria-label="Предыдущая страница"
                  disabled={!canPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <Chevron dir="left" />
                </button>
                <span className={styles.pageNum} aria-current="page">
                  {data.page}
                </span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  aria-label="Следующая страница"
                  disabled={!canNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <Chevron dir="right" />
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>

      <p className={styles.helpTip}>
        Поиск на стороне API идёт по displayName. Этапы сделки, партнёр-источник и
        визиты без согласия в этом readonly-блоке не показываются — для них нет
        достоверных полей в ответе role=CLIENT.
      </p>
    </div>
  );
}
