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
  /** When true, show picker even for a single branch (e.g. invalid stale cookie). */
  branchSelectionRequired: boolean;
  onBranchSelected: (branchId: string) => void;
};

/**
 * Store home branch choice: read-only context list + local selection passed as GET metrics ?branchId=.
 * Does not PATCH /api/pro/context (prof-test allowlist is GET-only there).
 */
export function BusinessHomeBranchPicker({
  selectedBranchId,
  branchSelectionRequired,
  onBranchSelected,
}: Props) {
  const [branches, setBranches] = useState<ProContextPayload["branches"]>([]);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

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

  if (branches.length === 0) return null;
  if (branches.length === 1 && !branchSelectionRequired) return null;

  async function onChange(branchId: string) {
    if (!branchId || branchId === selectedBranchId) return;
    setPendingId(branchId);
    setError("");
    try {
      onBranchSelected(branchId);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось выбрать филиал");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className={styles.branchContextCheckRow} style={{ marginBottom: "1rem" }}>
      <label className={styles.checkRow}>
        <span className={styles.branchContextLabel}>Текущий филиал для продаж</span>
        <select
          className={styles.branchContextSelect}
          data-testid="business-home-branch-select"
          disabled={pendingId !== null}
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
