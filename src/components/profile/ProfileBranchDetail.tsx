"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { CATALOG_STATUS_LABELS, catalogStatusTone } from "@/lib/partnership-labels";
import { buildBranchPreviewModel } from "@/lib/branch-catalog-preview";
import {
  emptyWeekSchedule,
  parseBranchWorkingHours,
  serializeBranchWorkingHours,
  type BranchDayKey,
  type BranchDaySchedule,
} from "@/lib/branch-working-hours";
import {
  branchContactsFromRows,
  emptyBranchContactsForm,
  persistBranchPublicContacts,
  contactSaveErrorMessage,
  type BranchContactsForm,
  type OrgPublicContactRow,
} from "@/lib/branch-public-contacts";
import {
  branchSaveErrorMessage,
  discardBranchCatalogDraft,
  persistBranchWorkingAndCatalog,
  submitBranchForModeration,
  unpublishBranchFromCatalog,
} from "@/lib/profile-branch-save";
import { BranchCatalogPublicationPreview } from "./BranchCatalogPublicationPreview";
import { ProfileBranchContactsSection } from "./ProfileBranchContactsSection";
import { ProfileBranchScheduleEditor } from "./ProfileBranchScheduleEditor";
import { ProfileDirectionsPicker } from "./ProfileDirectionsPicker";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
  workingHours?: string | null;
  specializations?: string[];
  storeCategories?: string[];
  publicContacts?: { type: string; value: string; isActive: boolean }[];
};

type OrgSnapshot = {
  specializations: string[];
  storeCategories: string[];
  publicContacts: OrgPublicContactRow[];
  storeWorkingHours: string | null;
};

function draftField<T>(branch: BranchDetail, key: keyof BranchDetail, fallback: T): T {
  const d = branch.catalogDraft;
  if (d && key in d && d[key as string] !== undefined) {
    return d[key as string] as T;
  }
  const live = branch[key];
  return (live ?? fallback) as T;
}

type ProfileBranchDetailProps = {
  branchId: string;
  onClose: () => void;
};

