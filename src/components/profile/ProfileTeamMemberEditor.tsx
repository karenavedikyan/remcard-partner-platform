"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { EmployeesOverviewResponse, TeamMemberRow } from "@/lib/employees-overview-types";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import styles from "./ProfileEditor.module.css";

const ROLE_OPTIONS = [
  { value: "SELLER", label: "Продавец" },
  { value: "MANAGER", label: "Менеджер" },
  { value: "VIEWER", label: "Наблюдатель" },
] as const;

function roleLabel(role: string): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}

type Props = {
  member: TeamMemberRow;
  overview: EmployeesOverviewResponse;
  onClose: () => void;
  onSaved: () => void;
};

export function ProfileTeamMemberEditor({ member, overview, onClose, onSaved }: Props) {
  const [membershipKind, setMembershipKind] = useState<"BRANCH_STAFF" | "HEAD_OFFICE">(
    member.membershipKind === "HEAD_OFFICE" ? "HEAD_OFFICE" : "BRANCH_STAFF",
  );
  const [position, setPosition] = useState(member.position ?? "");
  const [fullName, setFullName] = useState(member.fullName ?? "");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(member.branchAccess.map((b) => b.branchId)),
  );
  const [roleForNew, setRoleForNew] = useState("SELLER");
  const [branchRoles, setBranchRoles] = useState<Record<string, string>>(() =>
    Object.fromEntries(member.branchAccess.map((b) => [b.branchId, b.role])),
  );
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  const branchOptions = overview.branches;

  const rolesDiffer = useMemo(() => {
    const roles = new Set(member.branchAccess.map((b) => b.role));
    return roles.size > 1;
  }, [member.branchAccess]);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function toggleBranch(id: string) {
    setDirty(true);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function changeBranchRole(branchId: string, employeeId: string, role: string) {
    setSaving(true);
    setError("");
    try {
      await remcardFetch(
        `/api/pro/organization/branches/${encodeURIComponent(branchId)}/employees/${encodeURIComponent(employeeId)}`,
        { method: "PATCH", body: { role } },
      );
      setBranchRoles((prev) => ({ ...prev, [branchId]: role }));
      onSaved();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось изменить роль");
    } finally {
      setSaving(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (membershipKind === "BRANCH_STAFF" && selected.size === 0 && branchOptions.length > 0) {
      setError("Для сотрудника филиалов выберите хотя бы один филиал");
      return;
    }
    if (
      !window.confirm(
        "Сохранить изменения доступа? Снятые филиалы перестанут быть доступны сотруднику.",
      )
    ) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await remcardFetch(`/api/pro/organization/team-members/${encodeURIComponent(member.userId)}`, {
        method: "PATCH",
        body: {
          organizationId: overview.organization.id,
          membershipKind,
          position: position.trim() || null,
          fullName: fullName.trim() || null,
          branchIds: [...selected],
          roleForNewBranches: roleForNew,
        },
      });
      onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function revokeOrg() {
    if (
      !window.confirm(
        "Отозвать доступ к организации? Сотрудник потеряет доступ ко всем филиалам сети.",
      )
    ) {
      return;
    }
    setRevoking(true);
    setError("");
    try {
      await remcardFetch(
        `/api/pro/organization/team-members/${encodeURIComponent(member.userId)}?organizationId=${encodeURIComponent(overview.organization.id)}`,
        { method: "DELETE" },
      );
      onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось отозвать");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
      <form className={styles.modalPanel} onSubmit={(e) => void save(e)}>
        <h3>Настроить доступ</h3>
        <p className={styles.hint}>
          {member.fullName || member.displayName} · {member.publicId}
        </p>
        {rolesDiffer ? (
          <p className={styles.bannerWarn}>
            Роли по филиалам различаются — меняйте каждый филиал отдельно ниже. При добавлении
            нового филиала будет роль «{roleLabel(roleForNew)}».
          </p>
        ) : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <label className={styles.checkRow}>
          Принадлежность
          <select
            value={membershipKind}
            onChange={(e) => {
              setDirty(true);
              setMembershipKind(e.target.value as "BRANCH_STAFF" | "HEAD_OFFICE");
            }}
          >
            <option value="BRANCH_STAFF">Сотрудник филиалов</option>
            <option value="HEAD_OFFICE">Головной офис</option>
          </select>
        </label>
        <TextField
          label="Должность"
          value={position}
          onChange={(e) => {
            setDirty(true);
            setPosition(e.target.value);
          }}
        />
        <TextField
          label="ФИО в команде"
          value={fullName}
          onChange={(e) => {
            setDirty(true);
            setFullName(e.target.value);
          }}
        />
        <fieldset className={styles.fieldset}>
          <legend>Доступ к филиалам</legend>
          {branchOptions.length === 0 ? (
            <p className={styles.hint}>Без доступа к операциям филиалов (филиалов пока нет).</p>
          ) : (
            branchOptions.map((b) => {
              const access = member.branchAccess.find((x) => x.branchId === b.id);
              return (
                <div key={b.id} className={styles.chipGrid}>
                  <label className={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={selected.has(b.id)}
                      onChange={() => toggleBranch(b.id)}
                    />
                    {b.name} ({b.city})
                  </label>
                  {access ? (
                    <label className={styles.checkRow}>
                      Роль в филиале
                      <select
                        value={branchRoles[b.id] ?? access.role}
                        disabled={saving || revoking}
                        onChange={(e) =>
                          void changeBranchRole(b.id, access.employeeId, e.target.value)
                        }
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              );
            })
          )}
        </fieldset>
        <label className={styles.checkRow}>
          Роль для новых филиалов
          <select
            value={roleForNew}
            onChange={(e) => {
              setDirty(true);
              setRoleForNew(e.target.value);
            }}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.modalActions}>
          <Button type="submit" disabled={saving || revoking || !dirty}>
            {saving ? "Сохраняем…" : "Сохранить"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving || revoking}>
            Отмена
          </Button>
          <Button
            type="button"
            variant="secondary"
            data-testid="team-member-revoke-org"
            disabled={saving || revoking}
            onClick={() => void revokeOrg()}
          >
            {revoking ? "…" : "Отозвать доступ к организации"}
          </Button>
        </div>
      </form>
    </div>
  );
}
