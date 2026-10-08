"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { CATALOG_STATUS_LABELS } from "@/lib/partnership-labels";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { TextField } from "@/components/ui/FormField";
import { ProfileBranchDetail } from "./ProfileBranchDetail";
import styles from "./ProfileEditor.module.css";

type BranchRow = {
  id: string;
  name: string;
  city: string;
  address: string;
  catalogStatus: string;
  isActive?: boolean;
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
};

export function ProfileBranchesSection({
  defaultCity = "",
  hasOrganization,
  partnerType,
}: ProfileBranchesSectionProps) {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [city, setCity] = useState(defaultCity);
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
        body: { city: city.trim(), address: address.trim() },
      });
      setAddress("");
      setMessage("Филиал добавлен. Он доступен для работы; публикация в каталоге — отдельно.");
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
          Сначала сохраните основные данные и название организации — затем здесь можно добавить
          точки.
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
      hint="Внутренние точки для работы. Статус «работает» не означает публикацию в каталоге RemCard."
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
                Каталог: {CATALOG_STATUS_LABELS[b.catalogStatus] ?? b.catalogStatus}
                {b.isActive === false ? " · неактивен" : ""}
              </p>
              <Button type="button" variant="secondary" onClick={() => setSelectedId(b.id)}>
                Открыть
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.hint}>Пока нет филиалов. Добавьте первую точку ниже.</p>
      )}

      <form onSubmit={(e) => void addBranch(e)} className={styles.fields}>
        <TextField label="Город филиала" value={city} onChange={(e) => setCity(e.target.value)} required />
        <TextField
          label="Адрес"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          hint="Реальный адрес точки — без него нельзя сохранить филиал."
        />
        <Button type="submit" disabled={saving}>
          {saving ? "Сохранение…" : "Добавить филиал"}
        </Button>
      </form>
    </Panel>
  );
}
