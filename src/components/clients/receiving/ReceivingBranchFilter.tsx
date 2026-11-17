"use client";

import { useEffect, useState } from "react";
import { remcardFetch } from "@/lib/api-client";
import { formatStaffBranchLine } from "@/lib/profile-staff-cabinet";

type StaffBranch = { id: string; name: string; city: string; address?: string | null };

type Props = {
  value: string | null;
  onChange: (branchId: string | null) => void;
  disabled?: boolean;
};

/**
 * Branch scope of an organization employee. Options are only the branches the server put into his own
 * `/api/pro/context`; an unbound branch can never be offered (and the server rejects it anyway).
 */
export function ReceivingBranchFilter({ value, onChange, disabled }: Props) {
  const [branches, setBranches] = useState<StaffBranch[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void remcardFetch<{ branches?: StaffBranch[] }>("/api/pro/context")
      .then((ctx) => {
        if (!cancelled) setBranches(Array.isArray(ctx.branches) ? ctx.branches : []);
      })
      .catch(() => {
        if (!cancelled) setBranches([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!branches || branches.length === 0) return null;

  if (branches.length === 1) {
    return (
      <p className="small muted" data-testid="ca-receiving-branch-single">
        Филиал: {formatStaffBranchLine(branches[0]!)}
      </p>
    );
  }

  return (
    <label className="field ca-filter" data-testid="ca-receiving-branch-filter">
      Филиал
      <select
        data-ca-input="branch"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Все мои филиалы</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {formatStaffBranchLine(b)}
          </option>
        ))}
      </select>
    </label>
  );
}
