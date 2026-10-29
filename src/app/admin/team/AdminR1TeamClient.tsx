"use client";

import { useEffect, useState } from "react";
import { fetchAdminR1Team, type AdminR1TeamMember } from "@/lib/admin-r1/api";

const ROLE_LABEL: Record<AdminR1TeamMember["staffRole"], string> = {
  OWNER: "Владелец",
  ADMIN: "Администратор",
  OPERATOR: "Оператор",
  ANALYST: "Аналитик",
};

function initials(name: string | null): string {
  return (name || "С")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] || "")
    .join("")
    .toUpperCase();
}

export function AdminR1TeamClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<AdminR1TeamMember[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAdminR1Team();
        if (!cancelled) setMembers(data.members);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить команду");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const active = members.filter((m) => m.staffRole);
  const withoutOwner = active.filter((m) => m.staffRole !== "OWNER");

  return (
    <div data-testid="admin-r1-team">
      <div className="r1Kpis">
        <div className="r1Panel r1Kpi">
          <span className="r1KpiLabel">Сотрудники</span>
          <strong className="r1KpiValue">{loading ? "…" : withoutOwner.length}</strong>
          <span className="r1KpiBottom">Без владельца проекта</span>
        </div>
        <div className="r1Panel r1Kpi">
          <span className="r1KpiLabel">Доступ активен</span>
          <strong className="r1KpiValue">{loading ? "…" : active.length}</strong>
          <span className="r1KpiBottom">Могут войти в кабинет</span>
        </div>
        <div className="r1Panel r1Kpi">
          <span className="r1KpiLabel">Роли доступа</span>
          <strong className="r1KpiValue" style={{ fontSize: "1.1rem" }}>
            Владелец · Админ · Оператор
          </strong>
          <span className="r1KpiBottom">По StaffRole в PROF; кураторы — релиз 2</span>
        </div>
        <div className="r1Panel r1Kpi">
          <span className="r1KpiLabel">Аналитики</span>
          <strong className="r1KpiValue">
            {loading ? "…" : active.filter((m) => m.staffRole === "ANALYST").length}
          </strong>
          <span className="r1KpiBottom">Только чтение метрик</span>
        </div>
      </div>
      <p className="r1Help" style={{ marginBottom: 16 }}>
        Команда R1 показывает только существующие StaffRole. Назначение кураторов по направлениям и
        задачи скрыты (релиз 2). Изменения членства в production QA не выполняются.
      </p>
      {loading ? <div className="r1StateLoading">Загрузка команды…</div> : null}
      {error ? <div className="r1StateErr" role="alert">{error}</div> : null}
      {!loading && !error && members.length === 0 ? (
        <div className="r1Empty">
          <h2>Сотрудников нет</h2>
          <p>В базе нет пользователей со StaffRole.</p>
        </div>
      ) : null}
      <div className="r1TeamGrid">
        {members.map((m) => (
          <article key={m.id} className="r1Panel r1Employee">
            <div className="r1EmployeeTop">
              <span className="r1Avatar">{initials(m.displayName)}</span>
              <div>
                <h2>{m.displayName || "Сотрудник"}</h2>
                <p className="r1Muted">{ROLE_LABEL[m.staffRole]}</p>
              </div>
            </div>
            <span className="r1Pill good">Доступ активен</span>
            <p className="r1Help">Роль задаётся приглашением, без привязки к направлению</p>
            {m.staffPosition ? <p className="r1Muted">{m.staffPosition}</p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
