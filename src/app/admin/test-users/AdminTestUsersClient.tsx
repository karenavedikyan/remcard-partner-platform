"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import { createProfTestUser, disableProfTestUser } from "@/lib/prof-admin-api";
import { Button } from "@/components/ui/Button";
import styles from "../admin-test-users.module.css";

type TestUser = {
  id: string;
  publicId: string;
  displayName: string;
  partnerType: string | null;
  partnerActivities: string[];
  profTestDisabledAt: string | null;
  profTestCreatedAt: string | null;
};

const KIND_LABEL: Record<string, string> = {
  agent: "Агент",
  master: "Специалист",
  store: "Магазин",
  company: "Компания",
};

function kindLabel(item: TestUser) {
  const act = item.partnerActivities?.[0];
  if (act && KIND_LABEL[act.toLowerCase()]) return KIND_LABEL[act.toLowerCase()];
  if (item.partnerType && KIND_LABEL[item.partnerType.toLowerCase()]) {
    return KIND_LABEL[item.partnerType.toLowerCase()];
  }
  return item.partnerActivities?.join(", ") || item.partnerType || "—";
}

export function AdminTestUsersClient() {
  const router = useRouter();
  const [items, setItems] = useState<TestUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | "active" | "disabled">("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [form, setForm] = useState({
    displayName: "Тест · Агент 1",
    kind: "agent" as "agent" | "master" | "store" | "company",
    city: "Краснодар",
  });

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await remcardFetch<{ items: TestUser[] }>("/api/pro/admin/test-users");
      setItems(res.items ?? []);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить список");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (stateFilter === "active" && item.profTestDisabledAt) return false;
      if (stateFilter === "disabled" && !item.profTestDisabledAt) return false;
      if (kindFilter !== "all") {
        const k = kindLabel(item).toLowerCase();
        const want = KIND_LABEL[kindFilter]?.toLowerCase() ?? kindFilter;
        if (!k.includes(want) && !item.partnerActivities?.some((a) => a.toLowerCase() === kindFilter)) {
          return false;
        }
      }
      if (!q) return true;
      return (
        item.displayName.toLowerCase().includes(q) ||
        item.publicId.toLowerCase().includes(q) ||
        kindLabel(item).toLowerCase().includes(q)
      );
    });
  }, [items, query, stateFilter, kindFilter]);

  const create = async () => {
    if (creating) return;
    setCreating(true);
    setError("");
    try {
      await createProfTestUser(form);
      await reload();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось создать");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.shell}>
      <h1>Тестовые пользователи</h1>
      <p>
        Создайте партнёра для изучения ЛК на prof.remcard.ru. Тестовые аккаунты не входят по паролю и не
        привязаны к мессенджерам.
      </p>
      {error ? (
        <p role="alert" className={styles.adminError}>
          {error}
        </p>
      ) : null}

      <section className={styles.panel}>
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Создать</h2>
        <label>
          Имя
          <input value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
        </label>
        <label>
          Тип
          <select
            value={form.kind}
            onChange={(e) => {
              const kind = e.target.value as typeof form.kind;
              setForm((f) => ({
                ...f,
                kind,
                displayName: f.displayName.startsWith("Тест ·") ? `Тест · ${KIND_LABEL[kind] ?? kind}` : f.displayName,
              }));
            }}
          >
            <option value="agent">Агент</option>
            <option value="master">Специалист</option>
            <option value="store">Магазин</option>
            <option value="company">Компания</option>
          </select>
        </label>
        <label>
          Город
          <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
        </label>
        <Button type="button" disabled={creating} onClick={() => void create()}>
          {creating ? "Создание…" : "Создать"}
        </Button>
      </section>

      <div className={styles.filters}>
        <input
          placeholder="Поиск по имени или RC-ID"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Поиск"
        />
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value as typeof stateFilter)}>
          <option value="all">Все состояния</option>
          <option value="active">Активные</option>
          <option value="disabled">Отключённые</option>
        </select>
        <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
          <option value="all">Все типы</option>
          <option value="agent">Агент</option>
          <option value="master">Специалист</option>
          <option value="store">Магазин</option>
          <option value="company">Компания</option>
        </select>
      </div>

      {loading ? <p>Загрузка…</p> : null}
      {!loading && filtered.length === 0 ? <p>Нет пользователей по выбранным фильтрам.</p> : null}

      <ul className={styles.list}>
        {filtered.map((item) => {
          const disabled = Boolean(item.profTestDisabledAt);
          const busy = rowBusy === item.id;
          return (
            <li key={item.id} className={styles.card}>
              <strong>{item.displayName}</strong>
              {disabled ? <span> · отключён</span> : null}
              <div className={styles.meta}>
                {item.publicId} · {kindLabel(item)}
              </div>
              <div className={styles.actions}>
                <Button
                  type="button"
                  disabled={disabled || busy}
                  onClick={async () => {
                    setRowBusy(item.id);
                    setError("");
                    try {
                      await remcardFetch(`/api/pro/admin/test-users/${item.id}/enter`, { method: "POST" });
                      router.push("/profile?section=basics");
                      router.refresh();
                    } catch (caught) {
                      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось открыть ЛК");
                    } finally {
                      setRowBusy(null);
                    }
                  }}
                >
                  {busy ? "…" : "Открыть ЛК"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={async () => {
                    if (!window.confirm("Сбросить профиль и черновик агента?")) return;
                    setRowBusy(item.id);
                    setError("");
                    try {
                      await remcardFetch(`/api/pro/admin/test-users/${item.id}/reset`, { method: "POST" });
                      await reload();
                    } catch (caught) {
                      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сбросить");
                    } finally {
                      setRowBusy(null);
                    }
                  }}
                >
                  Сбросить профиль
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={disabled || busy}
                  onClick={async () => {
                    if (!window.confirm("Отключить тестовый аккаунт?")) return;
                    setRowBusy(item.id);
                    setError("");
                    try {
                      await disableProfTestUser(item.id);
                      await reload();
                    } catch (caught) {
                      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось отключить");
                    } finally {
                      setRowBusy(null);
                    }
                  }}
                >
                  Отключить
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
