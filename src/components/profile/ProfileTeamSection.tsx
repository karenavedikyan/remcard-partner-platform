"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { blockedTeamSectionMessage } from "@/lib/profile-cabinet-access";
import { useProfileCabinetAccess } from "./ProfileCabinetAccessContext";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import {
  canManageTeam,
  type EmployeesOverviewResponse,
  type TeamMemberRow,
} from "@/lib/employees-overview-types";
import {
  computeTeamStats,
  filterTeamMembers,
  formatAccessScopeLabel,
  HEAD_OFFICE_LOCATION_ID,
  memberDisplayName,
  memberInitials,
  memberMatchesLocation,
  memberRoleSummary,
  mergePendingInvites,
  resolveDisplayTeam,
  canEditTeamMember,
  canManageBranch,
  type TeamSectionView,
  type UnifiedPendingInvite,
} from "@/lib/team-section-model";
import { Button } from "@/components/ui/Button";
import {
  ProfileSoloPartnerEmployeeCard,
  type SoloPartnerEmployeeRow,
} from "./ProfileSoloPartnerEmployeeCard";
import { ProfileTeamMemberEditor } from "./ProfileTeamMemberEditor";
import {
  ProfileTeamInviteWizard,
  type InviteWizardScope,
} from "./ProfileTeamInviteWizard";
import { ProfileTeamPermissionsHelpDialog } from "./ProfileTeamPermissionsHelpDialog";
import { DEV_FIXTURE_STAFF_INVITES } from "@/lib/dev-profile-fixture-overview";
import styles from "./ProfileTeamSection.module.css";
import formStyles from "./ProfileEditor.module.css";
import {
  TeamIconBuilding2,
  TeamIconSearch,
  TeamIconShieldCheck,
  TeamIconUserPlus,
} from "./team-section-icons";

type StaffInviteRow = {
  id: string;
  url: string;
  role: string;
  position?: string | null;
  status: string;
  branchName: string | null;
  expiresAt: string;
  scope?: string;
  membershipKind?: string | null;
  branchIds?: string[];
  allCurrentBranchesSnapshot?: boolean;
};

