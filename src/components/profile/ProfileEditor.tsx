"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RemcardApiError } from "@/lib/api-client";
import {
  CATALOG_STATUS_LABELS,
  catalogStatusTone,
} from "@/lib/partnership-labels";
import { ONBOARDING_STAGES } from "@/lib/onboarding-stages";
import { storeCategoryChips } from "@/lib/store-categories";
import {
  effectiveCatalogStatus,
  catalogPublicationEditable,
  profileBasicsEditable,
  showRevisionBanner,
} from "@/lib/profile-catalog-state";
import { type ProfileDraft } from "@/lib/profile-save";
import {
  persistWorkingProfileDraft,
  validateWorkingProfileDraft,
  workingProfileMissingFields,
} from "@/lib/profile-working-save";
import { ProfileBranchesSection } from "./ProfileBranchesSection";
import { ProfileCatalogSection } from "./ProfileCatalogSection";
import { ProfileTeamSection } from "./ProfileTeamSection";
import type { ProProfileResponse } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { SelectField, TextAreaField, TextField } from "@/components/ui/FormField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { NotificationSettingsPanel } from "./NotificationSettingsPanel";
import styles from "./ProfileEditor.module.css";

const PARTNER_TYPES = [
  { value: "MASTER", label: "Специалист" },
  { value: "COMPANY", label: "Компания" },
  { value: "STORE", label: "Магазин" },
] as const;

const STORE_CATEGORY_CHIPS = storeCategoryChips();

type ModerationNote = {
  id: string;
  comment: string;
  createdAt: string;
  attachments: string[];
  resolvedAt: string | null;
};

export type ProfileSectionId =
  | "basics"
  | "branches"
  | "team"
  | "catalog"
  | "notifications";

const PROFILE_SECTIONS: { id: ProfileSectionId; label: string }[] = [
  { id: "basics", label: "Основные данные" },
  { id: "branches", label: "Филиалы" },
  { id: "team", label: "Сотрудники" },
  { id: "catalog", label: "Публикация" },
  { id: "notifications", label: "Уведомления" },
];

type ProfileEditorProps = {
  initial: ProProfileResponse;
  moderationSection?: boolean;
  returnTo?: string | null;
  section?: ProfileSectionId;
};

type ExtendedUser = ProProfileResponse["user"] & {
  telegramLinked?: boolean;
  maxLinked?: boolean;
  notificationSettings?: unknown;
};

