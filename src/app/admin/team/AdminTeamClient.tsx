"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import {
  fetchAdminTeam,
  filterTeamMembers,
  labelTeamStaffRole,
  teamErrorKind,
  teamMemberInitials,
  type AdminTeamMember,
} from "@/lib/prof-admin-team-api";
import styles from "./AdminTeam.r1.module.css";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "empty" }
  | { kind: "forbidden" }
  | { kind: "unauthorized" }
  | { kind: "error"; message: string };

type ViewMode = "cards" | "list";

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MemberAvatar({ member }: { member: AdminTeamMember }) {
  const [broken, setBroken] = useState(false);
  const initials = teamMemberInitials(member.displayName);
  if (member.staffAvatarUrl && !broken) {
    return (
      <span className={styles.avatar} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={member.staffAvatarUrl}
          alt=""
          onError={() => setBroken(true)}
        />
      </span>
    );
  }
  return (
    <span className={styles.avatar} aria-hidden="true">
      {initials}
    </span>
  );
}

function AccessAction({ member }: { member: AdminTeamMember }) {
  const label = member.staffRole === "OWNER" ? "Все права" : "Доступ";
  return (
    <Link
      className={styles.accessLink}
      href="/admin/access/users"
      aria-label={`${label}: управление доступом для ${member.displayName}`}
    >
      {label}
    </Link>
  );
}

