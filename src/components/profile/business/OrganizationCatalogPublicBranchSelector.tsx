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
  isActive?: boolean;
};

type OrganizationCatalogPublicBranchSelectorProps = {
  profile: ProProfileResponse;
  disabled?: boolean;
  onProfileUpdated: (next: ProProfileResponse) => void;
  /** Dev-fixture: skip GET and use in-memory branch rows for acceptance captures. */
  fixtureBranches?: OrgBranchRow[] | null;
};

export function OrganizationCatalogPublicBranchSelector({
  profile,
  disabled,
  onProfileUpdated,
  fixtureBranches,
}: OrganizationCatalogPublicBranchSelectorProps) {
  const useFixture = fixtureBranches != null;
  const [branches, setBranches] = useState<OrgBranchRow[]>(() =>
    useFixture ? (fixtureBranches ?? []) : [],
  );
  const [loading, setLoading] = useState(!useFixture);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pinnedId = profile.organization?.publicCatalogBranchId?.trim() ?? "";

  const loadBranches = useCallback(async () => {
    if (useFixture) {
      setBranches(fixtureBranches ?? []);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await remcardFetch<{
        organization: { branches: OrgBranchRow[] } | null;
      }>("/api/pro/organization", { method: "GET" });
      const rows = (data.organization?.branches ?? []).filter((b) => b.isActive !== false);
      setBranches(rows);
      if (rows.length === 0 && (data.organization?.branches?.length ?? 0) > 0) {
        setError("Нет доступных филиалов для каталога");
      }
    } catch (caught) {
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить филиалы",
      );
    } finally {
      setLoading(false);
    }
  }, [fixtureBranches, useFixture]);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches, profile.organization?.id, profile.organization?.branchCount, fixtureBranches]);

  if (loading && branches.length === 0) {
    return (
      <p className={catalogStyles.fieldHint} data-testid="catalog-public-branch-loading">
        Загрузка филиалов…
      </p>
    );
  }

  if (branches.length === 0) {
    if (error) {
      return (
        <p className={catalogStyles.bannerError} data-testid="catalog-public-branch-error" role="alert">
          {error}
        </p>
      );
    }
    return null;
  }

  const selectValue = pinnedId || branches[0]?.id || "";

  async function onSelect(branchId: string) {
    if (branchId === selectValue || disabled) return;
    if (fixtureBranches != null) {
      const branch = branches.find((b) => b.id === branchId);
      if (!branch || !profile.organization) return;
      onProfileUpdated({
        ...profile,
        organization: {
          ...profile.organization,
          publicCatalogBranchId: branchId,
          publicCatalogCity: branch.city,
        },
      });
      return;
    }
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
