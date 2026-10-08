"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { TextField } from "@/components/ui/FormField";
import styles from "./ProfileEditor.module.css";

type EmployeeRow = {
  id: string;
  role: string;
  fullName: string | null;
  user: { displayName: string | null; publicId: string };
};

type PendingInvite = {
  id: string;
  email: string | null;
  status: string;
  expiresAt: string;
};

type Overview = {
  role: string;
  organization: { id: string; name: string } | null;
  branches: Array<{
    id: string;
    name: string;
    city: string;
    employees: EmployeeRow[];
  }>;
  pendingInvites: PendingInvite[];
};

export function ProfileTeamSection() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [branchId, setBranchId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await remcardFetch<Overview>("/api/pro/organization/employees-overview");
      setOverview(data);
      if (!branchId && data.branches[0]?.id) {
        setBranchId(data.branches[0].id);
      }
    } catch (caught) {
      if (caught instanceof RemcardApiError && caught.status === 403) {
        setOverview(null);
        setError("Управление командой доступно владельцу или менеджеру с правами.");
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

  async function sendInvite(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await remcardFetch("/api/pro/invites", {
        method: "POST",
        body: {
          scope: "BRANCH",
          branchId,
          email: inviteEmail.trim(),
          role: "SELLER",
        },
      });
      setInviteEmail("");
      setMessage("Приглашение создано. Отправьте ссылку сотруднику из кабинета RemCard.");
      await load();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось создать приглашение");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title="Сотрудники и доступы" hint="Приглашения используют существующий механизм RemCard StaffInvite.">
      {loading ? <p className={styles.hint}>Загружаем…</p> : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className={styles.success} role="status">
          {message}
        </p>
      ) : null}

      {overview?.branches.length ? (
        <>
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
                      <li key={emp.id}>
                        {emp.user.displayName ?? emp.fullName ?? emp.user.publicId} — {emp.role}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {overview.pendingInvites.length > 0 ? (
            <>
              <p className={styles.hint}>Ожидают принятия:</p>
              <ul className={styles.notesList}>
                {overview.pendingInvites.map((inv) => (
                  <li key={inv.id}>
                    {inv.email ?? "приглашение"} — {inv.status}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <form onSubmit={(e) => void sendInvite(e)} className={styles.fields}>
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
            <TextField
              label="Email сотрудника"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            <Button type="submit" disabled={saving || !branchId}>
              {saving ? "Отправка…" : "Пригласить сотрудника"}
            </Button>
          </form>
        </>
      ) : overview ? (
        <p className={styles.hint}>Добавьте филиал, чтобы приглашать сотрудников на точку.</p>
      ) : null}
    </Panel>
  );
}
