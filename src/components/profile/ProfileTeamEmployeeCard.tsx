"use client";

import { useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { EmployeesOverviewResponse } from "@/lib/employees-overview-types";
import { Button } from "@/components/ui/Button";
import styles from "./ProfileEditor.module.css";

const ROLE_OPTIONS = [
  { value: "SELLER", label: "Продавец" },
  { value: "MANAGER", label: "Менеджер" },
  { value: "VIEWER", label: "Наблюдатель" },
] as const;

type BranchEmployee = EmployeesOverviewResponse["branches"][number]["employees"][number];

type Props = {
  branchId: string;
  branchName: string;
  employee: BranchEmployee;
  allBranches: EmployeesOverviewResponse["branches"];
  canManage: boolean;
  isOwner: boolean;
  onChanged: () => Promise<void>;
};

export function ProfileTeamEmployeeCard({
  branchId,
  branchName,
  employee,
  allBranches,
  canManage,
  isOwner,
  onChanged,
}: Props) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(employee.role);
  const [targetBranchId, setTargetBranchId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function saveRole() {
    setBusy(true);
    setError("");
    try {
      await remcardFetch(
        `/api/pro/organization/branches/${encodeURIComponent(branchId)}/employees/${encodeURIComponent(employee.id)}`,
        { method: "PATCH", body: { role } },
      );
      await onChanged();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить роль");
    } finally {
      setBusy(false);
    }
  }

  async function transfer() {
    if (!targetBranchId) return;
    setBusy(true);
    setError("");
    try {
      await remcardFetch(
        `/api/pro/organization/branches/${encodeURIComponent(branchId)}/employees/${encodeURIComponent(employee.id)}/transfer`,
        { method: "POST", body: { targetBranchId, role } },
      );
      await onChanged();
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось перевести");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    setError("");
    try {
      await remcardFetch(
        `/api/pro/organization/branches/${encodeURIComponent(branchId)}/employees/${encodeURIComponent(employee.id)}`,
        { method: "DELETE" },
      );
      await onChanged();
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось отозвать доступ");
    } finally {
      setBusy(false);
    }
  }

  const label =
    employee.user.displayName ?? employee.fullName ?? employee.user.publicId ?? "Сотрудник";

  return (
    <li>
      <Button type="button" variant="secondary" onClick={() => setOpen((v) => !v)}>
        {label} — {ROLE_OPTIONS.find((r) => r.value === employee.role)?.label ?? employee.role}
      </Button>
      {open ? (
        <div className={styles.fields}>
          <p className={styles.hint}>
            Филиал: {branchName}. Права задаются ролью на сервере; недоступные действия отклоняются API.
          </p>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          {canManage ? (
            <>
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
            </>
          ) : null}
          {isOwner && allBranches.length > 1 ? (
            <>
              <label className={styles.checkRow}>
                Перевод в филиал
                <select value={targetBranchId} onChange={(e) => setTargetBranchId(e.target.value)}>
                  <option value="">Выберите…</option>
                  {allBranches
                    .filter((b) => b.id !== branchId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} — {b.city}
                      </option>
                    ))}
                </select>
              </label>
              <Button type="button" variant="secondary" disabled={busy || !targetBranchId} onClick={() => void transfer()}>
                Перевести
              </Button>
            </>
          ) : null}
          {canManage ? (
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void revoke()}>
              Отозвать доступ
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
