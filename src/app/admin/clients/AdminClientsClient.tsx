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
  labelClientRollingDays,
  resolveAdminClientsRegistrationRange,
  type AdminClient,
  type AdminClientPeriod,
  type AdminClientRollingDays,
  type AdminClientsListResponse,
  type AdminClientsRegistrationRange,
} from "@/lib/prof-admin-clients-api";
import { AdminClientDetailDrawer } from "./AdminClientDetailDrawer";
import {
  buildAdminClientsCsv,
  buildAdminClientsExportFilename,
  collectAdminClientsForExport,
  downloadAdminClientsCsv,
  type AdminClientsExportProgress,
} from "./adminClientsExport";
import styles from "./AdminClients.r1.module.css";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "empty" }
  | { kind: "forbidden" }
  | { kind: "unauthorized" }
  | { kind: "error"; message: string };

type ViewMode = "cards" | "list";

/** UI period key — rolling 7/30/90 capture stable MSK registration endpoints once. */
type PeriodFilterKey = AdminClientPeriod | "7d" | "30d" | "90d";

function rollingDaysFromKey(key: PeriodFilterKey): AdminClientRollingDays | null {
  if (key === "7d") return 7;
  if (key === "30d") return 30;
  if (key === "90d") return 90;
  return null;
}

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

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type ExportUiState =
  | { kind: "idle" }
  | { kind: "running"; progress: AdminClientsExportProgress }
  | { kind: "error"; message: string }
  | { kind: "cancelled" }
  | { kind: "done"; count: number; filename: string };

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

function displayClientName(client: AdminClient): string {
  const name = client.displayName?.trim();
  return name ? name : "—";
}

function displayClientCity(client: AdminClient): string {
  const city = client.city?.trim();
  return city ? city : "—";
}

/** Honest unavailable cell — never fill with registration/funnel/profile values. */
function GapCell({ label }: { label: string }) {
  return (
    <span
      className={styles.gapCell}
      title={`${label} пока не отображается`}
      aria-label={`${label}: пока нет`}
    >
      —
    </span>
  );
}

function BlockedPill({ client }: { client: AdminClient }) {
  if (!client.isBlocked) return null;
  return <span className={`${styles.pill} ${styles.pillBlocked}`}>Заблокирован</span>;
}

function ClientIdentity({ client }: { client: AdminClient }) {
  const name = displayClientName(client);
  const city = displayClientCity(client);
  return (
    <div className={styles.clientName}>
      <strong title={name} data-testid="client-name">
        {name}
      </strong>
      {/* publicId and city stay on separate lines so a long id never clamps the city away */}
      <small className={styles.clientPublicId} title={client.publicId} data-testid="client-public-id">
        {client.publicId}
      </small>
      <small className={styles.clientCity} title={city} data-testid="client-city">
        {city}
      </small>
    </div>
  );
}

const EMPTY: AdminClientsListResponse = {
  users: [],
  total: 0,
  page: 1,
  totalPages: 1,
  funnel: null,
};

