"use client";

import { useEffect, useId, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import {
  ADMIN_CLIENTS_DEFAULT_LIMIT,
  clientAvatarUrl,
  clientInitials,
  clientsErrorKind,
  fetchAdminClients,
  formatClientRegisteredAt,
  isAbortError,
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
        <path
          d="M15 6 9 12l6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="m9 6 6 6-6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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

const EMPTY: AdminClientsListResponse = {
  users: [],
  total: 0,
  page: 1,
  totalPages: 1,
};

export function AdminClientsClient() {
  const titleId = useId();
  const searchId = useId();
  const periodId = useId();
  const [data, setData] = useState<AdminClientsListResponse>(EMPTY);
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [period, setPeriod] = useState<AdminClientPeriod>("all");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [retryTick, setRetryTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = query.trim();
      setDebouncedQuery((prev) => {
        if (prev === next) return prev;
        setPage(1);
        return next;
      });
    }, 250);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const seq = ++requestSeq.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoadState({ kind: "loading" });

    void (async () => {
      try {
        const res = await fetchAdminClients({
          page,
          limit: ADMIN_CLIENTS_DEFAULT_LIMIT,
          search: debouncedQuery,
          period,
          signal: controller.signal,
        });
        if (seq !== requestSeq.current) return;
        setData(res);
        setLoadState(res.users.length === 0 ? { kind: "empty" } : { kind: "ready" });
      } catch (caught) {
        if (seq !== requestSeq.current || isAbortError(caught) || controller.signal.aborted) {
          return;
        }
        setData(EMPTY);
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
    })();

    return () => {
      controller.abort();
    };
  }, [page, debouncedQuery, period, retryTick]);

  function retry() {
    setRetryTick((n) => n + 1);
  }

  function onPeriodChange(next: AdminClientPeriod) {
    setPeriod(next);
    setPage(1);
  }

  // Range and footer always use BE total — never users.length as “база”.
  const beTotal = data.total;
  const from = beTotal === 0 || data.users.length === 0 ? 0 : (data.page - 1) * ADMIN_CLIENTS_DEFAULT_LIMIT + 1;
  const to =
    beTotal === 0 || data.users.length === 0
      ? 0
      : Math.min(beTotal, (data.page - 1) * ADMIN_CLIENTS_DEFAULT_LIMIT + data.users.length);
  const canPrev = data.page > 1 && loadState.kind !== "loading";
  const canNext = data.page < data.totalPages && beTotal > 0 && loadState.kind !== "loading";
  const filtered = Boolean(debouncedQuery) || period !== "all";
  const showList = loadState.kind === "ready" || (loadState.kind === "loading" && data.users.length > 0);

  return (
    <div className={styles.page} aria-labelledby={titleId} data-admin-clients="a21b">
      <header className={styles.pageHead}>
        <div className={styles.pageHeadCopy}>
          <h1 id={titleId} className={styles.pageTitle}>
            Клиенты
          </h1>
          <p className={styles.pageLead}>
            Клиентская база RemCard — только для просмотра. Список строится из GET
            /api/admin/users с role=CLIENT. Общий счётчик — BE total текущего запроса, не
            длина страницы.
          </p>
        </div>
      </header>

      <div className={styles.stats} aria-label="Сводка по клиентам">
        <div className={styles.statTile}>
          <strong data-testid="clients-total">{beTotal}</strong>
          <small>
            {filtered
              ? "BE total по текущим search/period"
              : "Клиентов CLIENT (all-time при period=all)"}
          </small>
        </div>
        <div className={styles.statTile}>
          <strong>{labelClientPeriod(period)}</strong>
          <small>Фильтр period регистрации (не KPI обзора)</small>
        </div>
      </div>

      <section
        className={styles.panel}
        aria-label="Список клиентов"
        aria-busy={loadState.kind === "loading"}
      >
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
              autoComplete="off"
            />
          </div>
          <select
            id={periodId}
            className={styles.filterSelect}
            value={period}
            aria-label="Период регистрации"
            data-testid="client-period"
            onChange={(e) => onPeriodChange(e.target.value as AdminClientPeriod)}
          >
            <option value="all">Все периоды</option>
            <option value="today">Сегодня</option>
            <option value="week">Эта неделя</option>
            <option value="month">Этот месяц</option>
          </select>
          <span className={styles.countHint} data-testid="clients-count-hint">
            {beTotal} клиентов
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

        {loadState.kind === "loading" && data.users.length === 0 ? (
          <div className={styles.stateBox} role="status">
            Загрузка клиентов…
          </div>
        ) : null}

        {loadState.kind === "error" ? (
          <div className={styles.stateBox} data-kind="error" role="alert">
            <div>{loadState.message}</div>
            <button type="button" className={styles.retry} onClick={retry}>
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
          <div className={styles.stateBox} role="status" data-testid="clients-empty">
            {debouncedQuery
              ? "Никого не найдено по этому запросу"
              : "Клиентов пока нет"}
          </div>
        ) : null}

        {showList ? (
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
                          <strong title={client.displayName}>{client.displayName}</strong>
                          <small title={client.publicId}>{client.publicId}</small>
                        </div>
                      </td>
                      <td>
                        <span className={styles.cellClamp}>{client.city ?? "—"}</span>
                      </td>
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
                        <strong title={client.displayName}>{client.displayName}</strong>
                        <small title={client.publicId}>
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
                {from}–{to} из {beTotal}
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
        Параметр поиска API — <code>search</code> (не <code>q</code>). Этапы сделки,
        партнёр-источник и визиты без согласия здесь не показываются. Создание / удаление /
        изменение клиента в этом блоке недоступны.
      </p>
    </div>
  );
}