export function AdminTeamClient() {
  const titleId = useId();
  const searchId = useId();
  const [members, setMembers] = useState<AdminTeamMember[]>([]);
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const flightRef = useRef(0);

  const load = async () => {
    const flight = ++flightRef.current;
    setLoadState({ kind: "loading" });
    try {
      const res = await fetchAdminTeam();
      if (flight !== flightRef.current) return;
      const list = res.members;
      setMembers(list);
      setLoadState(list.length === 0 ? { kind: "empty" } : { kind: "ready" });
    } catch (caught) {
      if (flight !== flightRef.current) return;
      setMembers([]);
      const kind = teamErrorKind(caught);
      if (kind === "forbidden") {
        setLoadState({ kind: "forbidden" });
        return;
      }
      if (kind === "unauthorized") {
        setLoadState({ kind: "unauthorized" });
        return;
      }
      const message =
        caught instanceof RemcardApiError
          ? caught.message
          : "Не удалось загрузить команду";
      setLoadState({ kind: "error", message });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => filterTeamMembers(members, query), [members, query]);
  const activeCount = members.length;
  const roleLegend = "Владелец · Администратор · Оператор";

  return (
    <div className={styles.page} aria-labelledby={titleId}>
      <header className={styles.pageHead}>
        <div className={styles.pageHeadCopy}>
          <h1 id={titleId} className={styles.pageTitle}>
            Команда
          </h1>
          <p className={styles.pageLead}>Люди, роли доступа и просмотр состава</p>
        </div>
        <div className={styles.headActions}>
          <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/admin/access/users">
            Управление доступом
          </Link>
        </div>
      </header>

      <section className={styles.stats} aria-label="Сводка по команде">
        <div className={styles.statTile}>
          <strong>{loadState.kind === "loading" ? "…" : activeCount}</strong>
          <small>С доступом в кабинет администратора</small>
        </div>
        <div className={styles.statTile}>
          <strong>{roleLegend}</strong>
          <small>Роли StaffRole в PROF; кураторы по направлениям — позже</small>
        </div>
        <div className={styles.statTile}>
          <strong>{filtered.length}</strong>
          <small>
            {query.trim() ? "Совпадений в загруженном списке" : "Показано в текущем списке"}
          </small>
        </div>
      </section>

      <div className={styles.toolbar}>
        <label className={styles.searchField} htmlFor={searchId}>
          <SearchIcon />
          <span className={styles.srOnly}>Поиск по команде</span>
          <input
            id={searchId}
            type="search"
            placeholder="Имя, ID или роль"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loadState.kind === "loading"}
            autoComplete="off"
          />
        </label>
        <div className={styles.viewToggle} role="group" aria-label="Вид списка команды">
          <button
            type="button"
            aria-pressed={viewMode === "cards"}
            onClick={() => setViewMode("cards")}
          >
            Карточки
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "list"}
            onClick={() => setViewMode("list")}
          >
            Список
          </button>
        </div>
      </div>

      {loadState.kind === "loading" ? (
        <p className={styles.statusBanner} role="status">
          Загрузка команды…
        </p>
      ) : null}

      {loadState.kind === "unauthorized" ? (
        <div className={styles.errorBanner} role="alert">
          <p>Нужна повторная авторизация администратора.</p>
          <Link className={styles.retry} href="/login?mode=admin&returnTo=/admin/team">
            Войти снова
          </Link>
        </div>
      ) : null}

      {loadState.kind === "forbidden" ? (
        <div className={styles.errorBanner} role="alert">
          <p>Недостаточно прав для просмотра команды.</p>
        </div>
      ) : null}

      {loadState.kind === "error" ? (
        <div className={styles.errorBanner} role="alert">
          <p>{loadState.message}</p>
          <button type="button" className={styles.retry} onClick={() => void load()}>
            Повторить
          </button>
        </div>
      ) : null}

      {loadState.kind === "empty" ? (
        <div className={styles.emptyState} role="status">
          <h2>В команде пока никого нет</h2>
          <p>Когда появятся сотрудники с ролью доступа, они отобразятся здесь.</p>
          <Link className={styles.button} href="/admin/access/users">
            Открыть управление доступом
          </Link>
        </div>
      ) : null}

      {loadState.kind === "ready" && filtered.length === 0 ? (
        <div className={styles.emptyState} role="status">
          <h2>Никого не найдено</h2>
          <p>Измените запрос или сбросьте поиск — список фильтруется только по уже загруженным данным.</p>
          <button type="button" className={styles.button} onClick={() => setQuery("")}>
            Сбросить поиск
          </button>
        </div>
      ) : null}

      {loadState.kind === "ready" && filtered.length > 0 && viewMode === "cards" ? (
        <div className={styles.teamGrid} role="list" aria-label="Карточки сотрудников">
          {filtered.map((member) => (
            <article key={member.id} className={styles.employee} role="listitem">
              <div className={styles.employeeTop}>
                <MemberAvatar member={member} />
                <div>
                  <h2>{member.displayName}</h2>
                  <p>
                    {labelTeamStaffRole(member.staffRole)}
                    {member.staffPosition ? ` · ${member.staffPosition}` : ""}
                  </p>
                </div>
              </div>
              <span className={`${styles.pill} ${styles.pillGood}`}>Доступ активен</span>
              <p className={styles.note}>
                Роль задаётся приглашением. Направления кураторов в этом блоке не назначаются.
              </p>
              <div className={styles.employeeActions}>
                <AccessAction member={member} />
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {loadState.kind === "ready" && filtered.length > 0 && viewMode === "list" ? (
        <div className={styles.teamList} role="list" aria-label="Список сотрудников">
          {filtered.map((member) => (
            <article key={member.id} className={styles.listRow} role="listitem">
              <MemberAvatar member={member} />
              <div className={styles.listRowMeta}>
                <strong>{member.displayName}</strong>
                <span>{member.publicId}</span>
              </div>
              <span className={`${styles.pill} ${styles.pillGood}`}>
                {labelTeamStaffRole(member.staffRole)}
              </span>
              <AccessAction member={member} />
            </article>
          ))}
        </div>
      ) : null}

      <p className={styles.mutationScopeNote}>
        Этот экран только для просмотра. Изменение ролей и отзыв доступа — в «Управление доступом».
        Удаление владельца и выдуманные должности здесь недоступны.
      </p>
    </div>
  );
}
