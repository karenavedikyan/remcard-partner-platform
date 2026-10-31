"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import {
  createProfTestUser,
  disableProfTestUser,
  setProfTestPublicCatalogShow,
} from "@/lib/prof-admin-api";
import { Button } from "@/components/ui/Button";
import { adminTestUserPublicCatalogUrl } from "@/lib/admin-test-users-public-link";
import styles from "../admin-test-users.module.css";

type TestUser = {
  id: string;
  publicId: string;
  displayName: string;
  partnerType: string | null;
  partnerActivities: string[];
  profTestDisabledAt: string | null;
  profTestCreatedAt: string | null;
  profTestPublicCatalogAllowed?: boolean;
  catalogStatus?: string | null;
  isPublic?: boolean;
  isBlocked?: boolean;
  organizationsOwned?: Array<{
    id: string;
    name: string;
    catalogStatus: string;
    catalogPublished: boolean;
  }>;
};

const KIND_LABEL: Record<string, string> = {
  agent: "Агент",
  master: "Специалист",
  store: "Магазин",
  company: "Компания",
};

function catalogStatusLabel(item: TestUser): string {
  const org = item.organizationsOwned?.[0];
  const status = org?.catalogStatus ?? item.catalogStatus ?? "DRAFT";
  const map: Record<string, string> = {
    DRAFT: "Черновик",
    PENDING: "На проверке",
    APPROVED: "Одобрен",
    NEEDS_REVISION: "Нужны правки",
    REJECTED: "Отклонён",
  };
  return map[status] ?? status;
}

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
    publicCatalogShow: false,
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
      <p>
        <a href="/admin/access/users">Управление администраторами</a>
        {" — "}
        создание и отключение второго ADMIN (только владелец; не пункт главной навигации).
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
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={form.publicCatalogShow}
            onChange={(e) => setForm((f) => ({ ...f, publicCatalogShow: e.target.checked }))}
          />
          Разрешить показ в каталоге remcard.ru после одобрения
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
              <span> · Тестовый партнёр</span>
              {disabled ? <span> · отключён</span> : null}
              <div className={styles.meta}>
                {item.publicId} · {kindLabel(item)} · Каталог: {catalogStatusLabel(item)}
              </div>
              <div className={styles.meta}>
                Показ на remcard.ru:{" "}
                {item.profTestPublicCatalogAllowed ? "Разрешён" : "Отключён"}
                {adminTestUserPublicCatalogUrl(item) ? (
                  <>
                    {" "}
                    ·{" "}
                    <a href={adminTestUserPublicCatalogUrl(item)!} target="_blank" rel="noreferrer">
                      Публичная карточка
                    </a>
                  </>
                ) : null}
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
                    const allow = !item.profTestPublicCatalogAllowed;
                    const verb = allow ? "Разрешить" : "Отключить";
                    if (
                      !window.confirm(
                        `${verb} показ этого тестового партнёра на remcard.ru? Кабинет и данные сохраняются; скрывается только публичная витрина.`,
                      )
                    ) {
                      return;
                    }
                    setRowBusy(item.id);
                    setError("");
                    try {
                      await setProfTestPublicCatalogShow(item.id, allow);
                      await reload();
                    } catch (caught) {
                      setError(
                        caught instanceof RemcardApiError
                          ? caught.message
                          : "Не удалось изменить показ на сайте",
                      );
                    } finally {
                      setRowBusy(null);
                    }
                  }}
                >
                  {item.profTestPublicCatalogAllowed ? "Скрыть на remcard.ru" : "Разрешить на remcard.ru"}
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
