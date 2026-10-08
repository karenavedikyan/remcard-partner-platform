"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { CATALOG_STATUS_LABELS } from "@/lib/partnership-labels";
import {
  discardBranchCatalogDraft,
  persistBranchCatalogDraft,
  submitBranchForModeration,
  unpublishBranchFromCatalog,
} from "@/lib/profile-branch-save";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { TextAreaField, TextField } from "@/components/ui/FormField";
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
  storeCategories?: string[];
};

function effectiveDescription(branch: BranchDetail): string {
  const draft = branch.catalogDraft;
  if (draft && typeof draft.description === "string") return draft.description;
  return branch.description ?? "";
}

type ProfileBranchDetailProps = {
  branchId: string;
  onClose: () => void;
};

export function ProfileBranchDetail({ branchId, onClose }: ProfileBranchDetailProps) {
  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
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
      setDescription(effectiveDescription(data.branch));
      setPhotoUrl(data.branch.photoUrl ?? "");
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить филиал");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveWorking(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await remcardFetch(`/api/pro/organization/branches/${encodeURIComponent(branchId)}`, {
        method: "PATCH",
        body: { city: city.trim(), address: address.trim() },
      });
      setMessage("Адрес сохранён");
      await load();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function saveCatalogDraft(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await persistBranchCatalogDraft(branchId, {
        description,
        photoUrl,
        storeCategories: branch?.storeCategories ?? [],
      });
      setMessage("Черновик публикации филиала сохранён");
      await load();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить черновик");
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
      await submitBranchForModeration(branchId);
      setMessage("Филиал отправлен на проверку для публикации");
      await load();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось отправить");
    } finally {
      setSaving(false);
    }
  }

  async function unpublish() {
    setSaving(true);
    try {
      await unpublishBranchFromCatalog(branchId);
      setMessage("Филиал снят с публикации в каталоге");
      await load();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось снять с публикации");
    } finally {
      setSaving(false);
    }
  }

  async function discardDraft() {
    setSaving(true);
    try {
      await discardBranchCatalogDraft(branchId);
      setMessage("Черновик правок филиала отменён");
      await load();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось отменить черновик");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className={styles.hint}>Загружаем филиал…</p>;

  const catalogLocked = branch?.catalogStatus === "PENDING";

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
              <strong>Опубликовано в каталоге (live)</strong>
              <p>{branch.description || "— без описания —"}</p>
            </div>
          ) : null}
          <form onSubmit={(e) => void saveWorking(e)} className={styles.fields}>
            <TextField label="Город" value={city} onChange={(e) => setCity(e.target.value)} required />
            <TextField label="Адрес" value={address} onChange={(e) => setAddress(e.target.value)} required />
            <Button type="submit" disabled={saving}>
              {saving ? "Сохранение…" : "Сохранить адрес"}
            </Button>
          </form>
          <form onSubmit={(e) => void saveCatalogDraft(e)} className={styles.fields}>
            <TextAreaField
              label="Описание для каталога (черновик)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={catalogLocked}
            />
            <TextField
              label="Фото URL"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              disabled={catalogLocked}
            />
            <div className={styles.actions}>
              <Button type="submit" disabled={saving || catalogLocked}>
                {saving ? "Сохранение…" : "Сохранить черновик каталога"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={saving || catalogLocked}
                onClick={() => void submitBranchCatalog()}
              >
                Отправить на публикацию
              </Button>
              {branch.catalogPublished ? (
                <Button type="button" variant="secondary" disabled={saving} onClick={() => void unpublish()}>
                  Снять с публикации
                </Button>
              ) : null}
              {branch.catalogDraft && Object.keys(branch.catalogDraft).length > 0 ? (
                <Button type="button" variant="secondary" disabled={saving} onClick={() => void discardDraft()}>
                  Отменить черновик
                </Button>
              ) : null}
            </div>
          </form>
          {branch.isActive ? (
            <Button type="button" variant="secondary" disabled={saving} onClick={() => void deactivate()}>
              Отключить филиал
            </Button>
          ) : null}
        </>
      ) : null}
    </Panel>
  );
}
