"use client";

import { useCallback, useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { formatStaffBranchLine } from "@/lib/profile-staff-cabinet";
import styles from "../profile/ProfileEditor.module.css";

type ProContextPayload = {
  role: string;
  branches: Array<{ id: string; name: string; city: string; address?: string | null }>;
};

type Props = {
  selectedBranchId: string | null;
  onBranchSaved: () => void;
};

/** Explicit owner branch choice via existing PATCH /api/pro/context (no GET side effects). */
export function BusinessHomeBranchPicker({ selectedBranchId, onBranchSaved }: Props) {
  const [branches, setBranches] = useState<ProContextPayload["branches"]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await remcardFetch<ProContextPayload>("/api/pro/context");
      if (data.role !== "ORG_OWNER") {
        setBranches([]);
        return;
      }
      setBranches(data.branches);
      setError("");
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить филиалы");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (branches.length <= 1) return null;

  async function onChange(branchId: string) {
    if (!branchId || branchId === selectedBranchId) return;
    setSaving(true);
    setError("");
    try {
      await remcardFetch("/api/pro/context", { method: "PATCH", body: { branchId } });
      onBranchSaved();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось выбрать филиал");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.branchContextCheckRow} style={{ marginBottom: "1rem" }}>
      <label className={styles.checkRow}>
        <span className={styles.branchContextLabel}>Текущий филиал для продаж</span>
        <select
          className={styles.branchContextSelect}
          data-testid="business-home-branch-select"
          disabled={saving}
          value={selectedBranchId ?? ""}
          onChange={(e) => void onChange(e.target.value)}
        >
          <option value="" disabled>
            Выберите филиал
          </option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {formatStaffBranchLine(b)}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
