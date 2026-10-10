"use client";

import { useCallback, useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import styles from "./ProfileEditor.module.css";

type ProContextPayload = {
  role: string;
  branches: Array<{ id: string; name: string; city: string }>;
  activeBranch: { id: string; name: string; city: string } | null;
  organization: { name: string } | null;
};

export function ProfileBranchContextSwitcher() {
  const [ctx, setCtx] = useState<ProContextPayload | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await remcardFetch<ProContextPayload>("/api/pro/context");
      setCtx(data);
      setError("");
    } catch (caught) {
      if (caught instanceof RemcardApiError && caught.status === 403) {
        setCtx(null);
        return;
      }
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить контекст");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!ctx || ctx.branches.length <= 1) {
    if (ctx?.role === "ORG_TEAM_MEMBER" && ctx.branches.length === 0) {
      return (
        <p className={styles.hint}>
          {ctx.organization?.name ?? "Компания"} · головной офис · операции филиалов недоступны
        </p>
      );
    }
    return null;
  }

  const activeId = ctx.activeBranch?.id ?? ctx.branches[0]?.id ?? "";

  async function onChange(branchId: string) {
    setSaving(true);
    setError("");
    try {
      await remcardFetch("/api/pro/context", { method: "PATCH", body: { branchId } });
      await load();
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось переключить филиал");
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className={styles.checkRow}>
      Рабочий филиал
      <select
        disabled={saving}
        value={activeId}
        onChange={(e) => void onChange(e.target.value)}
      >
        {ctx.branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} ({b.city})
          </option>
        ))}
      </select>
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
