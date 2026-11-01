"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import {
  createProfTestUser,
  disableProfTestUser,
  setProfTestPublicCatalogShow,
} from "@/lib/prof-admin-api";
import { Button } from "@/components/ui/Button";
import { adminTestUserPublicCatalogUrl } from "@/lib/admin-test-users-public-link";
import {
  PROF_TEST_USER_KIND_LABEL,
  filterProfTestUsers,
  profTestUserKindLabel,
  type ProfTestUserCreateKind,
} from "./adminTestUserKind";
import styles from "../admin-test-users.module.css";
import { adminTestUserCreateError } from "./adminTestUserCreateError";

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

export function AdminTestUsersClient() {
  const router = useRouter();
  const createGenRef = useRef(0);
  const [items, setItems] = useState<TestUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | "active" | "disabled">("all");
  const [kindFilter, setKindFilter] = useState<"all" | ProfTestUserCreateKind>("all");
  const [form, setForm] = useState({
    displayName: "Тест · Агент 1",
    kind: "agent" as ProfTestUserCreateKind,
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

  const filtered = useMemo(
    () => filterProfTestUsers(items, { query, stateFilter, kindFilter }),
    [items, query, stateFilter, kindFilter],
  );

  const filtersActive = query.trim() !== "" || stateFilter !== "all" || kindFilter !== "all";

  const clearFilters = () => {
    setQuery("");
    setStateFilter("all");
    setKindFilter("all");
  };

  const create = async () => {
    if (creating) return;
    const gen = ++createGenRef.current;
    const submitted = { ...form };
    setCreating(true);
    setError("");
    try {
      await createProfTestUser(submitted);
      if (gen !== createGenRef.current) return;
      await reload();
    } catch (caught) {
      if (gen === createGenRef.current) {
        setForm(submitted);
        setError(adminTestUserCreateError(caught instanceof RemcardApiError ? caught.message : null));
      }
    } finally {
      if (gen === createGenRef.current) setCreating(false);
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
          <input
            value={form.displayName}
            disabled={creating}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
          />
        </label>
        <label>
          Тип
          <select
            value={form.kind}
            disabled={creating}
            onChange={(e) => {
              const kind = e.target.value as typeof form.kind;
              setForm((f) => ({
                ...f,
                kind,
                displayName: f.displayName.startsWith("Тест ·")
                  ? `Тест · ${PROF_TEST_USER_KIND_LABEL[kind] ?? kind}`
                  : f.displayName,
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
          <input
            value={form.city}
            disabled={creating}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
        </label>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={form.publicCatalogShow}
            disabled={creating}
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
        <select
          value={stateFilter}
          aria-label="Состояние тестового пользователя"
          onChange={(e) => setStateFilter(e.target.value as typeof stateFilter)}
        >
          <option value="all">Все состояния</option>
          <option value="active">Активные</option>
          <option value="disabled">Отключённые</option>
        </select>
        <select
          value={kindFilter}
          aria-label="Тип партнёра"
          onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
        >
          <option value="all">Все типы</option>
          <option value="agent">Агент</option>
          <option value="master">Специалист</option>
          <option value="store">Магазин</option>
          <option value="company">Компания</option>
        </select>
        {filtersActive ? (
          <Button type="button" variant="secondary" onClick={clearFilters}>
            Сбросить фильтры
          </Button>
        ) : null}
      </div>

      {loading ? <p>Загрузка…</p> : null}
      {!loading && items.length === 0 ? <p>Тестовых пользователей пока нет.</p> : null}
      {!loading && items.length > 0 && filtered.length === 0 ? (
        <p>Нет пользователей по выбранным фильтрам.</p>
      ) : null}

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
                {item.publicId} · {profTestUserKindLabel(item)} · Каталог: {catalogStatusLabel(item)}
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
