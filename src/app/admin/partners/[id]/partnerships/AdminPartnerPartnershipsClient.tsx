"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RemcardApiError } from "@/lib/api-client";
import {
  fetchAdminPartnerPartnerships,
  type AdminPartnershipListItem,
  type AdminPartnershipStatusFilter,
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

type Props = {
  partnerUserId: string;
};

export function AdminPartnerPartnershipsClient({ partnerUserId }: Props) {
  const searchParams = useSearchParams();
  const status = parseAdminPartnershipStatusFilter(searchParams.get("status"));
  const contextName = searchParams.get("contextName")?.trim() || null;

  const [items, setItems] = useState<AdminPartnershipListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [stackIndex, setStackIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setCursorStack([null]);
    setStackIndex(0);
  }, [partnerUserId, status]);

  const currentCursor = cursorStack[stackIndex] ?? null;

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminPartnerPartnerships(partnerUserId, {
        status,
        limit: PAGE_LIMIT,
        cursor: currentCursor,
      });
      if (!mountedRef.current) return;
      setItems(data.items);
      setTotal(data.total);
      setNextCursor(data.nextCursor);
    } catch (caught) {
      if (!mountedRef.current) return;
      if (caught instanceof RemcardApiError) {
        setError(caught.message || `Ошибка ${caught.status}`);
      } else if (caught instanceof Error) {
        setError(caught.message);
      } else {
        setError("Не удалось загрузить список партнёрств.");
      }
      setItems([]);
      setTotal(0);
      setNextCursor(null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [currentCursor, partnerUserId, status]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const pageFrom = total === 0 ? 0 : stackIndex * PAGE_LIMIT + 1;
  const pageTo = Math.min(total, (stackIndex + 1) * PAGE_LIMIT);

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
        <p>
          В выборке: {loading ? "…" : total} · на странице: {loading ? "…" : items.length}
          {total > 0 && !loading ? ` · показаны ${pageFrom}–${pageTo}` : null}
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
          <button type="button" className={styles.partnershipsRetry} onClick={() => void loadPage()}>
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
