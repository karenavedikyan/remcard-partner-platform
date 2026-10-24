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

const PARTNER_TYPE_RU: Record<string, string> = {
  MASTER: "Специалист",
  COMPANY: "Компания",
  STORE: "Магазин",
};

const ENTITY_RU: Record<string, string> = {
  user: "Партнёр",
  organization: "Организация",
  branch: "Филиал",
};

function itemHref(item: ModerationQueueItem): string {
  if (item.entityKind === "user") return `/admin/moderation/partners/${item.id}`;
  if (item.entityKind === "organization") return `/admin/moderation/organizations/${item.id}`;
  return `/admin/moderation/organizations/${item.organizationId}?branch=${item.id}`;
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
    }
    setLoading(false);
  }, [q, entityKind, testFilter, partnerType, status]);

  useEffect(() => {
    void load();
  }, [load, queryKey]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    router.push(`/admin/moderation?${next.toString()}`);
  };

  return (
    <div>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>Модерация каталога</h1>
      <p style={{ color: "#666", marginBottom: "1rem" }}>
        Ожидает решения:{" "}
        <strong>{data?.counts.totalPending ?? "…"}</strong> (партнёры {data?.counts.users ?? "…"},
        организации {data?.counts.organizations ?? "…"}, филиалы {data?.counts.branches ?? "…"})
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          type="search"
          placeholder="Поиск по имени или ID"
          defaultValue={q}
          onKeyDown={(e) => {
            if (e.key === "Enter") setParam("q", (e.target as HTMLInputElement).value.trim());
          }}
          style={{ flex: "1 1 200px", padding: "0.4rem 0.6rem" }}
        />
        <select value={entityKind} onChange={(e) => setParam("entityKind", e.target.value)}>
          <option value="all">Все типы</option>
          <option value="user">Партнёры</option>
          <option value="organization">Организации</option>
          <option value="branch">Филиалы</option>
        </select>
        <select value={partnerType} onChange={(e) => setParam("partnerType", e.target.value)}>
          <option value="all">Все роли</option>
          <option value="MASTER">Специалист</option>
          <option value="STORE">Магазин</option>
          <option value="COMPANY">Компания</option>
        </select>
        <select value={testFilter} onChange={(e) => setParam("testFilter", e.target.value)}>
          <option value="all">Test + real</option>
          <option value="test">Только test</option>
          <option value="real">Только real</option>
        </select>
        <select value={status} onChange={(e) => setParam("status", e.target.value)}>
          <option value="PENDING">Pending</option>
          <option value="NEEDS_REVISION">Needs revision</option>
          <option value="REJECTED">Rejected</option>
          <option value="APPROVED">Approved</option>
        </select>
        <button type="button" onClick={() => void load()}>
          Обновить
        </button>
      </div>

      {loading ? <p>Загрузка…</p> : null}
      {error ? (
        <p role="alert" style={{ color: "#b00020" }}>
          {error}
        </p>
      ) : null}
      {!loading && !error && data?.items.length === 0 ? (
        <p>Заявок по фильтру нет.</p>
      ) : null}

      {!loading && !error && data && data.items.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th style={{ padding: "0.4rem" }}>Объект</th>
              <th>Тип</th>
              <th>Город</th>
              <th>Статус</th>
              <th>Обновлено</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={`${item.entityKind}-${item.id}`} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "0.4rem" }}>
                  <Link href={itemHref(item)}>{item.title}</Link>
                  {item.isTestPartner ? (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: "0.75rem",
                        background: "#fef3c7",
                        padding: "0 4px",
                        borderRadius: 4,
                      }}
                    >
                      TEST
                    </span>
                  ) : null}
                  {item.publicId ? (
                    <div style={{ fontSize: "0.75rem", color: "#666" }}>{item.publicId}</div>
                  ) : null}
                  {item.entityKind === "branch" && item.organizationName ? (
                    <div style={{ fontSize: "0.75rem", color: "#666" }}>{item.organizationName}</div>
                  ) : null}
                </td>
                <td>
                  {ENTITY_RU[item.entityKind] ?? item.entityKind}
                  {item.partnerType ? ` · ${PARTNER_TYPE_RU[item.partnerType] ?? item.partnerType}` : ""}
                </td>
                <td>{item.city ?? "—"}</td>
                <td>{item.catalogStatus}</td>
                <td>{new Date(item.updatedAt).toLocaleString("ru-RU")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