export function ProfileEditor({
  initial,
  moderationSection,
  returnTo,
  section: sectionProp = "basics",
}: ProfileEditorProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initial);
  const user = profile.user as ExtendedUser;

  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [city, setCity] = useState(user.city ?? "");
  const [description, setDescription] = useState(user.description ?? "");
  const [partnerType, setPartnerType] = useState(user.partnerType ?? "MASTER");
  const [specializations, setSpecializations] = useState<string[]>(user.specializations ?? []);
  const [storeCategories, setStoreCategories] = useState<string[]>(user.storeCategories ?? []);
  const [organizationName, setOrganizationName] = useState(profile.organization?.name ?? "");
  const [branchAddress, setBranchAddress] = useState("");
  const [website, setWebsite] = useState(user.website ?? "");
  const [telegram, setTelegram] = useState(user.telegram ?? "");
  const [publicEmail, setPublicEmail] = useState(user.publicEmail ?? "");
  const [publicPhone, setPublicPhone] = useState(user.publicPhone ?? "");

  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<ProfileSectionId>(
    moderationSection ? "catalog" : sectionProp,
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notes, setNotes] = useState<ModerationNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState("");

  const catalogStatus = effectiveCatalogStatus(profile);
  const basicsEditable = profileBasicsEditable(profile);
  const catalogEditable = catalogPublicationEditable(profile);
  const revisionBanner = showRevisionBanner(profile);

  const needsBranchFields =
    (partnerType === "STORE" || partnerType === "COMPANY") &&
    (!profile.organization || (profile.organization.branchCount ?? 0) === 0);

  const buildDraft = useCallback((): ProfileDraft => {
    return {
      displayName,
      city,
      description,
      partnerType,
      specializations,
      storeCategories,
      organizationName,
      branchAddress,
      website,
      telegram,
      publicEmail,
      publicPhone,
    };
  }, [
    branchAddress,
    city,
    description,
    displayName,
    organizationName,
    partnerType,
    publicEmail,
    publicPhone,
    specializations,
    storeCategories,
    telegram,
    website,
  ]);

  const applyProfile = useCallback((next: ProProfileResponse) => {
    setProfile(next);
    const u = next.user as ExtendedUser;
    setDisplayName(u.displayName ?? "");
    setCity(u.city ?? "");
    setDescription(u.description ?? "");
    setPartnerType(u.partnerType ?? "MASTER");
    setSpecializations(u.specializations ?? []);
    setStoreCategories(u.storeCategories ?? []);
    setOrganizationName(next.organization?.name ?? "");
    setWebsite(u.website ?? "");
    setTelegram(u.telegram ?? "");
    setPublicEmail(u.publicEmail ?? "");
    setPublicPhone(u.publicPhone ?? "");
  }, []);

  const loadNotes = useCallback(async () => {
    if (catalogStatus === "APPROVED" && !moderationSection) return;
    setNotesLoading(true);
    setNotesError("");
    try {
      const data = await remcardFetchNotes();
      setNotes(Array.isArray(data.notes) ? data.notes : []);
    } catch {
      setNotesError("Не удалось загрузить замечания модератора.");
    } finally {
      setNotesLoading(false);
    }
  }, [catalogStatus, moderationSection]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    applyProfile(initial);
  }, [initial, applyProfile]);

  const openNotes = useMemo(() => notes.filter((n) => !n.resolvedAt), [notes]);

  function toggleSpec(id: string) {
    setSpecializations((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function toggleCategory(value: string) {
    setStoreCategories((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!basicsEditable) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const next = await persistWorkingProfileDraft(profile, buildDraft());
      applyProfile(next);
      setSuccess("Данные сохранены");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить профиль");
    } finally {
      setSaving(false);
    }
  }

  const statusLabel = CATALOG_STATUS_LABELS[catalogStatus] ?? catalogStatus;
  const showBack =
    returnTo && returnTo !== "/profile" && returnTo.startsWith("/") && !returnTo.startsWith("//");

  const workingMissing = workingProfileMissingFields(buildDraft());
  const workingComplete = validateWorkingProfileDraft(buildDraft()) === null;

  return (
    <div className={styles.grid} id={moderationSection ? "moderation-remarks" : undefined}>
      {showBack ? (
        <p className={styles.hint}>
          <Link href={returnTo}>← Вернуться к предыдущему разделу</Link>
        </p>
      ) : null}

      <nav className={styles.chipGrid} aria-label="Разделы профиля">
        {PROFILE_SECTIONS.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={activeSection === item.id ? "primary" : "secondary"}
            onClick={() => setActiveSection(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </nav>

      <div className={styles.main}>
        {revisionBanner && activeSection === "catalog" ? (
          <div className={styles.bannerWarn} role="status">
            <strong>Нужно исправить публикацию в каталоге</strong>
            <p>Внесите правки в разделе «Публикация», сохраните черновик и отправьте повторно.</p>
            {profile.user.rejectionReason ? <p>{profile.user.rejectionReason}</p> : null}
          </div>
        ) : null}

        {activeSection === "basics" ? (
        <form onSubmit={saveProfile}>
        <Panel title="Основные данные" hint="Эти данные нужны для работы с партнёрами. Их сохранение не публикует вас в каталоге RemCard и не требует модерации.">
          <div className={styles.statusRow}>
            <StatusBadge
              label={workingComplete ? "Заполнено" : "Нужно дозаполнить"}
              tone={workingComplete ? "active" : "pending"}
            />
            {!workingComplete ? (
              <ul className={styles.notesList}>
                {workingMissing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <fieldset className={styles.fieldset} disabled={!basicsEditable}>
            <div className={styles.fields}>
              <TextField
                label="Имя представителя"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                hint="Отображается в кабинете; не подменяет название организации."
              />
              <TextField
                label="Город"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                required
              />
              <SelectField
                label="Тип партнёра"
                value={partnerType}
                onChange={(event) => setPartnerType(event.target.value)}
              >
                {PARTNER_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SelectField>

              {partnerType === "STORE" || partnerType === "COMPANY" ? (
                <TextField
                  label="Название организации"
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  hint="Коммерческое название — отдельно от имени представителя."
                  required
                />
              ) : null}

            </div>
          </fieldset>
        </Panel>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className={styles.success} role="status">
              {success}
            </p>
          ) : null}
          <div className={styles.actions}>
            <Button type="submit" disabled={saving || !basicsEditable}>
              {saving ? "Сохранение…" : "Сохранить данные"}
            </Button>
          </div>
        </form>
        ) : null}

        {activeSection === "catalog" ? (
          <>
            <Panel title="Текст и контакты для публикации">
              <fieldset className={styles.fieldset} disabled={!catalogEditable}>
                <div className={styles.fields}>
                  <TextAreaField
                    label="Описание для каталога"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                  <TextField label="Сайт" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  <TextField
                    label="Telegram (публичный)"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                  />
                  <TextField
                    label="Рабочий email"
                    value={publicEmail}
                    onChange={(e) => setPublicEmail(e.target.value)}
                  />
                  <TextField
                    label="Рабочий телефон"
                    value={publicPhone}
                    onChange={(e) => setPublicPhone(e.target.value)}
                  />
                </div>
              </fieldset>
            </Panel>
            {partnerType === "MASTER" ? (
              <Panel title="Специализации для каталога">
                <fieldset className={styles.fieldset} disabled={!catalogEditable}>
                  <div className={styles.chipGrid}>
                    {ONBOARDING_STAGES.map((stage) => (
                      <label key={stage.id} className={styles.checkRow}>
                        <input
                          type="checkbox"
                          checked={specializations.includes(stage.id)}
                          onChange={() => toggleSpec(stage.id)}
                        />
                        <span>
                          {stage.icon} {stage.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </Panel>
            ) : (
              <Panel title="Категории и филиал для публикации">
                <fieldset className={styles.fieldset} disabled={!catalogEditable}>
                  {needsBranchFields ? (
                    <TextField
                      label="Адрес первого филиала (для модерации)"
                      value={branchAddress}
                      onChange={(event) => setBranchAddress(event.target.value)}
                      hint="Нужен для отправки организации в каталог."
                    />
                  ) : null}
                  <div className={styles.chipGrid}>
                    {STORE_CATEGORY_CHIPS.map((cat) => (
                      <label key={cat.value} className={styles.checkRow}>
                        <input
                          type="checkbox"
                          checked={storeCategories.includes(cat.value)}
                          onChange={() => toggleCategory(cat.value)}
                        />
                        <span>{cat.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </Panel>
            )}
            <ProfileCatalogSection
              profile={profile}
              draft={buildDraft()}
              onProfileUpdated={applyProfile}
            />
          </>
        ) : null}

        {activeSection === "branches" ? (
          <ProfileBranchesSection
            defaultCity={city}
            hasOrganization={Boolean(profile.organization)}
            partnerType={partnerType}
          />
        ) : null}

        {activeSection === "team" ? <ProfileTeamSection /> : null}

        {activeSection === "notifications" ? (
          <NotificationSettingsPanel
            telegramLinked={Boolean(user.telegramLinked)}
            maxLinked={Boolean(user.maxLinked)}
            initialSettings={user.notificationSettings ?? null}
            onLinkedChange={(state) => {
              setProfile((prev) => ({
                ...prev,
                user: {
                  ...prev.user,
                  telegramLinked: state.telegramLinked,
                  maxLinked: state.maxLinked,
                },
              }));
            }}
          />
        ) : null}

        {(revisionBanner || moderationSection) && activeSection === "catalog" && (
          <Panel title="Замечания модератора" hint="Только ваши комментарии — без внутренних записей штаба.">
            {notesLoading ? (
              <p className={styles.hint}>Загружаем…</p>
            ) : notesError ? (
              <div>
                <p className={styles.error} role="alert">
                  {notesError}
                </p>
                <Button type="button" variant="secondary" onClick={() => void loadNotes()}>
                  Повторить загрузку
                </Button>
              </div>
            ) : openNotes.length === 0 ? (
              <p className={styles.hint}>Нет открытых замечаний.</p>
            ) : (
              <>
                <p className={styles.hint}>Открытых замечаний: {openNotes.length}</p>
                <ul className={styles.notesList}>
                  {openNotes.map((note) => (
                    <li key={note.id}>
                      <p>{note.comment}</p>
                      {note.attachments.length > 0 ? (
                        <ul>
                          {note.attachments.map((url) => (
                            <li key={url}>
                              <a href={url} target="_blank" rel="noopener noreferrer">
                                Вложение
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <time dateTime={note.createdAt}>
                        {new Date(note.createdAt).toLocaleString("ru-RU")}
                      </time>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
        )}

      </div>

      <aside className={styles.aside}>
        <Panel title="Подсказка" compact>
          <p>
            Рабочие данные сохраняются без модерации. Публикация в каталоге — добровольно, в разделе
            «Публикация».
          </p>
          <p className={styles.hint}>Каталог: {statusLabel}</p>
        </Panel>
        {profile.organization ? (
          <Panel title="Организация" compact>
            <p className={styles.orgName}>{profile.organization.name}</p>
            <p>
              Статус витрины:{" "}
              {CATALOG_STATUS_LABELS[profile.organization.catalogStatus] ??
                profile.organization.catalogStatus}
            </p>
            <p>Филиалов: {profile.organization.branchCount ?? 0}</p>
          </Panel>
        ) : null}
      </aside>
    </div>
  );
}

async function remcardFetchNotes(): Promise<{ notes: ModerationNote[] }> {
  const { remcardFetch } = await import("@/lib/api-client");
  return remcardFetch<{ notes: ModerationNote[] }>("/api/pro/moderation-notes");
}
