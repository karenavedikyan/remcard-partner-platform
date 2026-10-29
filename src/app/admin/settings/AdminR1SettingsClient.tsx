"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchAdminR1Journal,
  formatAdminR1Date,
  type AdminR1JournalItem,
} from "@/lib/admin-r1/api";

type Tab = "types" | "releases" | "audit";

const ENABLED_TYPES = [
  { id: "agent", name: "Агенты" },
  { id: "specialist", name: "Специалисты" },
  { id: "store", name: "Магазины" },
  { id: "company", name: "Компании" },
] as const;

export function AdminR1SettingsClient() {
  const [tab, setTab] = useState<Tab>("types");
  const [page, setPage] = useState(1);
  const pageSize = 40;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AdminR1JournalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (tab !== "audit") return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAdminR1Journal(
          new URLSearchParams({ page: String(page), pageSize: String(pageSize) }),
        );
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
        setNote(data.definitions.note);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Журнал недоступен");
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tab, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div data-testid="admin-r1-settings">
      <div className="r1Subtabs" role="tablist">
        <button
          type="button"
          className={tab === "types" ? "active" : undefined}
          onClick={() => setTab("types")}
        >
          Типы партнёров
        </button>
        <button
          type="button"
          className={tab === "releases" ? "active" : undefined}
          onClick={() => setTab("releases")}
        >
          Релизы и развитие
        </button>
        <button
          type="button"
          className={tab === "audit" ? "active" : undefined}
          onClick={() => setTab("audit")}
        >
          Журнал действий
        </button>
      </div>

      {tab === "types" ? (
        <div className="r1Panel">
          <div className="r1PanelHead">
            <div>
              <h2>Направления проекта</h2>
              <small className="r1Muted">Четыре canonical типа · без фабрик/застройщиков R3</small>
            </div>
          </div>
          <div className="r1PanelPad">
            {ENABLED_TYPES.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: "1px solid var(--r1-line)",
                }}
              >
                <div>
                  <h3>{t.name}</h3>
                  <p className="r1Muted">доступен для регистрации</p>
                </div>
                <span className="r1Pill good">Включён</span>
              </div>
            ))}
            <div className="r1Unavailable" style={{ marginTop: 16 }}>
              Фабрики и застройщики — релиз 3, не активируются переключателем в production.
            </div>
          </div>
          <div className="r1PanelPad">
            <h2>Правила управления</h2>
            <div style={{ padding: "12px 0", borderBottom: "1px solid var(--r1-line)" }}>
              <h3>Каталог отдельно от сотрудничества</h3>
              <p className="r1Muted">Одно действие не меняет вторую видимость</p>
            </div>
            <div style={{ padding: "12px 0", borderBottom: "1px solid var(--r1-line)" }}>
              <h3>Удаление с восстановлением</h3>
              <p className="r1Muted">Карточка скрыта, история сохранена</p>
            </div>
            <div style={{ padding: "12px 0" }}>
              <h3>Уведомления с контекстом</h3>
              <p className="r1Muted">Кабинет, тема, партнёр, переход</p>
              <Link className="r1Btn small" href="/admin/notifications" style={{ marginTop: 8 }}>
                Настроить
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "releases" ? (
        <div className="r1Panel r1PanelPad">
          <h2>Релиз 1 · сейчас</h2>
          <p className="r1Help">
            Базовый кабинет на данных, которые уже есть в PROF: реестр и карточка партнёра, модерация
            профилей и отзывов, уведомления, обзор, клиенты, сертификаты, сделки, базовая аналитика,
            команда с ролями StaffRole, журнал. Без кураторов, задач, новых расчётов и миграций;
            рейтинг — текущий RemScore.
          </p>
          <div className="r1Unavailable" style={{ marginTop: 16 }}>
            Релиз 2 и 3 в production не включаются. Переключатель эталона не переносится как способ
            активировать неготовые функции.
          </div>
        </div>
      ) : null}

      {tab === "audit" ? (
        <section className="r1Panel r1PanelPad">
          {note ? <p className="r1Help">{note}</p> : null}
          {loading ? <div className="r1StateLoading">Загрузка журнала…</div> : null}
          {error ? <div className="r1StateErr">{error}</div> : null}
          {!loading && !error && items.length === 0 ? (
            <div className="r1Empty">
              <h2>Действий пока нет</h2>
              <p>Записи AuditLog появятся здесь.</p>
            </div>
          ) : null}
          {items.map((a) => (
            <div key={a.id} className="r1AuditRow">
              <span className="r1Muted">{formatAdminR1Date(a.createdAt)}</span>
              <div>
                <strong>{a.action}</strong>
                <p>{a.targetUserId ? `Цель: ${a.targetUserId}` : "Без целевого пользователя"}</p>
              </div>
              <span>{a.actorDisplayName || "—"}</span>
            </div>
          ))}
          {total > 0 ? (
            <div className="r1Pager">
              <span className="r1Muted">
                Стр. {page} из {totalPages} · всего {total}
              </span>
              <button
                type="button"
                className="r1Btn small"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Назад
              </button>
              <button
                type="button"
                className="r1Btn small"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Далее
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
