"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  fetchAdminTeam,
  filterTeamMembers,
  labelTeamStaffRole,
  TEAM_LOAD_FAILED_MESSAGE,
  TEAM_R1_CARD_ROLE_NOTE,
  TEAM_R1_PAGE_LEAD,
  teamErrorKind,
  teamMemberInitials,
  teamRoleLegend,
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
  const abortRef = useRef<AbortController | null>(null);

  const load = async () => {
    const flight = ++flightRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    // Drop prior rows immediately so stale totals cannot masquerade as the new load.
    setMembers([]);
    setLoadState({ kind: "loading" });
    try {
      const res = await fetchAdminTeam(controller.signal);
      if (flight !== flightRef.current || controller.signal.aborted) return;
      const list = res.members;
      setMembers(list);
      setLoadState(list.length === 0 ? { kind: "empty" } : { kind: "ready" });
    } catch (caught) {
      if (flight !== flightRef.current || controller.signal.aborted) return;
      const kind = teamErrorKind(caught);
      if (kind === "aborted") return;
      setMembers([]);
      if (kind === "forbidden") {
        setLoadState({ kind: "forbidden" });
        return;
      }
      if (kind === "unauthorized") {
        setLoadState({ kind: "unauthorized" });
        return;
      }
      // Parse/HTTP failures share one recoverable copy — no raw API details.
      setLoadState({ kind: "error", message: TEAM_LOAD_FAILED_MESSAGE });
    }
  };

  useEffect(() => {
    void load();
    return () => {
      flightRef.current += 1;
      abortRef.current?.abort();
    };
  }, []);

  const filtered = useMemo(() => filterTeamMembers(members, query), [members, query]);
  // Counts only after a successful parse (ready/empty). Error must not paint 0 as «база».
  const countsLive = loadState.kind === "ready" || loadState.kind === "empty";
  const activeAccessCount = members.length;
  const roleLegend = teamRoleLegend(members);

  return (
    <div className={styles.page} aria-labelledby={titleId} data-admin-team="a17d">
      <header className={styles.pageHead}>
        <div className={styles.pageHeadCopy}>
          <h1 id={titleId} className={styles.pageTitle}>
            Команда
          </h1>
          <p className={styles.pageLead}>{TEAM_R1_PAGE_LEAD}</p>
        </div>
        <div className={styles.headActions}>
          <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/admin/access/users">
            Управление доступом
          </Link>
        </div>
      </header>

      <section className={styles.stats} aria-label="Сводка по команде">
        <div className={styles.statTile} data-testid="team-kpi-active">
          <strong>
            {loadState.kind === "loading" ? "…" : countsLive ? activeAccessCount : "—"}
          </strong>
          <span className={styles.statLabel}>Доступ активен</span>
          <small>Могут войти в кабинет</small>
        </div>
        <div className={styles.statTile} data-testid="team-kpi-roles">
          <strong className={styles.roleLegend}>
            {loadState.kind === "loading" ? "…" : countsLive ? roleLegend : "—"}
          </strong>
          <span className={styles.statLabel}>Роли доступа</span>
          <small>Роли сотрудников с действующим доступом</small>
        </div>
        <div className={styles.statTile} data-testid="team-kpi-closed">
          <strong>—</strong>
          <span className={styles.statLabel}>Доступ закрыт</span>
          <small>Данные о закрытых доступах пока недоступны</small>
        </div>
      </section>

      <p className={styles.listCountHint} data-testid="team-list-count" hidden={loadState.kind !== "ready"}>
        {query.trim()
          ? `Совпадений в загруженном списке: ${filtered.length}`
          : `Показано в текущем списке: ${filtered.length}`}
      </p>

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
              <p className={styles.note}>{TEAM_R1_CARD_ROLE_NOTE}</p>
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
