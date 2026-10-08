"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { CATALOG_STATUS_LABELS } from "@/lib/partnership-labels";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { TextField } from "@/components/ui/FormField";
import styles from "./ProfileEditor.module.css";

type BranchDetail = {
  id: string;
  name: string;
  city: string;
  address: string;
  catalogStatus: string;
  catalogPublished?: boolean;
  catalogDraft?: Record<string, unknown> | null;
  isActive: boolean;
  description: string | null;
  photoUrl?: string | null;
};

type ProfileBranchDetailProps = {
  branchId: string;
  onClose: () => void;
};

export function ProfileBranchDetail({ branchId, onClose }: ProfileBranchDetailProps) {
  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await remcardFetch<{ branch: BranchDetail }>(
        `/api/pro/organization/branches/${encodeURIComponent(branchId)}`,
      );
      setBranch(data.branch);
      setCity(data.branch.city);
      setAddress(data.branch.address);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить филиал");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await remcardFetch(`/api/pro/organization/branches/${encodeURIComponent(branchId)}`, {
        method: "PATCH",
        body: { city: city.trim(), address: address.trim() },
      });
      setMessage("Сохранено");
      await load();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate() {
    if (!confirm("Отключить филиал? Точка останется в системе, но станет неактивной.")) return;
    setSaving(true);
    try {
      await remcardFetch(`/api/pro/organization/branches/${encodeURIComponent(branchId)}`, {
        method: "PATCH",
        body: { isActive: false },
      });
      setMessage("Филиал отключён");
      await load();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось отключить");
    } finally {
      setSaving(false);
    }
  }

  async function submitBranchCatalog() {
    setSaving(true);
    try {
      await remcardFetch(
        `/api/pro/organization/branches/${encodeURIComponent(branchId)}/submit-for-moderation`,
        { method: "POST", body: {} },
      );
      setMessage("Филиал отправлен на проверку для публикации");
      await load();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось отправить");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className={styles.hint}>Загружаем филиал…</p>;

  return (
    <Panel title={branch?.name ?? "Филиал"}>
      <Button type="button" variant="secondary" onClick={onClose}>
        ← К списку
      </Button>
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
      {branch ? (
        <>
          <p className={styles.hint}>
            Работа: {branch.isActive ? "активен" : "отключён"} · Каталог:{" "}
            {CATALOG_STATUS_LABELS[branch.catalogStatus] ?? branch.catalogStatus}
            {branch.catalogPublished ? " · виден посетителям" : " · не опубликован"}
            {branch.catalogDraft && Object.keys(branch.catalogDraft).length > 0
              ? " · черновик правок"
              : ""}
          </p>
          {branch.catalogPublished ? (
            <div className={styles.bannerWarn}>
              <strong>Опубликовано в каталоге</strong>
              <p>{branch.description || "— без описания —"}</p>
              {branch.catalogDraft && Object.keys(branch.catalogDraft).length > 0 ? (
                <p className={styles.hint}>
                  Черновик правок сохранён отдельно и не подменяет опубликованный текст до проверки.
                </p>
              ) : null}
            </div>
          ) : null}
          <form onSubmit={(e) => void save(e)} className={styles.fields}>
            <TextField label="Город" value={city} onChange={(e) => setCity(e.target.value)} required />
            <TextField label="Адрес" value={address} onChange={(e) => setAddress(e.target.value)} required />
            <Button type="submit" disabled={saving}>
              {saving ? "Сохранение…" : "Сохранить"}
            </Button>
          </form>
          <div className={styles.actions}>
            <Button type="button" variant="secondary" disabled={saving} onClick={() => void submitBranchCatalog()}>
              Отправить филиал на публикацию
            </Button>
            {branch.isActive ? (
              <Button type="button" variant="secondary" disabled={saving} onClick={() => void deactivate()}>
                Отключить филиал
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
    </Panel>
  );
}
