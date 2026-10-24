"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RemcardApiError } from "@/lib/api-client";
import {
  fetchModerationQueue,
  type ModerationQueueItem,
  type ModerationQueueResponse,
} from "@/lib/prof-admin-moderation-api";
import { moderationCatalogStatusLabel } from "@/lib/prof-admin-moderation-org-display";
import { partnerTypeLabel } from "@/lib/profile-overview-display";
import { Button } from "@/components/ui/Button";
import styles from "./AdminModeration.module.css";

const ENTITY_RU: Record<string, string> = {
  user: "Партнёр",
  organization: "Организация",
  branch: "Филиал",
};

function itemHref(item: ModerationQueueItem, queueQuery: string): string {
  const base =
    item.entityKind === "user"
      ? `/admin/moderation/partners/${item.id}`
      : item.entityKind === "organization"
        ? `/admin/moderation/organizations/${item.id}`
        : `/admin/moderation/organizations/${item.organizationId}?branch=${item.id}`;
  if (!queueQuery) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${queueQuery}`;
}

export function AdminModerationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ModerationQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const q = searchParams.get("q") ?? "";
  const entityKind = searchParams.get("entityKind") ?? "all";
  const testFilter = searchParams.get("testFilter") ?? "all";
  const partnerType = searchParams.get("partnerType") ?? "all";
  const status = searchParams.get("status") ?? "PENDING";

  const queueQuery = searchParams.toString();

  const queryKey = useMemo(
    () => JSON.stringify({ q, entityKind, testFilter, partnerType, status }),
    [q, entityKind, testFilter, partnerType, status],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchModerationQueue({
        q,
        entityKind,
        testFilter,
        partnerType,
        status,
      });
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof RemcardApiError ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [q, entityKind, testFilter, partnerType, status]);

  useEffect(() => {
    void load();
  }, [queryKey, load]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    router.push(`/admin/moderation?${next.toString()}`);
  };

  const pendingTotal = loading ? null : (data?.counts.totalPending ?? 0);

  const renderRow = (item: ModerationQueueItem) => (
    <>
      <Link href={itemHref(item, queueQuery)}>{item.title}</Link>
      {item.isTestPartner ? <span className={styles.badgeTest}>TEST</span> : null}
      {item.publicId ? <div className={styles.subMeta}>{item.publicId}</div> : null}
      {item.entityKind === "branch" && item.organizationName ? (
        <div className={styles.subMeta}>{item.organizationName}</div>
      ) : null}
    </>
  );

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Модерация каталога</h1>
      <p className={styles.summary}>
        Ожидает решения:{" "}
        <strong>{pendingTotal === null ? "…" : pendingTotal}</strong>
        {data ? (
          <>
            {" "}
            (партнёры {data.counts.users}, организации {data.counts.organizations}, филиалы{" "}
            {data.counts.branches})
          </>
        ) : loading ? (
          " — загрузка…"
        ) : null}
      </p>

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          type="search"
          placeholder="Поиск по имени или ID"
          defaultValue={q}
          onKeyDown={(e) => {
            if (e.key === "Enter") setParam("q", (e.target as HTMLInputElement).value.trim());
          }}
        />
        <select className={styles.select} value={entityKind} onChange={(e) => setParam("entityKind", e.target.value)}>
          <option value="all">Все типы</option>
          <option value="user">Партнёры</option>
          <option value="organization">Организации</option>
          <option value="branch">Филиалы</option>
        </select>
        <select className={styles.select} value={partnerType} onChange={(e) => setParam("partnerType", e.target.value)}>
          <option value="all">Все роли</option>
          <option value="MASTER">Специалист</option>
          <option value="STORE">Магазин</option>
          <option value="COMPANY">Компания</option>
        </select>
        <select className={styles.select} value={testFilter} onChange={(e) => setParam("testFilter", e.target.value)}>
          <option value="all">Test + real</option>
          <option value="test">Только test</option>
          <option value="real">Только real</option>
        </select>
        <select className={styles.select} value={status} onChange={(e) => setParam("status", e.target.value)}>
          <option value="PENDING">На проверке</option>
          <option value="NEEDS_REVISION">На доработке</option>
          <option value="REJECTED">Отклонено</option>
          <option value="APPROVED">Одобрено</option>
        </select>
        <Button type="button" variant="secondary" onClick={() => void load()}>
          Обновить
        </Button>
      </div>

      {loading ? <p>Загрузка…</p> : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && data?.items.length === 0 ? (
        <p className={styles.empty}>Заявок по фильтру нет.</p>
      ) : null}

      {!loading && !error && data && data.items.length > 0 ? (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Объект</th>
                  <th>Тип</th>
                  <th>Город</th>
                  <th>Статус</th>
                  <th>Обновлено</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={`${item.entityKind}-${item.id}`}>
                    <td>{renderRow(item)}</td>
                    <td>
                      {ENTITY_RU[item.entityKind] ?? item.entityKind}
                      {item.partnerType
                        ? ` · ${partnerTypeLabel(item.partnerType) ?? item.partnerType}`
                        : ""}
                    </td>
                    <td>{item.city ?? "—"}</td>
                    <td>{moderationCatalogStatusLabel(item.catalogStatus)}</td>
                    <td>{new Date(item.updatedAt).toLocaleString("ru-RU")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.cards}>
            {data.items.map((item) => (
              <article
                key={`card-${item.entityKind}-${item.id}`}
                className={styles.card}
                data-testid="moderation-queue-card"
              >
                <div className={styles.cardTitle}>{renderRow(item)}</div>
                <p className={styles.subMeta}>
                  {ENTITY_RU[item.entityKind]} · {moderationCatalogStatusLabel(item.catalogStatus)}
                </p>
                <p className={styles.subMeta}>
                  {item.city ?? "Город не указан"} · {new Date(item.updatedAt).toLocaleString("ru-RU")}
                </p>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
