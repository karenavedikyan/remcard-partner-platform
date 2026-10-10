"use client";

import { FormEvent, useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { EmployeesOverviewResponse, TeamMemberRow } from "@/lib/employees-overview-types";
import {
  effectiveActionIdsForBranch,
  memberPermissionState,
} from "@/lib/prof-i-member-permissions";
import { normalizePermissionFlags, type ProfIPermissionFlags } from "@/lib/prof-i-permissions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import { ProfileTeamPermissionMatrix } from "./ProfileTeamPermissionMatrix";
import styles from "./ProfileEditor.module.css";
import teamStyles from "./ProfileTeamPermissions.module.css";

type Props = {
  member: TeamMemberRow;
  overview: EmployeesOverviewResponse;
  onClose: () => void;
  onSaved: () => void;
};

export function ProfileTeamMemberEditor({ member, overview, onClose, onSaved }: Props) {
  const initial = memberPermissionState(member);
  const [membershipKind, setMembershipKind] = useState<"BRANCH_STAFF" | "HEAD_OFFICE">(
    member.membershipKind === "HEAD_OFFICE" ? "HEAD_OFFICE" : "BRANCH_STAFF",
  );
  const [position, setPosition] = useState(member.position ?? "");
  const [fullName, setFullName] = useState(member.fullName ?? "");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial.selectedBranchIds));
  const [defaultPermissions, setDefaultPermissions] = useState<ProfIPermissionFlags>(
    initial.defaultPermissions,
  );
  const [branchPermissions, setBranchPermissions] = useState<Record<string, ProfIPermissionFlags>>(
    initial.branchPermissions,
  );
  const [permissionsMixed, setPermissionsMixed] = useState(initial.permissionsMixed);
  const [scopeEditorBranchId, setScopeEditorBranchId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  const branchOptions = overview.branches;

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
      if (next.has(id)) {
        next.delete(id);
        setBranchPermissions((bp) => {
          const copy = { ...bp };
          delete copy[id];
          return copy;
        });
      } else next.add(id);
      return next;
    });
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
      const body: Record<string, unknown> = {
        organizationId: overview.organization.id,
        membershipKind,
        position: position.trim() || null,
        fullName: fullName.trim() || null,
        branchIds: [...selected],
        defaultPermissions,
        permissionsMixed,
      };
      if (permissionsMixed) {
        const map: Record<string, ProfIPermissionFlags> = {};
        for (const id of selected) {
          map[id] = normalizePermissionFlags(branchPermissions[id] ?? defaultPermissions);
        }
        body.branchPermissions = map;
      }
      await remcardFetch(`/api/pro/organization/team-members/${encodeURIComponent(member.userId)}`, {
        method: "PATCH",
        body,
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

  const scopeBranch = scopeEditorBranchId
    ? branchOptions.find((b) => b.id === scopeEditorBranchId)
    : null;

  if (scopeBranch) {
    const scopeFlags = normalizePermissionFlags(
      branchPermissions[scopeBranch.id] ?? defaultPermissions,
    );
    return (
      <div className={teamStyles.wizardBackdrop} role="dialog" aria-modal="true">
        <div className={teamStyles.wizardPanel}>
          <div className={teamStyles.wizardHead}>
            <h3>Права в {scopeBranch.name}</h3>
            <Button type="button" variant="secondary" onClick={() => setScopeEditorBranchId(null)}>
              Назад
            </Button>
          </div>
          <div className={teamStyles.wizardBody}>
            <ProfileTeamPermissionMatrix
              value={scopeFlags}
              onChange={(next) => {
                setDirty(true);
                setPermissionsMixed(true);
                setBranchPermissions((prev) => ({ ...prev, [scopeBranch.id]: next }));
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
      <form className={styles.modalPanel} onSubmit={(e) => void save(e)}>
        <h3>Настроить доступ</h3>
        <p className={styles.hint}>
          {member.fullName || member.displayName} · {member.publicId}
        </p>
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
          <legend>Общий набор прав</legend>
          <ProfileTeamPermissionMatrix
            value={defaultPermissions}
            onChange={(next) => {
              setDirty(true);
              setDefaultPermissions(next);
            }}
            disabled={saving || revoking}
          />
        </fieldset>
        <fieldset className={styles.fieldset}>
          <legend>Доступ к филиалам</legend>
          {branchOptions.length === 0 ? (
            <p className={styles.hint}>Без доступа к операциям филиалов (филиалов пока нет).</p>
          ) : (
            branchOptions.map((b) => {
              const count = effectiveActionIdsForBranch({
                permissionsMixed,
                defaultPermissions,
                branchPermissions,
                branchId: b.id,
              }).length;
              return (
                <div key={b.id} className={styles.chipGrid}>
                  <label className={styles.checkRow}>
                    <input
                      type="checkbox"
                      data-testid={`team-member-branch-${b.id}`}
                      checked={selected.has(b.id)}
                      onChange={() => toggleBranch(b.id)}
                    />
                    {b.name} ({b.city}){selected.has(b.id) ? ` · ${count} разрешений` : ""}
                  </label>
                  {selected.has(b.id) && permissionsMixed ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setScopeEditorBranchId(b.id)}
                    >
                      Настроить права
                    </Button>
                  ) : null}
                </div>
              );
            })
          )}
        </fieldset>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={permissionsMixed}
            onChange={(e) => {
              setDirty(true);
              const on = e.target.checked;
              setPermissionsMixed(on);
              if (on) {
                const map: Record<string, ProfIPermissionFlags> = { ...branchPermissions };
                for (const id of selected) {
                  if (!map[id]) map[id] = normalizePermissionFlags(defaultPermissions);
                }
                setBranchPermissions(map);
              }
            }}
          />
          Разные права по подразделениям
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
