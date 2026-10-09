"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { CATALOG_STATUS_LABELS, catalogStatusTone } from "@/lib/partnership-labels";
import {
  formatBranchDirectionsSummary,
  formatWorkingHoursShort,
} from "@/lib/branch-list-format";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TextField } from "@/components/ui/FormField";
import { ProfileBranchDetail } from "./ProfileBranchDetail";
import styles from "./ProfileEditor.module.css";

type BranchRow = {
  id: string;
  name: string;
  city: string;
  address: string;
  catalogStatus: string;
  catalogPublished?: boolean;
  catalogDraft?: unknown;
  isActive?: boolean;
  workingHours?: string | null;
  specializations?: string[];
  storeCategories?: string[];
  _count?: { publicContacts?: number };
};

type OrgPayload = {
  organization: {
    id: string;
    name: string;
    branches: BranchRow[];
  } | null;
};

type ProfileBranchesSectionProps = {
  defaultCity?: string;
  hasOrganization: boolean;
  partnerType: string;
  initialBranchId?: string;
};

export function ProfileBranchesSection({
  defaultCity = "",
  hasOrganization,
  partnerType,
  initialBranchId,
}: ProfileBranchesSectionProps) {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [city, setCity] = useState(defaultCity);
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialBranchId ?? null);

  useEffect(() => {
    if (initialBranchId) setSelectedId(initialBranchId);
  }, [initialBranchId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await remcardFetch<OrgPayload>("/api/pro/organization", { method: "GET" });
      setBranches(data.organization?.branches ?? []);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить филиалы");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addBranch(event: FormEvent) {
    event.preventDefault();
    if (!hasOrganization) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await remcardFetch("/api/pro/organization/branches", {
        method: "POST",
        body: {
          city: city.trim(),
          address: address.trim(),
          name: name.trim() || undefined,
        },
      });
      setAddress("");
      setName("");
      setMessage("Филиал добавлен. Настройте адрес, направления и публикацию в карточке.");
      await load();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось создать филиал");
    } finally {
      setSaving(false);
    }
  }

  if (partnerType === "MASTER") {
    return (
      <Panel title="Филиалы" hint="Для самостоятельного специалиста филиалы не требуются.">
        <p className={styles.hint}>Раздел доступен владельцам магазинов и компаний.</p>
      </Panel>
    );
  }

  if (!hasOrganization) {
    return (
      <Panel title="Филиалы">
        <p className={styles.hint}>
          Сначала сохраните основные данные и название организации в разделе «Основные данные» — затем
          здесь можно добавить точки для клиентов remcard.ru.
        </p>
      </Panel>
    );
  }

  if (selectedId) {
    return <ProfileBranchDetail branchId={selectedId} onClose={() => setSelectedId(null)} />;
  }

  return (
    <Panel
      title="Филиалы"
      hint="Точки на карте remcard.ru: адрес, направления, контакты и расписание каждого филиала."
    >
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

      {branches.length > 0 ? (
        <ul className={styles.notesList}>
          {branches.map((b) => (
            <li key={b.id}>
              <strong>{b.name || b.address}</strong>
              <p>
                {b.city}, {b.address}
              </p>
              <p className={styles.hint}>
                {formatBranchDirectionsSummary(b.storeCategories ?? [], b.specializations ?? [])}
              </p>
              <p className={styles.hint}>Расписание: {formatWorkingHoursShort(b.workingHours)}</p>
              <p className={styles.hint}>
                Контакты: {(b._count?.publicContacts ?? 0) > 0 ? "указаны" : "не указаны"}
              </p>
              <div className={styles.statusRow}>
                <StatusBadge
                  label={b.isActive === false ? "Неактивен" : "Работает"}
                  tone={b.isActive === false ? "pending" : "active"}
                />
                <StatusBadge
                  label={CATALOG_STATUS_LABELS[b.catalogStatus] ?? b.catalogStatus}
                  tone={catalogStatusTone(b.catalogStatus)}
                />
                <StatusBadge
                  label={b.catalogPublished ? "В каталоге" : "Не опубликован"}
                  tone={b.catalogPublished ? "active" : "pending"}
                />
              </div>
              <Button type="button" variant="secondary" onClick={() => setSelectedId(b.id)}>
                Редактировать
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.hint}>
          Пока нет филиалов. Добавьте первую точку — клиенты увидят её на remcard.ru после публикации.
        </p>
      )}

      <form onSubmit={(e) => void addBranch(e)} className={styles.fields}>
        <h3 className={styles.hint}>Добавить филиал</h3>
        <TextField
          label="Название (необязательно)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField label="Город филиала" value={city} onChange={(e) => setCity(e.target.value)} required />
        <TextField
          label="Адрес"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          hint="Реальный адрес точки — без него нельзя сохранить филиал."
        />
        <Button
          type="submit"
          disabled={saving}
          onClick={(event) => {
            event.preventDefault();
            void addBranch(event);
          }}
        >
          {saving ? "Сохранение…" : "Добавить филиал"}
        </Button>
      </form>
    </Panel>
  );
}
