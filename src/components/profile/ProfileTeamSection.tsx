"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import {
  canManageTeam,
  collectPendingInvites,
  type EmployeesOverviewResponse,
} from "@/lib/employees-overview-types";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { TextField } from "@/components/ui/FormField";
import { ProfileTeamEmployeeCard } from "./ProfileTeamEmployeeCard";
import styles from "./ProfileEditor.module.css";

const ROLE_OPTIONS = [
  { value: "SELLER", label: "Продавец" },
  { value: "MANAGER", label: "Менеджер" },
  { value: "VIEWER", label: "Наблюдатель" },
] as const;

function roleLabel(role: string): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}

type StaffInviteRow = {
  id: string;
  url: string;
  role: string;
  status: string;
  branchName: string | null;
  expiresAt: string;
};

export function ProfileTeamSection() {
  const [overview, setOverview] = useState<EmployeesOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scope, setScope] = useState<"BRANCH" | "SOLO_PARTNER">("BRANCH");
  const [branchId, setBranchId] = useState("");
  const [role, setRole] = useState<string>("SELLER");
  const [position, setPosition] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [lastInviteUrl, setLastInviteUrl] = useState("");
  const [invites, setInvites] = useState<StaffInviteRow[]>([]);

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
      if (data.myRole === "ORG_OWNER" && data.branches.length === 0) {
        setScope("SOLO_PARTNER");
      }
      if (canManageTeam(data)) {
        const inv = await remcardFetch<{ invites: StaffInviteRow[] }>(
          "/api/pro/invites?status=PENDING&limit=20",
        );
        setInvites(
          (inv.invites ?? []).map((row) => ({
            ...row,
            branchName: row.branchName ?? null,
          })),
        );
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

  async function createInvite(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    setLastInviteUrl("");
    try {
      const body: Record<string, unknown> = {
        scope,
        role,
        position: position.trim() || undefined,
      };
      if (scope === "BRANCH") {
        body.branchId = branchId;
      }
      const result = await remcardFetch<{ invite: { url: string; id: string } }>(
        "/api/pro/invites",
        { method: "POST", body },
      );
      setLastInviteUrl(result.invite.url);
      setMessage("Ссылка создана — отправьте её сотруднику (письмо не отправляется автоматически).");
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

  const pending = overview ? collectPendingInvites(overview) : [];
  const canManage = overview ? canManageTeam(overview) : false;

  return (
    <Panel title="Сотрудники и доступы">
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
          <p>Ссылка для сотрудника (PROF):</p>
          <code>{lastInviteUrl}</code>
          <Button
            type="button"
            onClick={() => void navigator.clipboard.writeText(lastInviteUrl)}
          >
            Копировать
          </Button>
        </div>
      ) : null}

      {overview && overview.myRole === "OTHER" ? (
        <p className={styles.hint}>Вы не управляете командой этой организации.</p>
      ) : null}

      {overview?.branches.length ? (
        <ul className={styles.notesList}>
          {overview.branches.map((branch) => (
            <li key={branch.id}>
              <strong>
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
      ) : overview && overview.myRole === "ORG_OWNER" ? (
        <p className={styles.hint}>
          Нет филиалов — можно пригласить сотрудника на SOLO_PARTNER или добавить филиал.
        </p>
      ) : null}

      {pending.length > 0 ? (
        <>
          <p className={styles.hint}>Ожидают принятия ({overview?.summary.pendingInvites ?? pending.length}):</p>
          <ul className={styles.notesList}>
            {pending.map((inv) => (
              <li key={inv.id}>
                {roleLabel(inv.role)} — до {new Date(inv.expiresAt).toLocaleDateString("ru-RU")}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {canManage ? (
        <form onSubmit={(e) => void createInvite(e)} className={styles.fields}>
          <label className={styles.checkRow}>
            Тип приглашения
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as "BRANCH" | "SOLO_PARTNER")}
            >
              <option value="BRANCH">На филиал</option>
              <option value="SOLO_PARTNER">SOLO партнёр (без филиала)</option>
            </select>
          </label>
          {scope === "BRANCH" && overview?.branches.length ? (
            <label className={styles.checkRow}>
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
          <label className={styles.checkRow}>
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
          <Button type="submit" disabled={saving || (scope === "BRANCH" && !branchId)}>
            {saving ? "Создаём…" : "Создать ссылку-приглашение"}
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
    </Panel>
  );
}
