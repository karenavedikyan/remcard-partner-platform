"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import {
  canManageTeam,
  type EmployeesOverviewResponse,
  type OrganizationPendingInviteRow,
  type TeamMemberRow,
} from "@/lib/employees-overview-types";
import { summarizeMemberAccess } from "@/lib/prof-i-member-permissions";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { TextField } from "@/components/ui/FormField";
import { ProfileTeamEmployeeCard } from "./ProfileTeamEmployeeCard";
import {
  ProfileSoloPartnerEmployeeCard,
  type SoloPartnerEmployeeRow,
} from "./ProfileSoloPartnerEmployeeCard";
import { ProfileTeamMemberEditor } from "./ProfileTeamMemberEditor";
import { ProfileTeamInviteWizard, type InviteWizardScope } from "./ProfileTeamInviteWizard";
import teamStyles from "./ProfileTeamPermissions.module.css";
import styles from "./ProfileEditor.module.css";

function membershipLabel(kind: string | null | undefined): string {
  if (kind === "HEAD_OFFICE") return "Головной офис";
  if (kind === "BRANCH_STAFF") return "Сотрудник филиалов";
  return "Команда";
}

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

export function ProfileTeamSection() {
  const [overview, setOverview] = useState<EmployeesOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copyFailed, setCopyFailed] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState("");
  const [invites, setInvites] = useState<StaffInviteRow[]>([]);
  const [soloEmployees, setSoloEmployees] = useState<SoloPartnerEmployeeRow[]>([]);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [editMember, setEditMember] = useState<TeamMemberRow | null>(null);
  const [showAllInvites, setShowAllInvites] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardScope, setWizardScope] = useState<InviteWizardScope | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await remcardFetch<EmployeesOverviewResponse>(
        "/api/pro/organization/employees-overview",
      );
      setOverview(data);
      if (canManageTeam(data)) {
        const inv = await remcardFetch<{ invites: StaffInviteRow[] }>(
          "/api/pro/invites?status=PENDING&limit=200",
        );
        setInvites(inv.invites ?? []);
      }
      if (data.myRole === "SOLO_PARTNER") {
        const solo = await remcardFetch<{ employees: SoloPartnerEmployeeRow[] }>("/api/pro/employees");
        setSoloEmployees(solo.employees ?? []);
      } else {
        setSoloEmployees([]);
      }
    } catch (caught) {
      if (caught instanceof RemcardApiError && caught.status === 403) {
        setOverview(null);
        setError("Управление командой недоступно для вашей роли.");
      } else {
        setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить команду");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const teamRows = useMemo(() => {
    const team = overview?.team ?? [];
    const q = search.trim().toLowerCase();
    return team.filter((m) => {
      const hay = `${m.fullName ?? ""} ${m.displayName} ${m.publicId}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (branchFilter === "HEAD_OFFICE") {
        return m.membershipKind === "HEAD_OFFICE";
      }
      if (branchFilter) {
        return m.branchAccess.some((b) => b.branchId === branchFilter);
      }
      return true;
    });
  }, [overview?.team, search, branchFilter]);

  const orgPending: OrganizationPendingInviteRow[] = overview?.organizationPendingInvites ?? [];
  const visibleOrgPending = showAllInvites ? orgPending : orgPending.slice(0, 10);

  async function revokeInvite(id: string) {
    setError("");
    try {
      await remcardFetch(`/api/pro/invites/${encodeURIComponent(id)}`, { method: "DELETE" });
      await load();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось отозвать");
    }
  }

  const canManage = overview ? canManageTeam(overview) : false;
  const uniqueCount =
    overview?.summary.uniqueEmployees ?? overview?.summary.totalEmployees ?? 0;
  const pendingCount = overview?.summary.pendingInvites ?? 0;

  function openWizard(scope?: InviteWizardScope) {
    setWizardScope(scope);
    setWizardOpen(true);
  }

  return (
    <Panel title="Сотрудники и доступы">
      <p className={styles.hint}>
        Должность называете сами. Права выбираете по опциям: продажи, начисления, выплаты и другие
        задачи. Одна ссылка — один согласованный набор доступов.
      </p>
      {loading ? <p className={styles.hint}>Загружаем…</p> : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}{" "}
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Повторить
          </Button>
        </p>
      ) : null}
      {message ? (
        <p className={styles.success} role="status">
          {message}
        </p>
      ) : null}
      {lastInviteUrl ? (
        <div className={styles.bannerWarn}>
          <p>Ссылка для сотрудника:</p>
          <code>{lastInviteUrl}</code>
          <Button
            type="button"
            onClick={() =>
              void copyInviteUrl(lastInviteUrl).then((ok) => {
                if (ok) setCopyFailed(false);
                else setCopyFailed(true);
              })
            }
          >
            Копировать
          </Button>
          {copyFailed ? (
            <p className={styles.hint}>Не удалось скопировать — выделите ссылку вручную.</p>
          ) : null}
        </div>
      ) : null}

      {overview && overview.myRole !== "OTHER" ? (
        <p className={styles.hint}>
          В команде: <strong>{uniqueCount}</strong> · ожидают приглашения: <strong>{pendingCount}</strong>
        </p>
      ) : null}

      {canManage ? (
        <div className={styles.fields}>
          <Button type="button" data-testid="team-open-invite-wizard" onClick={() => openWizard()}>
            Пригласить сотрудника
          </Button>
        </div>
      ) : null}

      {overview && overview.myRole === "OTHER" ? (
        <p className={styles.hint}>Вы не управляете командой этой организации.</p>
      ) : null}

      {overview?.team && overview.team.length > 0 ? (
        <>
          <div className={styles.fields}>
            <TextField
              label="Поиск по имени"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <label className={styles.checkRow}>
              Фильтр
              <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                <option value="">Все</option>
                <option value="HEAD_OFFICE">Головной офис (без филиалов)</option>
                {overview.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            {teamRows.map((member) => {
              const summary = summarizeMemberAccess(member);
              return (
                <article key={member.userId} className={teamStyles.personGrid} data-testid={`person-${member.userId}`}>
                  <div>
                    <strong>{member.fullName || member.displayName}</strong>
                    <small>{member.position?.trim() || "Сотрудник"}</small>
                  </div>
                  <div>
                    <span>{summary.subtitle}</span>
                    <small>Должность не определяет доступ</small>
                  </div>
                  <div>
                    <span>
                      {membershipLabel(member.membershipKind)}
                      {member.branchAccess.length
                        ? ` · ${member.branchAccess.map((b) => b.branchName).join(", ")}`
                        : " · без доступа к операциям филиалов"}
                    </span>
                  </div>
                  {canManage && overview.myRole === "ORG_OWNER" ? (
                    <Button type="button" variant="secondary" onClick={() => setEditMember(member)}>
                      Доступы
                    </Button>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      ) : null}

      {overview?.branches.length && !overview.team?.length ? (
        <ul className={`${styles.notesList} ${styles.teamSectionList}`}>
          {overview.branches.map((branch) => (
            <li key={branch.id}>
              <strong className={styles.teamBranchTitle}>
                {branch.name} ({branch.city})
              </strong>
              {branch.employees.length === 0 ? (
                <p className={styles.hint}>Нет сотрудников</p>
              ) : (
                <ul>
                  {branch.employees.map((emp) => (
                    <ProfileTeamEmployeeCard
                      key={emp.id}
                      branchId={branch.id}
                      branchName={branch.name}
                      employee={emp}
                      allBranches={overview.branches}
                      canManage={
                        overview.viewer.canManageEmployeesByBranchId[branch.id] ?? canManage
                      }
                      isOwner={overview.viewer.isOrgOwner}
                      onChanged={load}
                    />
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      ) : overview?.myRole === "SOLO_PARTNER" ? (
        <>
          <p className={styles.hint}>Команда партнёра (без организации и филиалов).</p>
          {soloEmployees.length > 0 ? (
            <ul className={styles.notesList}>
              {soloEmployees.map((emp) => (
                <ProfileSoloPartnerEmployeeCard key={emp.id} employee={emp} onChanged={load} />
              ))}
            </ul>
          ) : (
            <p className={styles.hint}>Пока нет сотрудников — создайте приглашение.</p>
          )}
          {canManage ? (
            <Button type="button" variant="secondary" onClick={() => openWizard("SOLO_PARTNER")}>
              Пригласить в SOLO-команду
            </Button>
          ) : null}
        </>
      ) : overview && overview.myRole === "ORG_OWNER" && overview.branches.length === 0 ? (
        <p className={styles.hint}>
          Филиалов пока нет — можно пригласить сотрудника головного офиса или добавить филиал.
        </p>
      ) : null}

      {orgPending.length > 0 ? (
        <>
          <p className={styles.hint}>Ожидают принятия (организация):</p>
          <ul className={styles.notesList}>
            {visibleOrgPending.map((inv) => (
              <li key={inv.id}>
                {membershipLabel(inv.membershipKind)} · {inv.position?.trim() || "Сотрудник"}
                {inv.allCurrentBranchesSnapshot
                  ? " · все текущие филиалы (новые нужно добавить отдельно)"
                  : inv.branchIds.length
                    ? ` · филиалы: ${inv.branchIds.length}`
                    : " · без филиалов"}
                {" · до "}
                {new Date(inv.expiresAt).toLocaleDateString("ru-RU")}
              </li>
            ))}
          </ul>
          {orgPending.length > 10 && !showAllInvites ? (
            <Button type="button" variant="secondary" onClick={() => setShowAllInvites(true)}>
              Показать ещё
            </Button>
          ) : null}
        </>
      ) : null}

      {invites.length > 0 && canManage ? (
        <>
          <p className={styles.hint}>Активные приглашения</p>
          <ul className={styles.notesList}>
            {invites.map((inv) => (
              <li key={inv.id}>
                {inv.position?.trim() || inv.role} — {inv.status}{" "}
                <Button type="button" variant="secondary" onClick={() => void revokeInvite(inv.id)}>
                  Отозвать
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

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
          onClose={() => setWizardOpen(false)}
          onCreated={(url) => {
            setLastInviteUrl(url);
            setMessage("Ссылка создана — отправьте её сотруднику.");
            void load();
          }}
        />
      ) : null}
    </Panel>
  );
}