export function ProfileBranchDetail({ branchId, onClose }: ProfileBranchDetailProps) {
  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [orgSnap, setOrgSnap] = useState<OrgSnapshot | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [storeCategories, setStoreCategories] = useState<string[]>([]);
  const [contacts, setContacts] = useState<BranchContactsForm>(() => emptyBranchContactsForm());
  const [scheduleLegacy, setScheduleLegacy] = useState("");
  const [scheduleUseLegacy, setScheduleUseLegacy] = useState(false);
  const [scheduleDays, setScheduleDays] = useState(() => emptyWeekSchedule());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const savedSnapshot = useRef("");

  const applyBranchToForm = useCallback((b: BranchDetail) => {
    setName(b.name);
    setCity(b.city);
    setAddress(b.address);
    setDescription(String(draftField(b, "description", b.description ?? "") ?? ""));
    setPhotoUrl(String(draftField(b, "photoUrl", b.photoUrl ?? "") ?? ""));
    setSpecializations([...(draftField(b, "specializations", b.specializations ?? []) as string[])]);
    setStoreCategories([...(draftField(b, "storeCategories", b.storeCategories ?? []) as string[])]);
    setContacts(branchContactsFromRows(b.publicContacts ?? []));
    const wh = b.workingHours ?? "";
    const parsed = parseBranchWorkingHours(wh);
    if (parsed.mode === "legacy") {
      setScheduleUseLegacy(true);
      setScheduleLegacy(parsed.text);
      setScheduleDays(emptyWeekSchedule());
    } else {
      setScheduleUseLegacy(false);
      setScheduleLegacy("");
      setScheduleDays(parsed.days);
    }
    savedSnapshot.current = JSON.stringify({
      name: b.name,
      city: b.city,
      address: b.address,
      description: String(draftField(b, "description", b.description ?? "") ?? ""),
      wh,
      specializations: draftField(b, "specializations", b.specializations ?? []),
      storeCategories: draftField(b, "storeCategories", b.storeCategories ?? []),
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [branchRes, orgRes, profileRes] = await Promise.all([
        remcardFetch<{ branch: BranchDetail; isOwner: boolean }>(
          `/api/pro/organization/branches/${encodeURIComponent(branchId)}`,
        ),
        remcardFetch<{
          organization: {
            specializations?: string[];
            storeCategories?: string[];
            publicContacts?: OrgPublicContactRow[];
          } | null;
        }>("/api/pro/organization"),
        remcardFetch<{ user?: { storeWorkingHours?: string | null } }>("/api/pro/profile"),
      ]);
      setBranch(branchRes.branch);
      setIsOwner(branchRes.isOwner);
      applyBranchToForm(branchRes.branch);
      const org = orgRes.organization;
      setOrgSnap({
        specializations: org?.specializations ?? [],
        storeCategories: org?.storeCategories ?? [],
        publicContacts: org?.publicContacts ?? [],
        storeWorkingHours: profileRes.user?.storeWorkingHours?.trim() || null,
      });
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить филиал");
    } finally {
      setLoading(false);
    }
  }, [applyBranchToForm, branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const workingHoursValue = useMemo(() => {
    if (scheduleUseLegacy) return scheduleLegacy.trim() || null;
    return serializeBranchWorkingHours(scheduleDays);
  }, [scheduleDays, scheduleLegacy, scheduleUseLegacy]);

  const dirty = useMemo(() => {
    const snap = JSON.stringify({
      name,
      city,
      address,
      description,
      wh: workingHoursValue,
      specializations,
      storeCategories,
    });
    return snap !== savedSnapshot.current;
  }, [
    address,
    city,
    description,
    name,
    specializations,
    storeCategories,
    workingHoursValue,
  ]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const catalogLocked = branch?.catalogStatus === "PENDING";

  async function saveAll(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await persistBranchWorkingAndCatalog(branchId, {
        name,
        city,
        address,
        description,
        photoUrl,
        workingHours: workingHoursValue,
        specializations,
        storeCategories,
      });
      await persistBranchPublicContacts(branchId, contacts);
      setMessage("Черновик филиала сохранён");
      await load();
    } catch (caught) {
      setError(contactSaveErrorMessage(caught) || branchSaveErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  function copyOrgDirections() {
    if (!orgSnap) return;
    if (orgSnap.specializations.length) setSpecializations([...orgSnap.specializations]);
    if (orgSnap.storeCategories.length) setStoreCategories([...orgSnap.storeCategories]);
  }

  function copyOrgSchedule() {
    if (!orgSnap?.storeWorkingHours) return;
    const parsed = parseBranchWorkingHours(orgSnap.storeWorkingHours);
    if (parsed.mode === "legacy") {
      setScheduleUseLegacy(true);
      setScheduleLegacy(parsed.text);
    } else {
      setScheduleUseLegacy(false);
      setScheduleDays(parsed.days);
    }
  }

  function applyScheduleToWorkingDays() {
    const template = scheduleDays.mon;
    const next = { ...scheduleDays };
    for (const key of Object.keys(next) as BranchDayKey[]) {
      if (!next[key].closed) {
        next[key] = { ...next[key], open: template.open, close: template.close };
      }
    }
    setScheduleDays(next);
  }

  async function submitBranchCatalog() {
    setSaving(true);
    try {
      await submitBranchForModeration(branchId);
      setMessage("Филиал отправлен на проверку");
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
      setMessage("Черновик правок отменён");
      await load();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось отменить черновик");
    } finally {
      setSaving(false);
    }
  }

  const previewModel = buildBranchPreviewModel({
    name,
    city,
    address,
    description,
    workingHours: workingHoursValue ?? "",
    storeCategories,
    specializations,
    photoUrl,
    contacts,
  });

  if (loading) return <p className={styles.hint}>Загружаем филиал…</p>;

  const submitLabel =
    branch?.catalogStatus === "NEEDS_REVISION" ? "Отправить повторно" : "Отправить на проверку";

  return (
    <>
      <Panel title={branch?.name ?? "Филиал"}>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (dirty && !confirm("Есть несохранённые изменения. Выйти без сохранения?")) return;
            onClose();
          }}
        >
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
            <div className={styles.statusRow}>
              <StatusBadge
                label={`Работа: ${branch.isActive ? "активен" : "отключён"}`}
                tone={branch.isActive ? "active" : "pending"}
              />
              <StatusBadge
                label={CATALOG_STATUS_LABELS[branch.catalogStatus] ?? branch.catalogStatus}
                tone={catalogStatusTone(branch.catalogStatus)}
              />
              <StatusBadge
                label={branch.catalogPublished ? "Виден в каталоге" : "Не опубликован"}
                tone={branch.catalogPublished ? "active" : "pending"}
              />
            </div>
            <form onSubmit={(e) => void saveAll(e)} className={styles.fields}>
              <Panel title="О филиале">
                <TextField label="Название" value={name} onChange={(e) => setName(e.target.value)} required />
                <TextAreaField
                  label="Описание для каталога"
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
              </Panel>

              <Panel title="Где находится">
                <TextField label="Город" value={city} onChange={(e) => setCity(e.target.value)} required />
                <TextField label="Адрес" value={address} onChange={(e) => setAddress(e.target.value)} required />
              </Panel>

              <Panel title="Товары и услуги">
                <Button type="button" variant="secondary" disabled={catalogLocked} onClick={copyOrgDirections}>
                  Заполнить направлениями организации
                </Button>
                <ProfileDirectionsPicker
                  catalogMode
                  productCategoryIds={storeCategories}
                  serviceSpecializationIds={specializations}
                  navigatorStageIds={[]}
                  primaryDirection={null}
                  disabled={catalogLocked}
                  onChangeProducts={setStoreCategories}
                  onChangeServices={setSpecializations}
                  onChangeStages={() => {}}
                  onChangePrimary={() => {}}
                />
              </Panel>

              <Panel title="Контакты филиала">
                <ProfileBranchContactsSection
                  form={contacts}
                  orgContacts={orgSnap?.publicContacts ?? []}
                  disabled={catalogLocked}
                  onChange={setContacts}
                />
              </Panel>

              <Panel title="Расписание">
                {orgSnap?.storeWorkingHours ? (
                  <Button type="button" variant="secondary" disabled={catalogLocked} onClick={copyOrgSchedule}>
                    Заполнить расписанием организации
                  </Button>
                ) : (
                  <p className={styles.hint}>У организации пока нет сохранённого расписания в публичном профиле.</p>
                )}
                <ProfileBranchScheduleEditor
                  legacyText={scheduleLegacy}
                  days={scheduleDays}
                  useLegacy={scheduleUseLegacy}
                  disabled={catalogLocked}
                  onUseLegacyChange={(legacy, text) => {
                    setScheduleUseLegacy(legacy);
                    if (legacy) setScheduleLegacy(text);
                    else {
                      const parsed = parseBranchWorkingHours(text);
                      if (parsed.mode === "grid") setScheduleDays(parsed.days);
                    }
                  }}
                  onDaysChange={setScheduleDays}
                  onApplyToAllWorking={applyScheduleToWorkingDays}
                />
              </Panel>

              <Panel title="Публикация и предпросмотр">
                <div className={styles.actions}>
                  <Button type="submit" disabled={saving || catalogLocked}>
                    {saving ? "Сохранение…" : "Сохранить черновик"}
                  </Button>
                  {isOwner ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={saving || catalogLocked}
                      onClick={() => void submitBranchCatalog()}
                    >
                      {submitLabel}
                    </Button>
                  ) : null}
                  <Button type="button" variant="secondary" onClick={() => setPreviewOpen((v) => !v)}>
                    {previewOpen ? "Скрыть предпросмотр" : "Предпросмотр"}
                  </Button>
                  {branch.catalogPublished && isOwner ? (
                    <Button type="button" variant="secondary" disabled={saving} onClick={() => void unpublish()}>
                      Снять с публикации
                    </Button>
                  ) : null}
                  {branch.catalogDraft && Object.keys(branch.catalogDraft).length > 0 && isOwner ? (
                    <Button type="button" variant="secondary" disabled={saving} onClick={() => void discardDraft()}>
                      Отменить изменения
                    </Button>
                  ) : null}
                </div>
              </Panel>
            </form>
            {previewOpen ? <BranchCatalogPublicationPreview model={previewModel} /> : null}
            {branch.isActive && isOwner ? (
              <Button type="button" variant="secondary" disabled={saving} onClick={() => void deactivate(branchId, load, setSaving, setError, setMessage)}>
                Отключить филиал (не публикация)
              </Button>
            ) : null}
          </>
        ) : null}
      </Panel>
    </>
  );
}

async function deactivate(
  branchId: string,
  load: () => Promise<void>,
  setSaving: (v: boolean) => void,
  setError: (v: string) => void,
  setMessage: (v: string) => void,
) {
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
