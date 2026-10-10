"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import {
  canManageTeam,
  type EmployeesOverviewResponse,
  type OrganizationPendingInviteRow,
  type TeamMemberRow,
} from "@/lib/employees-overview-types";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { TextField } from "@/components/ui/FormField";
import { ProfileTeamEmployeeCard } from "./ProfileTeamEmployeeCard";
import {
  ProfileSoloPartnerEmployeeCard,
  type SoloPartnerEmployeeRow,
} from "./ProfileSoloPartnerEmployeeCard";
import { ProfileTeamMemberEditor } from "./ProfileTeamMemberEditor";
import styles from "./ProfileEditor.module.css";

const ROLE_OPTIONS = [
  { value: "SELLER", label: "Продавец" },
  { value: "MANAGER", label: "Менеджер" },
  { value: "VIEWER", label: "Наблюдатель" },
] as const;

function roleLabel(role: string): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}

function membershipLabel(kind: string | null | undefined): string {
  if (kind === "HEAD_OFFICE") return "Головной офис";
  if (kind === "BRANCH_STAFF") return "Сотрудник филиалов";
  return "Команда";
}

type StaffInviteRow = {
  id: string;
  url: string;
  role: string;
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
  const [scope, setScope] = useState<"ORGANIZATION" | "BRANCH" | "SOLO_PARTNER">("ORGANIZATION");
  const [membershipKind, setMembershipKind] = useState<"BRANCH_STAFF" | "HEAD_OFFICE">("BRANCH_STAFF");
  const [branchId, setBranchId] = useState("");
  const [branchIds, setBranchIds] = useState<Set<string>>(new Set());
  const [selectAllBranches, setSelectAllBranches] = useState(false);
  const [role, setRole] = useState<string>("SELLER");
  const [position, setPosition] = useState("");
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [copyFailed, setCopyFailed] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState("");
  const [invites, setInvites] = useState<StaffInviteRow[]>([]);
  const [soloEmployees, setSoloEmployees] = useState<SoloPartnerEmployeeRow[]>([]);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [editMember, setEditMember] = useState<TeamMemberRow | null>(null);
  const [showAllInvites, setShowAllInvites] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await remcardFetch<EmployeesOverviewResponse>(
        "/api/pro/organization/employees-overview",
      );
      setOverview(data);
      if (data.branches[0]?.id && !branchId) {
        setBranchId(data.branches[0].id);
      }
      if (data.myRole === "SOLO_PARTNER" || (data.myRole === "ORG_OWNER" && data.branches.length === 0)) {
        setScope(data.branches.length === 0 ? "SOLO_PARTNER" : "ORGANIZATION");
      }
      if (canManageTeam(data)) {
        const inv = await remcardFetch<{ invites: StaffInviteRow[] }>(
          "/api/pro/invites?status=PENDING&limit=50",
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
  }, [branchId]);

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
        return m.membershipKind === "HEAD_OFFICE" && m.branchAccess.length === 0;
      }
      if (branchFilter) {
        return m.branchAccess.some((b) => b.branchId === branchFilter);
      }
      return true;
    });
  }, [overview?.team, search, branchFilter]);

  const orgPending: OrganizationPendingInviteRow[] = overview?.organizationPendingInvites ?? [];
  const visibleOrgPending = showAllInvites ? orgPending : orgPending.slice(0, 10);

  async function createInvite(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    setLastInviteUrl("");
    setCopyFailed(false);
    try {
      const body: Record<string, unknown> = {
        scope,
        role,
        position: position.trim() || undefined,
        fullName: fullName.trim() || undefined,
      };
      if (scope === "BRANCH") {
        body.branchId = branchId;
      } else if (scope === "ORGANIZATION") {
        body.membershipKind = membershipKind;
        body.selectAllCurrentBranches = selectAllBranches;
        if (!selectAllBranches) {
          body.branchIds = [...branchIds];
        }
      }
      const result = await remcardFetch<{ invite: { url: string; id: string } }>(
        "/api/pro/invites",
        { method: "POST", body },
      );
      setLastInviteUrl(result.invite.url);
      setMessage("Ссылка создана — отправьте её сотруднику.");
      await load();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось создать приглашение");
    } finally {
      setSaving(false);
    }
  }

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

  function toggleInviteBranch(id: string) {
    setBranchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Panel title="Сотрудники и доступы">
      <p className={styles.hint}>
        Кто в команде, к каким филиалам относится сотрудник и какие права у него есть. Одна ссылка —
        один набор доступов.
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
          <ul className={`${styles.notesList} ${styles.teamSectionList}`}>
            {teamRows.map((member) => (
              <li key={member.userId}>
                <strong>{member.fullName || member.displayName}</strong>
                {member.position ? ` · ${member.position}` : ""}
                <br />
                <span className={styles.hint}>
                  {membershipLabel(member.membershipKind)}
                  {member.branchAccess.length
                    ? ` · ${member.branchAccess.map((b) => b.branchName).join(", ")}`
                    : " · без доступа к операциям филиалов"}
                  {" · "}
                  {member.branchAccess.length
                    ? [...new Set(member.branchAccess.map((b) => b.role))]
                        .map(roleLabel)
                        .join(" / ")
                    : "—"}
                </span>
                {canManage && overview.myRole === "ORG_OWNER" ? (
                  <div>
                    <Button type="button" variant="secondary" onClick={() => setEditMember(member)}>
                      Настроить доступ
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
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
            <p className={styles.hint}>Пока нет сотрудников — создайте приглашение ниже.</p>
          )}
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
                {membershipLabel(inv.membershipKind)} · {roleLabel(inv.role)}
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

      {canManage ? (
        <form onSubmit={(e) => void createInvite(e)} className={styles.fields}>
          <h3>Пригласить сотрудника</h3>
          <label className={`${styles.checkRow} ${styles.teamCheckRow}`}>
            Тип приглашения
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as typeof scope)}
            >
              {overview?.myRole === "ORG_OWNER" ? (
                <option value="ORGANIZATION">Организация (несколько филиалов / головной офис)</option>
              ) : null}
              <option value="BRANCH">На один филиал</option>
              {(overview?.myRole === "SOLO_PARTNER" ||
                (overview?.myRole === "ORG_OWNER" && overview.branches.length === 0)) && (
                <option value="SOLO_PARTNER">Команда партнёра (SOLO)</option>
              )}
            </select>
          </label>
          {scope === "ORGANIZATION" ? (
            <>
              <label className={styles.checkRow}>
                Принадлежность
                <select
                  value={membershipKind}
                  onChange={(e) =>
                    setMembershipKind(e.target.value as "BRANCH_STAFF" | "HEAD_OFFICE")
                  }
                >
                  <option value="BRANCH_STAFF">Сотрудник филиалов</option>
                  <option value="HEAD_OFFICE">Головной офис</option>
                </select>
              </label>
              {overview?.branches.length ? (
                <fieldset className={styles.fieldset}>
                  <legend>Филиалы</legend>
                  <label className={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={selectAllBranches}
                      onChange={(e) => setSelectAllBranches(e.target.checked)}
                    />
                    Выбрать все текущие филиалы
                  </label>
                  <p className={styles.hint}>
                    Новые филиалы нужно будет добавить в доступ отдельно.
                  </p>
                  {!selectAllBranches
                    ? overview.branches.map((b) => (
                        <label key={b.id} className={styles.checkRow}>
                          <input
                            type="checkbox"
                            checked={branchIds.has(b.id)}
                            onChange={() => toggleInviteBranch(b.id)}
                          />
                          {b.name} ({b.city})
                        </label>
                      ))
                    : null}
                </fieldset>
              ) : (
                <p className={styles.hint}>Без доступа к операциям филиалов.</p>
              )}
            </>
          ) : null}
          {scope === "BRANCH" && overview?.branches.length ? (
            <label className={`${styles.checkRow} ${styles.teamCheckRow}`}>
              Филиал
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {overview.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.city}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <TextField label="ФИО (необязательно)" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <label className={`${styles.checkRow} ${styles.teamCheckRow}`}>
            Роль
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <TextField label="Должность (необязательно)" value={position} onChange={(e) => setPosition(e.target.value)} />
          <Button
            type="submit"
            disabled={
              saving ||
              (scope === "BRANCH" && !branchId) ||
              (scope === "ORGANIZATION" &&
                membershipKind === "BRANCH_STAFF" &&
                !selectAllBranches &&
                branchIds.size === 0 &&
                (overview?.branches.length ?? 0) > 0)
            }
          >
            {saving ? "Создаём…" : "Пригласить сотрудника"}
          </Button>
        </form>
      ) : null}

      {invites.length > 0 && canManage ? (
        <>
          <p className={styles.hint}>Активные приглашения</p>
          <ul className={styles.notesList}>
            {invites.map((inv) => (
              <li key={inv.id}>
                {roleLabel(inv.role)} — {inv.status}{" "}
                <Button type="button" variant="secondary" onClick={() => void revokeInvite(inv.id)}>
                  Отозвать
                </Button>
                <br />
                <a href={inv.url}>{inv.url}</a>
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
    </Panel>
  );
}
