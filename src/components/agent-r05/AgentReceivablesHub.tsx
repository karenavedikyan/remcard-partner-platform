"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import {
  fetchAgentReceivableOrderDetail,
  fetchAgentReceivableOrders,
  fetchAgentReceivablePartners,
  fetchAgentReceivablesOverview,
  type AgentReceivableOrderLine,
  type AgentReceivablePartnerGroup,
  type AgentReceivableRecord,
  type AgentReceivablesMeta,
  type AgentReceivablesOverview,
} from "@/lib/agent-r05/api";
import { formatKopecks } from "@/lib/agent-r05/money";
import { Button } from "@/components/ui/Button";
import styles from "./agent-receivables.module.css";

type Screen = "overview" | "partners" | "orders" | "order";

type LedgerView = "list" | "small" | "medium" | "large";

const PREFS_KEY = "agent-r05-receivables-prefs";

function loadPrefs(): { view: LedgerView; pageSize: number } {
  if (typeof window === "undefined") return { view: "list", pageSize: 25 };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { view: "list", pageSize: 25 };
    const parsed = JSON.parse(raw) as { view?: LedgerView; pageSize?: number };
    const pageSize = [25, 50, 100].includes(parsed.pageSize ?? 25) ? parsed.pageSize! : 25;
    const view = parsed.view ?? "list";
    return { view, pageSize };
  } catch {
    return { view: "list", pageSize: 25 };
  }
}

function savePrefs(view: LedgerView, pageSize: number) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ view, pageSize }));
  } catch {
    /* ignore */
  }
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildQuery(input: {
  q: string;
  status: string;
  sort: string;
  from: string;
  to: string;
  page: number;
  pageSize: number;
  partnerId?: string | null;
  groupKey?: string | null;
}) {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  params.set("status", input.status);
  params.set("sort", input.sort);
  if (input.from) params.set("from", input.from);
  if (input.to) params.set("to", input.to);
  params.set("page", String(input.page));
  params.set("pageSize", String(input.pageSize));
  if (input.groupKey) params.set("groupKey", input.groupKey);
  else if (input.partnerId) params.set("partnerId", input.partnerId);
  return params;
}

