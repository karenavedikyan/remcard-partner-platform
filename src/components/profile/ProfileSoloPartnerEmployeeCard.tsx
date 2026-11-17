"use client";

import { useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { normalizePermissionFlags, type ProfIPermissionFlags } from "@/lib/prof-i-permissions";
import { ProfileTeamPermissionMatrix } from "./ProfileTeamPermissionMatrix";
import styles from "./ProfileEditor.module.css";

const ROLE_OPTIONS = [
  { value: "SELLER", label: "Продавец" },
  { value: "MANAGER", label: "Менеджер" },
  { value: "VIEWER", label: "Наблюдатель" },
] as const;

export type SoloPartnerEmployeeRow = {
  id: string;
  role: string;
  status: string;
  position: string | null;
  /** Persisted rights for the current role; null = never saved by the owner (no rights yet). */
  permissions?: Record<string, boolean> | null;
  user: {
    id: string;
    displayName: string | null;
    publicId: string | null;
    photoUrl: string | null;
  };
};

type Props = {
  employee: SoloPartnerEmployeeRow;
  onChanged: () => Promise<void>;
  /** Owner of an organization: the employee works in the head-office contour, never in a branch. */
  organization?: boolean;
};

export function ProfileSoloPartnerEmployeeCard({ employee, onChanged, organization = false }: Props) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(employee.role);
  const [permissions, setPermissions] = useState<ProfIPermissionFlags>(() =>
    normalizePermissionFlags((employee.permissions ?? {}) as Partial<ProfIPermissionFlags>),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const label =
    employee.user.displayName ?? employee.user.publicId ?? employee.user.id;

  async function saveRole() {
    setBusy(true);
    setError("");
    try {
      await remcardFetch(`/api/pro/employees/${encodeURIComponent(employee.id)}`, {
        method: "PATCH",
        body: { role, permissions },
      });
      await onChanged();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить роль");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    setError("");
    try {
      await remcardFetch(`/api/pro/employees/${encodeURIComponent(employee.id)}`, {
        method: "DELETE",
      });
      await onChanged();
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось отозвать доступ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li>
      <Button type="button" variant="secondary" onClick={() => setOpen((v) => !v)}>
        {label} — {ROLE_OPTIONS.find((r) => r.value === employee.role)?.label ?? employee.role}
        {employee.status !== "ACTIVE" ? ` (${employee.status})` : ""}
      </Button>
      {open ? (
        <div className={styles.fields}>
          <p className={styles.hint}>
            {organization
              ? "Сотрудник привязан к вашему профилю, не к филиалу: работает с головной организацией."
              : "SOLO-партнёр: сотрудник привязан к вашему профилю, не к филиалу."}
          </p>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
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
          <p className={styles.hint}>
            {employee.permissions
              ? "Права сотрудника:"
              : "Права ещё не заданы — пока вы их не сохраните, сотрудник работает без разрешений."}{" "}
            После смены роли отметьте права заново.
          </p>
          <ProfileTeamPermissionMatrix
            value={permissions}
            onChange={setPermissions}
            disabled={busy}
            idPrefix={`solo-emp-${employee.id}`}
          />
          <Button type="button" disabled={busy} onClick={() => void saveRole()}>
            Сохранить роль и права
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void revoke()}>
            Отозвать доступ
          </Button>
        </div>
      ) : null}
    </li>
  );
}
