"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RemcardApiError } from "@/lib/api-client";
import {
  fetchAdminPartnerPartnerships,
  type AdminPartnershipListItem,
} from "@/lib/prof-admin-partners-api";
import styles from "../../AdminPartners.module.css";
import {
  adminPartnershipRecordStatusLabel,
  adminPartnershipStatusFilterLabel,
  adminPartnerPartnershipsDrilldownHref,
  parseAdminPartnershipStatusFilter,
  PARTNERSHIP_STATUS_FILTERS,
} from "../../partnerCollaborationDrilldown";

const PAGE_LIMIT = 25;

function counterpartyKindLabel(kind: AdminPartnershipListItem["partner"]["partnerKind"]): string {
  if (!kind) return "—";
  return (
    { agent: "Агент", specialist: "Специалист", store: "Магазин", company: "Компания" }[kind] ?? "—"
  );
}

function formatPartnershipDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
}

function formatSummaryCount(loading: boolean, error: string | null, value: number | null): string {
  if (loading) return "…";
  if (error) return "—";
  if (value === null) return "—";
  return String(value);
}

type Props = {
  partnerUserId: string;
};

export function AdminPartnerPartnershipsClient({ partnerUserId }: Props) {
  const searchParams = useSearchParams();
  const status = parseAdminPartnershipStatusFilter(searchParams.get("status"));
  const contextName = searchParams.get("contextName")?.trim() || null;

  const [items, setItems] = useState<AdminPartnershipListItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [stackIndex, setStackIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestSeqRef.current += 1;
    };
  }, []);

  useEffect(() => {
    requestSeqRef.current += 1;
    setCursorStack([null]);
    setStackIndex(0);
  }, [partnerUserId, status]);

  const currentCursor = cursorStack[stackIndex] ?? null;

  const runFetch = useCallback(() => {
    const requestId = ++requestSeqRef.current;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const data = await fetchAdminPartnerPartnerships(partnerUserId, {
          status,
          limit: PAGE_LIMIT,
          cursor: currentCursor,
        });
        if (requestId !== requestSeqRef.current || !mountedRef.current) return;
        setItems(data.items);
        setTotal(data.total);
        setNextCursor(data.nextCursor);
      } catch (caught) {
        if (requestId !== requestSeqRef.current || !mountedRef.current) return;
        if (caught instanceof RemcardApiError) {
          setError(caught.message || `Ошибка ${caught.status}`);
        } else if (caught instanceof Error) {
          setError(caught.message);
        } else {
          setError("Не удалось загрузить список партнёрств.");
        }
        setItems([]);
        setTotal(null);
        setNextCursor(null);
      } finally {
        if (requestId === requestSeqRef.current && mountedRef.current) {
          setLoading(false);
        }
      }
    })();
  }, [currentCursor, partnerUserId, status]);

  useEffect(() => {
    runFetch();
  }, [runFetch]);

  const pageFrom = total === 0 || total === null ? 0 : stackIndex * PAGE_LIMIT + 1;
  const pageTo = total === null ? 0 : Math.min(total, (stackIndex + 1) * PAGE_LIMIT);

  const statusTabs = useMemo(
    () =>
      PARTNERSHIP_STATUS_FILTERS.map((filter) => ({
        filter,
        href: adminPartnerPartnershipsDrilldownHref(partnerUserId, filter, { contextName }),
        label: adminPartnershipStatusFilterLabel(filter),
      })),
    [contextName, partnerUserId],
  );

  function goNextPage() {
    if (!nextCursor) return;
    setCursorStack((prev) => {
      const trimmed = prev.slice(0, stackIndex + 1);
      return [...trimmed, nextCursor];
    });
    setStackIndex((i) => i + 1);
  }

  function goPrevPage() {
    if (stackIndex <= 0) return;
    setStackIndex((i) => i - 1);
  }

  const subjectTitle = contextName ?? partnerUserId;
  const selectionTotalLabel = formatSummaryCount(loading, error, total);
  const pageCountLabel = formatSummaryCount(loading, error, loading ? null : items.length);

  return (
    <div className={styles.registry}>
      <div className={styles.heading}>
        <p className={styles.partnershipsBack}>
          <Link href="/admin/partners">← К реестру партнёров</Link>
        </p>
        <h1>Партнёрства: {subjectTitle}</h1>
        <p className={styles.partnershipsLead}>
          Контрагенты по выбранному статусу договора. Счётчик в реестре сверяется с фильтром{" "}
          <strong>{adminPartnershipStatusFilterLabel(status)}</strong>.
        </p>
        <p data-testid="partnerships-selection-summary">
          В выборке: {selectionTotalLabel} · на странице: {pageCountLabel}
          {total !== null && total > 0 && !loading && !error ? ` · показаны ${pageFrom}–${pageTo}` : null}
        </p>
      </div>

      <nav className={styles.partnershipsStatusNav} aria-label="Фильтр статуса партнёрства">
        {statusTabs.map((tab) => (
          <Link
            key={tab.filter}
            href={tab.href}
            className={tab.filter === status ? styles.partnershipsStatusActive : styles.partnershipsStatusLink}
            aria-current={tab.filter === status ? "page" : undefined}
            replace
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {error ? (
        <div className={styles.partnershipsState} role="alert">
          <p>{error}</p>
          <button type="button" className={styles.partnershipsRetry} onClick={runFetch}>
            Повторить
          </button>
        </div>
      ) : null}

      {!error && loading ? (
        <p className={styles.partnershipsState} aria-live="polite">
          Загрузка списка…
        </p>
      ) : null}

      {!error && !loading && total === 0 ? (
        <p className={styles.partnershipsState} role="status">
          По статусу «{adminPartnershipStatusFilterLabel(status)}» записей нет. Это может означать ноль связей, а не
          ошибку загрузки.
        </p>
      ) : null}

      {!error && !loading && items.length > 0 ? (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table} aria-label="Список партнёрств">
              <thead>
                <tr>
                  <th>Контрагент</th>
                  <th>Тип</th>
                  <th>Город</th>
                  <th>Статус договора</th>
                  <th>Обновлено</th>
                  <th>Профиль</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.partner.displayName ?? item.partner.id}</td>
                    <td>{counterpartyKindLabel(item.partner.partnerKind)}</td>
                    <td>{item.partner.city ?? "—"}</td>
                    <td>{adminPartnershipRecordStatusLabel(String(item.status))}</td>
                    <td>{formatPartnershipDate(item.updatedAt)}</td>
                    <td>
                      <Link
                        href={`/admin/moderation/partners/${encodeURIComponent(item.partner.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Открыть профиль
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <button type="button" disabled={stackIndex <= 0 || loading} onClick={goPrevPage}>
              Назад
            </button>
            <span>
              Страница {stackIndex + 1}
              {nextCursor ? "+" : ""}
            </span>
            <button type="button" disabled={!nextCursor || loading} onClick={goNextPage}>
              Дальше
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
