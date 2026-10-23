"use client";

import { useCallback, useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { formatStaffBranchLine } from "@/lib/profile-staff-cabinet";
import type { ProProfileResponse } from "@/lib/types";
import catalogStyles from "../specialist/SpecialistCatalogWizard.module.css";

type OrgBranchRow = {
  id: string;
  name: string;
  city: string;
  address: string;
};

type OrganizationCatalogPublicBranchSelectorProps = {
  profile: ProProfileResponse;
  disabled?: boolean;
  onProfileUpdated: (next: ProProfileResponse) => void;
};

export function OrganizationCatalogPublicBranchSelector({
  profile,
  disabled,
  onProfileUpdated,
}: OrganizationCatalogPublicBranchSelectorProps) {
  const [branches, setBranches] = useState<OrgBranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pinnedId = profile.organization?.publicCatalogBranchId?.trim() ?? "";

  const loadBranches = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await remcardFetch<{
        organization: { branches: OrgBranchRow[] } | null;
      }>("/api/pro/organization", { method: "GET" });
      setBranches(data.organization?.branches ?? []);
    } catch (caught) {
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить филиалы",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches, profile.organization?.id, profile.organization?.branchCount]);

  if (loading && branches.length === 0) {
    return (
      <p className={catalogStyles.fieldHint} data-testid="catalog-public-branch-loading">
        Загрузка филиалов…
      </p>
    );
  }

  if (branches.length === 0) {
    return null;
  }

  const selectValue = pinnedId || branches[0]?.id || "";

  async function onSelect(branchId: string) {
    if (branchId === selectValue || disabled) return;
    setSaving(true);
    setError("");
    try {
      await remcardFetch("/api/pro/organization", {
        method: "PATCH",
        body: { publicCatalogBranchId: branchId },
      });
      const refreshed = await remcardFetch<ProProfileResponse>("/api/pro/profile", {
        method: "GET",
      });
      onProfileUpdated(refreshed);
    } catch (caught) {
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось выбрать филиал",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className={catalogStyles.publicBranchField} data-testid="catalog-public-branch-field">
      <span className={catalogStyles.publicBranchLabel}>Текущий рабочий филиал</span>
      <select
        className={catalogStyles.publicBranchSelect}
        data-testid="catalog-public-branch-select"
        disabled={disabled || saving}
        value={selectValue}
        onChange={(e) => void onSelect(e.target.value)}
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {formatStaffBranchLine(b)}
          </option>
        ))}
      </select>
      {error ? <span className={catalogStyles.bannerError}>{error}</span> : null}
    </label>
  );
}