export function AdminClientsClient() {
  const titleId = useId();
  const searchId = useId();
  const periodId = useId();
  const [data, setData] = useState<AdminClientsListResponse>(EMPTY);
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [periodKey, setPeriodKey] = useState<PeriodFilterKey>("all");
  /** Stable A22g endpoints for the selected rolling window — never recompute on page/export. */
  const [registrationRange, setRegistrationRange] = useState<AdminClientsRegistrationRange | null>(
    null,
  );
  const [page, setPage] = useState(1);
  // Desktop defaults to table (frozen R1); cards are the narrow breakpoint surface.
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [retryTick, setRetryTick] = useState(0);
  const [detailClient, setDetailClient] = useState<AdminClient | null>(null);
  const [exportUi, setExportUi] = useState<ExportUiState>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);
  const requestSeq = useRef(0);
  const detailReturnFocusRef = useRef<HTMLElement | null>(null);
  const exportReturnFocusRef = useRef<HTMLElement | null>(null);
  const exportDialogRef = useRef<HTMLDialogElement | null>(null);

  function openClientDetail(client: AdminClient, trigger: HTMLElement) {
    detailReturnFocusRef.current = trigger;
    setDetailClient(client);
  }

  function closeClientDetail() {
    setDetailClient(null);
  }

  function cancelExport() {
    exportAbortRef.current?.abort();
  }

  function dismissExportUi() {
    exportAbortRef.current?.abort();
    exportAbortRef.current = null;
    setExportUi({ kind: "idle" });
    const dialog = exportDialogRef.current;
    if (dialog?.open) dialog.close();
    const returnTo = exportReturnFocusRef.current;
    exportReturnFocusRef.current = null;
    if (returnTo && typeof returnTo.focus === "function") {
      window.setTimeout(() => returnTo.focus(), 0);
    }
  }

  async function startExport(trigger: HTMLElement) {
    if (exportUi.kind === "running") return;
    exportReturnFocusRef.current = trigger;
    exportAbortRef.current?.abort();
    const controller = new AbortController();
    exportAbortRef.current = controller;
    setExportUi({
      kind: "running",
      progress: { fetched: 0, total: data.total, page: 0, totalPages: 1 },
    });

    const legacyPeriod: AdminClientPeriod =
      registrationRange || periodKey === "7d" || periodKey === "30d" || periodKey === "90d"
        ? "all"
        : (periodKey as AdminClientPeriod);
    const result = await collectAdminClientsForExport({
      search: debouncedQuery,
      period: legacyPeriod,
      createdFrom: registrationRange?.createdFrom,
      createdTo: registrationRange?.createdTo,
      signal: controller.signal,
      onProgress: (progress) => {
        if (controller.signal.aborted) return;
        setExportUi({ kind: "running", progress });
      },
    });

    if (controller.signal.aborted || (!result.ok && result.reason === "cancelled")) {
      setExportUi({ kind: "cancelled" });
      return;
    }
    if (!result.ok) {
      setExportUi({ kind: "error", message: result.message });
      return;
    }

    const filename = buildAdminClientsExportFilename({
      search: debouncedQuery,
      period: legacyPeriod,
      createdFrom: registrationRange?.createdFrom,
      createdTo: registrationRange?.createdTo,
    });
    try {
      const csv = buildAdminClientsCsv(result.clients);
      downloadAdminClientsCsv(csv, filename);
      setExportUi({ kind: "done", count: result.clients.length, filename });
    } catch (caught) {
      const message =
        caught instanceof Error && caught.message
          ? caught.message
          : "Не удалось сохранить файл выгрузки.";
      setExportUi({ kind: "error", message });
    }
  }

  useEffect(() => {
    const dialog = exportDialogRef.current;
    if (!dialog) return;
    if (exportUi.kind === "idle") {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute("open", "");
      }
    }
  }, [exportUi.kind]);

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
        const legacyPeriod: AdminClientPeriod = registrationRange
          ? "all"
          : periodKey === "7d" || periodKey === "30d" || periodKey === "90d"
            ? "all"
            : (periodKey as AdminClientPeriod);
        const res = await fetchAdminClients({
          page,
          limit: ADMIN_CLIENTS_DEFAULT_LIMIT,
          search: debouncedQuery,
          period: legacyPeriod,
          createdFrom: registrationRange?.createdFrom,
          createdTo: registrationRange?.createdTo,
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
  }, [page, debouncedQuery, periodKey, registrationRange, retryTick]);

  function retry() {
    setRetryTick((n) => n + 1);
  }

  function onPeriodChange(next: PeriodFilterKey) {
    setPeriodKey(next);
    setPage(1);
    const days = rollingDaysFromKey(next);
    // Capture endpoints once at selection — table pages + CSV reuse this snapshot.
    setRegistrationRange(days ? resolveAdminClientsRegistrationRange(days) : null);
    // Drop previous window rows/total immediately so the new label never paints
    // stale counts (requestSeq still ignores late responses after the fetch).
    setData(EMPTY);
    setLoadState({ kind: "loading" });
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
  const showList = loadState.kind === "ready" || (loadState.kind === "loading" && data.users.length > 0);
  // All-time CLIENT base from response funnel.registered — panel itself removed (not in frozen).
  const baseCount = data.funnel?.registered ?? null;
  const periodMatched = periodKey !== "all";
  const periodLabel = registrationRange
    ? `${labelClientRollingDays(registrationRange.days)} (${registrationRange.mskFrom}–${registrationRange.mskTo} MSK)`
    : labelClientPeriod(periodKey as AdminClientPeriod);
  // While the new window is loading after a clear, do not invent a zero as “новые”.
  const periodKpiValue =
    periodMatched && loadState.kind === "loading" && data.users.length === 0 ? "—" : periodMatched ? beTotal : "—";

  const exportBusy = exportUi.kind === "running";

  return (
    <div className={styles.page} aria-labelledby={titleId} data-admin-clients="a21j">
      <header className={styles.pageHead}>
        <div className={styles.pageHeadCopy}>
          <h1 id={titleId} className={styles.pageTitle}>
            Клиенты
          </h1>
          <p className={styles.pageLead}>
            Клиентская база RemCard — только для просмотра. Найдите клиента по имени или выберите
            период регистрации.
          </p>
        </div>
        <div className={styles.headActions}>
          <button
            type="button"
            className={styles.exportBtn}
            data-testid="clients-export"
            data-action="export"
            aria-label="Выгрузить клиентов в CSV"
            disabled={
              exportBusy ||
              loadState.kind === "forbidden" ||
              loadState.kind === "unauthorized"
            }
            onClick={(e) => {
              void startExport(e.currentTarget);
            }}
          >
            <DownloadIcon />
            Выгрузить
          </button>
        </div>
      </header>

      <div className={styles.kpis} aria-label="Сводка по клиентам">
        <div className={styles.kpi} data-testid="clients-kpi-base">
          <strong data-testid="clients-total">{baseCount ?? "—"}</strong>
          <span className={styles.kpiLabel}>Клиентов в базе</span>
          <small>Все клиенты RemCard</small>
        </div>
        <div className={styles.kpi} data-testid="clients-kpi-period">
          <strong>{periodKpiValue}</strong>
          <span className={styles.kpiLabel}>Новые за период</span>
          <small>
            {periodMatched ? `Регистрация: ${periodLabel}` : "Выберите период регистрации"}
          </small>
        </div>
        <div className={`${styles.kpi} ${styles.kpiGap}`} data-testid="clients-kpi-orders-gap">
          <strong aria-hidden="true">—</strong>
          <span className={styles.kpiLabel}>С заявками</span>
          <small>Пока нет в данных клиентов</small>
        </div>
        <div className={`${styles.kpi} ${styles.kpiGap}`} data-testid="clients-kpi-deals-gap">
          <strong aria-hidden="true">—</strong>
          <span className={styles.kpiLabel}>Завершённые сделки</span>
          <small>Пока нет в данных клиентов</small>
        </div>
      </div>

      <p className={styles.periodGapNote} data-testid="clients-period-gap">
        Период учитывает дату регистрации клиента, а не его активность. Последние 7 / 30 / 90
        дней включают сегодняшний день и рассчитываются по московскому времени.
      </p>

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
              aria-label="Поиск клиентов по имени"
              data-testid="client-search"
              autoComplete="off"
            />
          </div>
          <select
            id={periodId}
            className={styles.filterSelect}
            value={periodKey}
            aria-label="Период регистрации"
            data-testid="client-period"
            onChange={(e) => onPeriodChange(e.target.value as PeriodFilterKey)}
          >
            <option value="all">Все периоды</option>
            <option value="7d">7 дней</option>
            <option value="30d">30 дней</option>
            <option value="90d">90 дней</option>
            <option value="today">Сегодня (календарь)</option>
            <option value="week">Эта неделя (календарь)</option>
            <option value="month">Этот месяц (календарь)</option>
          </select>
          <span className={styles.countHint} data-testid="clients-count-hint">
            {beTotal} клиентов
          </span>
          <div className={styles.viewToggle} role="group" aria-label="Вид списка">
            <button
              type="button"
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
            >
              Таблица
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "cards"}
              onClick={() => setViewMode("cards")}
            >
              Карточки
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
            {debouncedQuery || periodKey !== "all"
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
                    <th scope="col" className={styles.colClient}>
                      Клиент
                    </th>
                    <th scope="col" className={styles.colGap}>
                      Источник
                    </th>
                    <th scope="col" className={styles.colGap}>
                      Этап
                    </th>
                    <th scope="col" className={styles.colReg}>
                      Регистрация
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <div className={styles.clientCell}>
                          <button
                            type="button"
                            className={styles.openClientBtn}
                            data-testid="open-client"
                            aria-label={`Открыть карточку клиента ${displayClientName(client)}`}
                            onClick={(e) => openClientDetail(client, e.currentTarget)}
                          >
                            <ClientAvatar client={client} />
                            <ClientIdentity client={client} />
                          </button>
                          <BlockedPill client={client} />
                        </div>
                      </td>
                      <td data-testid="clients-source-gap">
                        <GapCell label="Источник рекомендации" />
                      </td>
                      <td data-testid="clients-stage-gap">
                        <GapCell label="Этап сделки" />
                      </td>
                      <td>
                        <span className={styles.regDate}>
                          {formatClientRegisteredAt(client.createdAt)}
                        </span>
                      </td>
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
                    <button
                      type="button"
                      className={`${styles.openClientBtn} ${styles.cardTopMain}`}
                      data-testid="open-client"
                      aria-label={`Открыть карточку клиента ${displayClientName(client)}`}
                      onClick={(e) => openClientDetail(client, e.currentTarget)}
                    >
                      <ClientAvatar client={client} />
                      <ClientIdentity client={client} />
                    </button>
                    <BlockedPill client={client} />
                  </div>
                  <div className={styles.clientSource}>
                    <span className={styles.smallMuted}>Источник рекомендации</span>
                    <GapCell label="Источник рекомендации" />
                  </div>
                  <div className={styles.cardMeta}>
                    <span>Этап сделки</span>
                    <GapCell label="Этап сделки" />
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

      <p className={styles.helpTip} data-testid="clients-help">
        Здесь можно найти клиента и посмотреть сведения о его регистрации. Источник рекомендации,
        этап сделки и история посещений пока не отображаются. Выгрузка содержит только поля этой
        страницы по текущему поиску и периоду — все страницы результата, не только видимые 10.
        Изменение и удаление аккаунтов в этом разделе недоступны.
      </p>

      <dialog
        ref={exportDialogRef}
        className={styles.exportDialog}
        data-testid="clients-export-dialog"
        aria-labelledby="clients-export-title"
        onCancel={(e) => {
          e.preventDefault();
          if (exportUi.kind === "running") {
            cancelExport();
            return;
          }
          dismissExportUi();
        }}
      >
        <div className={styles.exportDialogHead}>
          <h2 id="clients-export-title" className={styles.exportDialogTitle}>
            Выгрузка клиентов
          </h2>
          <button
            type="button"
            className={styles.exportDialogClose}
            aria-label="Закрыть"
            data-testid="clients-export-dismiss"
            onClick={() => {
              if (exportUi.kind === "running") cancelExport();
              else dismissExportUi();
            }}
          >
            ×
          </button>
        </div>
        <div className={styles.exportDialogBody}>
          {exportUi.kind === "running" ? (
            <p role="status" data-testid="clients-export-progress">
              Загрузка {exportUi.progress.fetched}
              {exportUi.progress.total > 0 ? ` из ${exportUi.progress.total}` : ""}…
              {exportUi.progress.page > 0
                ? ` Страница ${exportUi.progress.page} из ${exportUi.progress.totalPages}.`
                : ""}{" "}
              Файл будет сохранён только после полной выгрузки.
            </p>
          ) : null}
          {exportUi.kind === "done" ? (
            <p role="status" data-testid="clients-export-done">
              Готово: {exportUi.count} записей. Файл «{exportUi.filename}». В CSV только ID, имя,
              город, дата регистрации и признак блокировки — без источника, этапа и согласий.
            </p>
          ) : null}
          {exportUi.kind === "cancelled" ? (
            <p role="status" data-testid="clients-export-cancelled">
              Выгрузка отменена. Файл не создан.
            </p>
          ) : null}
          {exportUi.kind === "error" ? (
            <p role="alert" data-testid="clients-export-error">
              {exportUi.message} Файл не создан.
            </p>
          ) : null}
          {exportUi.kind === "idle" ? (
            <p role="status">Подготовка выгрузки…</p>
          ) : null}
        </div>
        <div className={styles.exportDialogFooter}>
          {exportUi.kind === "running" ? (
            <button
              type="button"
              className={styles.exportCancelBtn}
              data-testid="clients-export-cancel"
              onClick={cancelExport}
            >
              Отменить
            </button>
          ) : (
            <button
              type="button"
              className={styles.exportCancelBtn}
              data-testid="clients-export-close"
              onClick={dismissExportUi}
            >
              Закрыть
            </button>
          )}
        </div>
      </dialog>

      <AdminClientDetailDrawer
        client={detailClient}
        onClose={closeClientDetail}
        returnFocusRef={detailReturnFocusRef}
      />
    </div>
  );
}
