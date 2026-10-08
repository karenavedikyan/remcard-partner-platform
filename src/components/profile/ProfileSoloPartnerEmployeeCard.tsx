"use client";

import { useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
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
};

export function ProfileSoloPartnerEmployeeCard({ employee, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(employee.role);
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
        body: { role },
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
          <p className={styles.hint}>SOLO-партнёр: сотрудник привязан к вашему профилю, не к филиалу.</p>
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
          <Button type="button" disabled={busy} onClick={() => void saveRole()}>
            Сохранить роль
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void revoke()}>
            Отозвать доступ
          </Button>
        </div>
      ) : null}
    </li>
  );
}