async function copyInviteUrl(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

type ProfileTeamSectionProps = {
  /** Dev-fixture only: skip network and render mock overview. */
  fixtureOverview?: EmployeesOverviewResponse;
};

export function ProfileTeamSection({ fixtureOverview }: ProfileTeamSectionProps = {}) {
  const { canOpenTeamSection, contextReady } = useProfileCabinetAccess();
  const fetchGenerationRef = useRef(0);
  const [overview, setOverview] = useState<EmployeesOverviewResponse | null>(
    fixtureOverview ?? null,
  );
  const [loading, setLoading] = useState(!fixtureOverview);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copyFailed, setCopyFailed] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState("");
  const [invites, setInvites] = useState<StaffInviteRow[]>([]);
  const [soloEmployees, setSoloEmployees] = useState<SoloPartnerEmployeeRow[]>([]);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [view, setView] = useState<TeamSectionView>("people");
  const [editMember, setEditMember] = useState<TeamMemberRow | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardScope, setWizardScope] = useState<InviteWizardScope | undefined>();
  const [wizardBranchId, setWizardBranchId] = useState<string | undefined>();
  const [helpOpen, setHelpOpen] = useState(false);
  const [manualCopyUrl, setManualCopyUrl] = useState<string | null>(null);
  const contentReady = Boolean(overview) && !loading && !error;

  const load = useCallback(async () => {
    if (fixtureOverview) {
      setOverview(fixtureOverview);
      setLoading(false);
      setError("");
      if (canManageTeam(fixtureOverview)) {
        setInvites(DEV_FIXTURE_STAFF_INVITES);
      } else {
        setInvites([]);
      }
      return;
    }
    if (!contextReady || !canOpenTeamSection) {
      setOverview(null);
      setInvites([]);
      setSoloEmployees([]);
      setLoading(false);
      setError("");
      return;
    }
    const generation = fetchGenerationRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await remcardFetch<EmployeesOverviewResponse>(
        "/api/pro/organization/employees-overview",
      );
      if (generation !== fetchGenerationRef.current) return;
      setOverview(data);
      if (canManageTeam(data)) {
        const inv = await remcardFetch<{ invites: StaffInviteRow[] }>(
          "/api/pro/invites?status=PENDING&limit=200",
        );
        setInvites(inv.invites ?? []);
      } else {
        setInvites([]);
      }
      if (data.myRole === "SOLO_PARTNER") {
        const solo = await remcardFetch<{ employees: SoloPartnerEmployeeRow[] }>("/api/pro/employees");
        setSoloEmployees(solo.employees ?? []);
      } else {
        setSoloEmployees([]);
      }
    } catch (caught) {
      if (generation !== fetchGenerationRef.current) return;
      if (caught instanceof RemcardApiError && caught.status === 403) {
        setOverview(null);
        setError("Управление командой недоступно для вашей роли.");
      } else {
        setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить команду");
      }
    } finally {
      if (generation === fetchGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [canOpenTeamSection, contextReady, fixtureOverview]);

  useEffect(() => {
    if (fixtureOverview) return;
    fetchGenerationRef.current += 1;
    setOverview(null);
    setInvites([]);
    setSoloEmployees([]);
    setError("");
  }, [canOpenTeamSection, contextReady, fixtureOverview]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayTeam = useMemo(
    () => (overview ? resolveDisplayTeam(overview) : []),
    [overview],
  );

  const pendingUnified = useMemo(
    () =>
      overview
        ? mergePendingInvites({ overview, staffInvites: invites })
        : ([] as UnifiedPendingInvite[]),
    [overview, invites],
  );

  const stats = useMemo(
    () =>
      overview
        ? computeTeamStats(overview, displayTeam, pendingUnified)
        : { employees: 0, branches: 0, headOffice: 0, pendingInvites: 0 },
    [overview, displayTeam, pendingUnified],
  );

  const filteredMembers = useMemo(
    () =>
      filterTeamMembers({
        members: displayTeam,
        query: search,
        locationFilter: locationFilter === "all" ? "all" : locationFilter,
      }),
    [displayTeam, search, locationFilter],
  );

  const locationOptions = useMemo(() => {
    if (!overview) return [];
    const opts = overview.branches.map((b) => ({ id: b.id, label: b.name }));
    opts.unshift({ id: HEAD_OFFICE_LOCATION_ID, label: "Головной офис" });
    return opts;
  }, [overview]);

  async function revokeInvite(id: string) {
    if (fixtureOverview) return;
    setError("");
    try {
      await remcardFetch(`/api/pro/invites/${encodeURIComponent(id)}`, { method: "DELETE" });
      await load();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось отозвать");
    }
  }

  const canManage = overview ? canManageTeam(overview) : false;

  function openWizard(scope?: InviteWizardScope, branchId?: string) {
    setWizardScope(scope);
    setWizardBranchId(branchId);
    setWizardOpen(true);
  }

  function renderPersonRow(member: TeamMemberRow) {
    const scope = formatAccessScopeLabel(member, overview?.branches.length ?? 0);
    const role = memberRoleSummary(member);
    const chipClass =
      member.membershipKind === "HEAD_OFFICE" && member.branchAccess.length === 0
        ? styles.scopeChipOffice
        : styles.scopeChip;
    return (
      <article key={member.userId} className={styles.person} data-testid={`person-${member.userId}`}>
        <div className={styles.personIdentity}>
          <span className={styles.avatar} aria-hidden="true">
            {member.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.photoUrl} alt="" />
            ) : (
              memberInitials(memberDisplayName(member))
            )}
          </span>
          <div>
            <strong>{memberDisplayName(member)}</strong>
            <small>{member.position?.trim() || "Сотрудник"}</small>
          </div>
        </div>
        <div>
          <span className={styles.roleLabel}>{role.title}</span>
          <small>{role.hint}</small>
        </div>
        <div>
          <span className={chipClass}>
            <TeamIconBuilding2 className={styles.chipIcon} />
            {scope.primary}
          </span>
          <small>{scope.secondary}</small>
        </div>
        {canManage && overview && canEditTeamMember(overview, member) ? (
          <div className={styles.personActions}>
            <Button
              type="button"
              variant="text"
              aria-label={`Настроить доступ: ${memberDisplayName(member)}`}
              onClick={() => setEditMember(member)}
            >
              Доступы
            </Button>
          </div>
        ) : (
          <span />
        )}
      </article>
    );
  }

  function renderPeopleView() {
    if (overview?.myRole === "SOLO_PARTNER" && soloEmployees.length > 0 && filteredMembers.length === 0) {
      return (
        <p className={formStyles.hint} data-testid="team-solo-people-hint">
          Сотрудники SOLO-команды перечислены в блоке ниже ({soloEmployees.length}).
        </p>
      );
    }
    if (filteredMembers.length === 0) {
      return (
        <div className={styles.empty}>
          <h3>{search.trim() ? "Сотрудники не найдены" : "Пока нет сотрудников"}</h3>
          <p>
            {search.trim()
              ? "Попробуйте другое имя, должность или выберите все подразделения."
              : "Пригласите сотрудника и настройте доступ к подразделениям."}
          </p>
          {search.trim() || locationFilter !== "all" ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSearch("");
                setLocationFilter("all");
              }}
            >
              Сбросить поиск
            </Button>
          ) : canManage ? (
            <Button type="button" data-testid="team-open-invite-wizard" onClick={() => openWizard()}>
              Пригласить сотрудника
            </Button>
          ) : null}
        </div>
      );
    }
    return (
      <div className={styles.list}>
        <div className={styles.listHead}>
          <span>Сотрудник</span>
          <span>Разрешённые действия</span>
          <span>Область доступа</span>
          <span />
        </div>
        {filteredMembers.map(renderPersonRow)}
      </div>
    );
  }

  function renderLocationsView() {
    if (!overview) return null;
    const locations = [
      ...overview.branches.map((b) => ({
        id: b.id,
        name: b.name,
        meta: `${b.city} · ${b.address}`,
        isOffice: false,
      })),
      {
        id: HEAD_OFFICE_LOCATION_ID,
        name: "Головной офис",
        meta: "Офисные задачи, без автоматического доступа к магазинам",
        isOffice: true,
      },
    ].filter((loc) => locationFilter === "all" || locationFilter === loc.id);

    return (
      <>
        <div className={styles.locationGrid}>
          {locations.map((loc) => {
            const rows = filteredMembers.filter((m) => memberMatchesLocation(m, loc.id));
            return (
              <section key={loc.id} className={styles.location}>
                <div className={styles.locationHead}>
                  <h3>{loc.name}</h3>
                </div>
                <p className={styles.locationMeta}>
                  {loc.meta} · {rows.length} в команде
                </p>
                {rows.length === 0 ? (
                  <p className={formStyles.hint}>Пока нет сотрудников с доступом</p>
                ) : (
                  rows.map((m) => (
                    <div key={`${loc.id}-${m.userId}`} className={styles.miniPerson}>
                      <div>
                        <strong>{memberDisplayName(m)}</strong>
                        <small>{m.position?.trim() || memberRoleSummary(m).title}</small>
                      </div>
                      {canManage && canEditTeamMember(overview, m) ? (
                        <Button
                          type="button"
                          variant="text"
                          aria-label={`Настроить доступ: ${memberDisplayName(m)}`}
                          onClick={() => setEditMember(m)}
                        >
                          Доступы
                        </Button>
                      ) : null}
                    </div>
                  ))
                )}
                {canManage && !loc.isOffice && canManageBranch(overview, loc.id) ? (
                  <Button
                    type="button"
                    variant="secondary"
                    data-testid={`team-invite-here-${loc.id}`}
                    onClick={() => openWizard("BRANCH", loc.id)}
                  >
                    Пригласить сюда
                  </Button>
                ) : null}
              </section>
            );
          })}
        </div>
        <p className={styles.footerNote}>
          Один человек может отображаться в нескольких подразделениях. В общем счётчике каждый сотрудник
          учтён один раз.
        </p>
      </>
    );
  }

  function renderInvitesView() {
    if (pendingUnified.length === 0) {
      return (
        <div className={styles.empty}>
          <h3>Все приглашения обработаны</h3>
          <p>Новые приглашения появятся здесь до принятия сотрудником.</p>
          {canManage ? (
            <Button type="button" onClick={() => openWizard()}>
              Пригласить сотрудника
            </Button>
          ) : null}
        </div>
      );
    }
    return pendingUnified.map((inv) => (
      <article key={inv.id} className={styles.inviteRow}>
        <div className={styles.inviteRowHead}>
          <div>
            <strong>{inv.label}</strong>
            <p>
              {inv.position?.trim() || "Сотрудник"} · {inv.scopeLabel}
              {inv.expiresAt
                ? ` · до ${new Date(inv.expiresAt).toLocaleDateString("ru-RU")}`
                : ""}
            </p>
          </div>
          <span className={styles.pendingBadge}>Ожидает принятия</span>
        </div>
        <div className={styles.inviteActions}>
          {inv.url ? (
            <Button
              type="button"
              variant="secondary"
              data-testid={`team-copy-invite-${inv.id}`}
              onClick={() =>
                void copyInviteUrl(inv.url!).then((ok) => {
                  if (ok) {
                    setMessage("Ссылка скопирована");
                    setCopyFailed(false);
                    setManualCopyUrl(null);
                  } else {
                    setCopyFailed(true);
                    setManualCopyUrl(inv.url);
                  }
                })
              }
            >
              Скопировать ссылку
            </Button>
          ) : null}
          {canManage && inv.revokeId && !fixtureOverview ? (
            <Button type="button" variant="secondary" onClick={() => void revokeInvite(inv.revokeId!)}>
              Отозвать
            </Button>
          ) : null}
        </div>
      </article>
    ));
  }

  if (!contextReady) {
    return (
      <div className={styles.stateBlock}>
        <p className={formStyles.hint}>Загружаем контекст доступа…</p>
      </div>
    );
  }

  if (!canOpenTeamSection) {
    return (
      <div className={styles.stateBlock}>
        <p className={formStyles.hint} role="status">
          {blockedTeamSectionMessage()}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.root} data-testid="team-section-root">
      <div className={styles.heading}>
        <div>
          <h2>Команда и доступы</h2>
          <p>
            Кто с вами работает, за что отвечает и к каким подразделениям имеет доступ.
          </p>
        </div>
        {canManage ? (
          <Button
            type="button"
            className={styles.headingCta}
            data-testid="team-open-invite-wizard"
            onClick={() => openWizard()}
          >
            <TeamIconUserPlus className={styles.ctaIcon} />
            Пригласить сотрудника
          </Button>
        ) : null}
      </div>

      {loading ? <p className={formStyles.hint}>Загружаем…</p> : null}
      {error ? (
        <div className={styles.errorRow} role="alert">
          <span>{error}</span>
          {!fixtureOverview ? (
            <Button type="button" variant="secondary" onClick={() => void load()}>
              Повторить
            </Button>
          ) : null}
        </div>
      ) : null}
      {message ? (
        <p className={formStyles.success} role="status">
          {message}
        </p>
      ) : null}
      {copyFailed ? (
        <p className={formStyles.hint}>Не удалось скопировать — выделите ссылку вручную.</p>
      ) : null}
      {lastInviteUrl ? (
        <div className={formStyles.bannerWarn}>
          <p>Ссылка для сотрудника:</p>
          <code>{lastInviteUrl}</code>
        </div>
      ) : null}

      {overview && overview.myRole !== "OTHER" ? (
        <div className={styles.stats} data-testid="team-stats">
          <div className={styles.stat}>
            <strong>{stats.employees}</strong>
            <span>сотрудников</span>
          </div>
          <div className={styles.stat}>
            <strong>{stats.branches}</strong>
            <span>филиалов</span>
          </div>
          <div className={styles.stat}>
            <strong>{stats.headOffice}</strong>
            <span>в головном офисе</span>
          </div>
          <div className={styles.stat}>
            <strong>{stats.pendingInvites}</strong>
            <span>приглашения</span>
          </div>
        </div>
      ) : null}

      {overview && overview.myRole === "OTHER" ? (
        <p className={formStyles.hint}>Вы не управляете командой этой организации.</p>
      ) : null}

      <div className={styles.controls}>
        <div className={styles.segment} role="group" aria-label="Представление команды">
          {(
            [
              ["people", "Все сотрудники"],
              ["locations", "По подразделениям"],
              ["invites", "Приглашения"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              data-testid={`team-view-${id}`}
              onClick={() => setView(id)}
            >
              {label}
              {id === "invites" && stats.pendingInvites ? ` (${stats.pendingInvites})` : ""}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="text"
          data-testid="team-permissions-help"
          onClick={() => setHelpOpen(true)}
        >
          <TeamIconShieldCheck className={styles.ctaIcon} />
          Должности, права и выплаты
        </Button>
      </div>

      {view !== "invites" ? (
        <div className={styles.toolbar}>
          <label className={styles.searchWrap}>
            <TeamIconSearch className={styles.searchIcon} />
            <span className="sr-only">Поиск</span>
            <input
              aria-label="Поиск по имени или должности"
              placeholder="Имя или должность"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Подразделение"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <option value="all">Все подразделения</option>
            {locationOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {manualCopyUrl ? (
        <div className={formStyles.bannerWarn} data-testid="team-manual-copy-url">
          <p>Скопируйте ссылку вручную:</p>
          <textarea readOnly value={manualCopyUrl} rows={2} aria-label="Ссылка приглашения" />
        </div>
      ) : null}

      <div data-testid="team-view-content">
        {contentReady && view === "people" ? renderPeopleView() : null}
        {contentReady && view === "locations" ? renderLocationsView() : null}
        {contentReady && view === "invites" ? renderInvitesView() : null}
      </div>

      {overview?.myRole === "SOLO_PARTNER" ? (
        <div className={styles.soloBlock}>
          <p className={formStyles.hint}>Команда партнёра (без организации и филиалов).</p>
          {soloEmployees.length > 0 ? (
            <ul className={formStyles.notesList}>
              {soloEmployees.map((emp) => (
                <ProfileSoloPartnerEmployeeCard key={emp.id} employee={emp} onChanged={load} />
              ))}
            </ul>
          ) : (
            <p className={formStyles.hint}>Пока нет сотрудников — создайте приглашение.</p>
          )}
          {canManage ? (
            <Button type="button" variant="secondary" onClick={() => openWizard("SOLO_PARTNER")}>
              Пригласить в SOLO-команду
            </Button>
          ) : null}
        </div>
      ) : null}

      {overview && overview.myRole === "ORG_OWNER" && overview.branches.length === 0 && displayTeam.length === 0 ? (
        <p className={formStyles.hint}>
          Филиалов пока нет — можно пригласить сотрудника головного офиса или добавить филиал.
        </p>
      ) : null}

      <div className={styles.rulebox}>
        <div>
          <span className={styles.eyebrow}>Роль = что можно делать</span>
          <p>
            Один и тот же набор прав можно выдать на один магазин, несколько точек или всю текущую сеть.
          </p>
        </div>
        <div>
          <span className={styles.eyebrow}>Доступ = где можно работать</span>
          <p>
            Головной офис выбирается отдельно. Доступ к офису сам по себе не открывает данные всех
            филиалов.
          </p>
        </div>
      </div>
      <p className={styles.footerNote}>
        Владелец управляет организацией. Приглашённые сотрудники не могут сменить владельца, удалить
        организацию или повысить собственные права.
      </p>

      {editMember && overview ? (
        <ProfileTeamMemberEditor
          member={editMember}
          overview={overview}
          onClose={() => setEditMember(null)}
          onSaved={() => void load()}
        />
      ) : null}

      {wizardOpen && overview ? (
        <ProfileTeamInviteWizard
          overview={overview}
          initialScope={wizardScope}
          initialBranchId={wizardBranchId}
          onClose={() => setWizardOpen(false)}
          onCreated={(url) => {
            setLastInviteUrl(url);
            setMessage("Ссылка создана — отправьте её сотруднику.");
            void load();
          }}
        />
      ) : null}

      {helpOpen && overview ? (
        <ProfileTeamPermissionsHelpDialog
          organizationId={overview.organization.id}
          canLoadOrgTemplates={overview.myRole === "ORG_OWNER"}
          onClose={() => setHelpOpen(false)}
        />
      ) : null}
    </div>
  );
}