export function AgentReceivablesHub() {
  const [screen, setScreen] = useState<Screen>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<AgentReceivablesOverview | null>(null);
  const [partners, setPartners] = useState<AgentReceivablePartnerGroup[]>([]);
  const [orders, setOrders] = useState<AgentReceivableRecord[]>([]);
  const [meta, setMeta] = useState<AgentReceivablesMeta | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<AgentReceivablePartnerGroup | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<{
    record: AgentReceivableRecord;
    lines: AgentReceivableOrderLine[];
    totalsMismatch: boolean;
    history: { at: string; title: string; note: string | null; amountKopecks: number | null }[];
  } | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("open");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sort, setSort] = useState("debt-desc");
  const [page, setPage] = useState(1);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const reloadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAgentReceivablesOverview();
      setOverview(data);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить кошелёк");
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadPartners = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = buildQuery({
        q,
        status,
        sort,
        from: fromDate,
        to: toDate,
        page,
        pageSize: prefs.pageSize,
      });
      const data = await fetchAgentReceivablePartners(params);
      setPartners(data.partners);
      setMeta(data.meta);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить партнёров");
    } finally {
      setLoading(false);
    }
  }, [fromDate, page, prefs.pageSize, q, sort, status, toDate]);

  const reloadOrders = useCallback(async () => {
    if (!selectedPartner) return;
    setLoading(true);
    setError("");
    try {
      const params = buildQuery({
        q,
        status,
        sort,
        from: fromDate,
        to: toDate,
        page,
        pageSize: prefs.pageSize,
        groupKey: selectedPartner.groupKey,
      });
      const data = await fetchAgentReceivableOrders(params);
      setOrders(data.orders);
      setMeta(data.meta);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить заказы");
    } finally {
      setLoading(false);
    }
  }, [fromDate, page, prefs.pageSize, q, selectedPartner, sort, status, toDate]);

  const reloadOrderDetail = useCallback(async (orderId: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAgentReceivableOrderDetail(orderId);
      setOrderDetail({
        record: data.record,
        lines: data.lines,
        totalsMismatch: data.totalsMismatch,
        history: data.history,
      });
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить заказ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (screen === "overview") void reloadOverview();
  }, [reloadOverview, screen]);

  useEffect(() => {
    if (screen === "partners") void reloadPartners();
  }, [reloadPartners, screen]);

  useEffect(() => {
    if (screen === "orders") void reloadOrders();
  }, [reloadOrders, screen]);

  useEffect(() => {
    if (screen === "order" && selectedOrderId) void reloadOrderDetail(selectedOrderId);
  }, [reloadOrderDetail, screen, selectedOrderId]);

  const cabinetTotalLabel = useMemo(
    () => formatKopecks(overview?.confirmedTotalKopecks ?? 0),
    [overview?.confirmedTotalKopecks],
  );

  const selectionTotalLabel = useMemo(
    () => formatKopecks(meta?.selectionTotalKopecks ?? overview?.confirmedTotalKopecks ?? 0),
    [meta?.selectionTotalKopecks, overview?.confirmedTotalKopecks],
  );

  function onViewChange(view: LedgerView) {
    const next = { ...prefs, view };
    setPrefs(next);
    savePrefs(next.view, next.pageSize);
  }

  function onPageSizeChange(size: number) {
    const next = { ...prefs, pageSize: size };
    setPrefs(next);
    savePrefs(next.view, next.pageSize);
    setPage(1);
  }

  const filterBlock = (
    <details
      className={styles.filters}
      aria-label="Поиск и фильтры"
      open={filtersOpen}
      onToggle={(e) => setFiltersOpen(e.currentTarget.open)}
    >
      <summary>Поиск и фильтры</summary>
      <label className={styles.field}>
        <span>{screen === "partners" ? "Найти партнёра, заказ, сертификат или категорию" : "Найти заказ, сертификат, клиента или категорию"}</span>
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Название, номер, категория"
          data-testid="ledger-search"
        />
      </label>
      <div className={styles.filterGrid}>
          <label className={styles.field}>
            <span>Период (UTC, дата покупки)</span>
            <div className={styles.dateRange}>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                data-testid="ledger-from"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                data-testid="ledger-to"
              />
            </div>
          </label>
          <label className={styles.field}>
            <span>Состояние</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              data-testid="ledger-status"
            >
              <option value="open">Открытые долги</option>
              <option value="pending">Не согласовано</option>
              <option value="closed">Закрытые и отменённые</option>
              <option value="needs_review">Требует уточнения</option>
              <option value="all">Вся история</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Сортировка</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              data-testid="ledger-sort"
            >
              <option value="debt-desc">Крупные долги</option>
              <option value="name">По имени партнёра</option>
              <option value="due-asc">По дате покупки (раньше → позже)</option>
            </select>
          </label>
      </div>
    </details>
  );

  const viewControl = (
    <div className={styles.presentation}>
      <label className={styles.field}>
        <span>Вид данных</span>
        <select
          value={prefs.view}
          onChange={(e) => onViewChange(e.target.value as LedgerView)}
          data-testid="ledger-view"
        >
          <option value="list">Строки</option>
          <option value="small">Малые карточки</option>
          <option value="medium">Средние карточки</option>
          <option value="large">Крупные карточки</option>
        </select>
      </label>
    </div>
  );

  const pagination =
    meta && meta.pageCount > 1 ? (
      <div className={styles.pagination} data-testid="ledger-pagination">
        <span>
          {(meta.page - 1) * meta.pageSize + 1}–
          {Math.min(meta.page * meta.pageSize, meta.totalRecords)} из {meta.totalRecords}
        </span>
        <label className={styles.field}>
          <span>На странице</span>
          <select
            value={meta.pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            data-testid="ledger-page-size"
          >
            {[25, 50, 100].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          variant="secondary"
          disabled={meta.page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Назад
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={meta.page >= meta.pageCount}
          onClick={() => setPage((p) => p + 1)}
        >
          Далее
        </Button>
      </div>
    ) : null;

  if (screen === "overview") {
    return (
      <div
        className={styles.shell}
        data-ledger-view={prefs.view}
        data-testid="agent-r05-receivables"
      >
        {viewControl}
        <p className={styles.muted}>Выберите сумму, чтобы увидеть партнёров.</p>
        {error ? (
          <p className={styles.error} role="alert">
            {error}{" "}
            <Button type="button" onClick={() => void reloadOverview()}>
              Повторить
            </Button>
          </p>
        ) : null}
        {loading && !overview ? <p className={styles.meta}>Загружаем…</p> : null}
        {overview ? (
          <>
            <div className={styles.overviewGrid}>
              <button
                type="button"
                className={styles.totalTile}
                data-testid="agent-r05-incoming-tile"
                onClick={() => {
                  setScreen("partners");
                  setPage(1);
                }}
              >
                <span>Мне должны</span>
                <strong>{formatKopecks(overview.confirmedTotalKopecks)}</strong>
                <small>
                  Посмотреть партнёров <span aria-hidden="true">→</span>
                </small>
              </button>
            </div>
            <details className={styles.helpNote}>
              <summary>Справка по кошельку</summary>
              <p className={styles.muted}>
                {overview.openCount} открытых · {overview.pendingCount} ожидают согласования.
                {overview.coverage.needsReviewCount > 0
                  ? ` ${overview.coverage.needsReviewCount} записей требуют уточнения и не входят в подтверждённый итог.`
                  : ""}
              </p>
            </details>
          </>
        ) : null}
      </div>
    );
  }

  if (screen === "partners") {
    return (
      <div className={styles.shell} data-ledger-view={prefs.view} data-testid="agent-r05-partners">
        <div className={styles.breadcrumb}>
          <button type="button" className={styles.backBtn} onClick={() => setScreen("overview")}>
            ← Все взаиморасчёты
          </button>
        </div>
        <div className={styles.focusHeader}>
          <div>
            <span className={styles.focusHeaderLabel}>Мне должны</span>
            <h2>Партнёры</h2>
          </div>
          <strong data-testid="ledger-totals">{selectionTotalLabel}</strong>
        </div>
        {viewControl}
        {filterBlock}
        <p className={styles.selectionFootnote}>
          Подтверждённый итог кабинета: {cabinetTotalLabel}
          {meta ? ` · в выборке ${meta.totalRecords} записей` : ""}
        </p>
        {error ? (
          <p className={styles.error} role="alert">
            {error}{" "}
            <Button type="button" onClick={() => void reloadPartners()}>
              Повторить
            </Button>
          </p>
        ) : null}
        {loading ? <p className={styles.meta}>Загружаем партнёров…</p> : null}
        {!loading && partners.length === 0 ? (
          <p className={styles.meta}>По выбранным фильтрам открытых долгов нет.</p>
        ) : null}
        <div className={styles.ledgerGrid} data-testid="ledger-partners">
          {partners.map((partner) => (
            <button
              key={partner.groupKey}
              type="button"
              className={styles.partnerCompact}
              data-testid="agent-r05-partner-row"
              onClick={() => {
                setSelectedPartner(partner);
                setScreen("orders");
                setPage(1);
              }}
            >
              <span>
                <strong className={styles.partnerTitle}>{partner.displayName}</strong>
                <small className={styles.legalCaption}>{partner.legalCaption}</small>
                <small className={styles.partnerMeta}>
                  {partner.referenceOrderCount} заказ
                  {partner.referenceOrderCount === 1
                    ? ""
                    : partner.referenceOrderCount < 5
                      ? "а"
                      : "ов"}
                  {partner.legalSideCount > 1 ? ` · сторон: ${partner.legalSideCount}` : ""}
                </small>
                <small className={styles.cardExtra}>
                  Первая покупка:{" "}
                  {partner.earliestPurchaseAt ? formatWhen(partner.earliestPurchaseAt) : "—"}
                </small>
              </span>
              <span className={styles.partnerNumber}>
                <strong>{formatKopecks(partner.confirmedDebtKopecks)}</strong>
                <span aria-hidden="true">›</span>
              </span>
            </button>
          ))}
        </div>
        {pagination}
      </div>
    );
  }

  if (screen === "orders" && selectedPartner) {
    return (
      <div className={styles.shell} data-ledger-view={prefs.view} data-testid="agent-r05-orders">
        <div className={styles.breadcrumb}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => {
              setScreen("partners");
              setSelectedPartner(null);
            }}
          >
            ← К партнёрам
          </button>
        </div>
        <div className={styles.focusHeader}>
          <div>
            <span className={styles.focusHeaderLabel}>Мне должны</span>
            <h2>{selectedPartner.displayName}</h2>
          </div>
          <strong>{formatKopecks(selectedPartner.confirmedDebtKopecks)}</strong>
        </div>
        {viewControl}
        {filterBlock}
        {error ? (
          <p className={styles.error} role="alert">
            {error}{" "}
            <Button type="button" onClick={() => void reloadOrders()}>
              Повторить
            </Button>
          </p>
        ) : null}
        <div className={styles.ledgerGrid}>
          {orders.map((order) => (
            <article key={order.accrualId} className={styles.orderCard} data-testid="agent-r05-order-card">
              <details
                open={expandedOrderId === order.orderId}
                onToggle={(e) =>
                  setExpandedOrderId(e.currentTarget.open ? order.orderId : null)
                }
              >
                <summary data-testid="agent-r05-order-summary">
                  <span className={styles.lineInfo}>
                    <strong>Заказ {order.orderNumber}</strong>
                    <span className={styles.meta}>{order.clientLabel ?? "Клиент не указан"}</span>
                    <small className={styles.legalCaption}>{order.partnerLegal.name}</small>
                    <small className={styles.meta}>
                      {order.certificateDisplayCode
                        ? `Сертификат ${order.certificateDisplayCode}`
                        : "Сертификат —"}
                    </small>
                    <small className={styles.cardExtra}>
                      Покупка: {formatWhen(order.purchaseAt)} · срок выплаты: {order.dueLabel}
                    </small>
                  </span>
                  <span className={styles.lineValue}>
                    <strong>{formatKopecks(order.remainingKopecks || order.obligationKopecks)}</strong>
                  </span>
                </summary>
                <div className={styles.orderBody}>
                  {order.needsReviewReason ? (
                    <p className={styles.error}>Требует уточнения: {order.needsReviewReason}</p>
                  ) : null}
                  <div className={styles.backRow}>
                    <Link href={`/history/purchases/${encodeURIComponent(order.orderId)}`}>
                      Открыть покупку
                    </Link>
                    <Link href={`/certificates/${encodeURIComponent(order.certificateId)}`}>
                      Сертификат
                    </Link>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setSelectedOrderId(order.orderId);
                        setScreen("order");
                      }}
                    >
                      Подробности
                    </Button>
                  </div>
                </div>
              </details>
            </article>
          ))}
        </div>
        {pagination}
      </div>
    );
  }

  if (screen === "order" && orderDetail) {
    const { record, lines, totalsMismatch, history } = orderDetail;
    return (
      <div className={styles.shell} data-testid="agent-r05-order-detail">
        <div className={styles.backRow}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => {
              setScreen("orders");
              setOrderDetail(null);
            }}
          >
            ← Заказы партнёра
          </button>
        </div>
        <div className={styles.focusHeader}>
          <div>
            <span className={styles.focusHeaderLabel}>Заказ</span>
            <h2>{record.orderNumber}</h2>
          </div>
          <strong>{formatKopecks(record.remainingKopecks || record.obligationKopecks)}</strong>
        </div>
        <p className={styles.meta}>{record.partnerLegal.name}</p>
        <dl className={styles.breakdown}>
          <div>
            <dt>Клиент</dt>
            <dd>{record.clientLabel ?? "—"}</dd>
          </div>
          <div>
            <dt>Сертификат</dt>
            <dd>{record.certificateDisplayCode ?? "—"}</dd>
          </div>
          <div>
            <dt>Покупка</dt>
            <dd>{formatWhen(record.purchaseAt)}</dd>
          </div>
          <div>
            <dt>Срок выплаты</dt>
            <dd>{record.dueLabel}</dd>
          </div>
        </dl>
        {record.partnerLegal.missingHistoricalNote ? (
          <p className={styles.coverage} role="status">
            {record.partnerLegal.missingHistoricalNote}
          </p>
        ) : null}
        {record.partnerLegal.currentProfileCaption ? (
          <p className={styles.coverage}>{record.partnerLegal.currentProfileCaption}</p>
        ) : null}
        {totalsMismatch ? (
          <p className={styles.error} role="alert">
            Сумма строк заказа не совпадает с начислением — показаны обе величины.
          </p>
        ) : null}
        <details open>
          <summary>Категории, скидки и вознаграждение</summary>
          <table className={styles.lineTable}>
            <thead>
              <tr>
                <th>Категория</th>
                <th>До скидки</th>
                <th>Скидка</th>
                <th>После скидки</th>
                <th>Ставка</th>
                <th>Вознаграждение</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.category}>
                  <td>{line.categoryLabel}</td>
                  <td>{formatKopecks(line.amountBeforeDiscountKopecks)}</td>
                  <td>
                    {line.discountPercent}% ({formatKopecks(line.discountKopecks)})
                  </td>
                  <td>{formatKopecks(line.afterDiscountKopecks)}</td>
                  <td>{line.ratePercent != null ? `${line.ratePercent}%` : "—"}</td>
                  <td>{line.rewardKopecks != null ? formatKopecks(line.rewardKopecks) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        <ol className={styles.timeline}>
          {history.map((event) => (
            <li key={`${event.at}-${event.title}`}>
              <strong>{event.title}</strong>
              {event.amountKopecks != null ? ` · ${formatKopecks(event.amountKopecks)}` : ""}
              <div className={styles.meta}>
                {formatWhen(event.at)}
                {event.note ? ` · ${event.note}` : ""}
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return null;
}
