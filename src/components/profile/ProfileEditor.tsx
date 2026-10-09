"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RemcardApiError } from "@/lib/api-client";
import { CATALOG_STATUS_LABELS } from "@/lib/partnership-labels";
import {
  effectiveCatalogStatus,
  catalogPublicationEditable,
  profileBasicsEditable,
  showRevisionBanner,
} from "@/lib/profile-catalog-state";
import { type ProfileDraft } from "@/lib/profile-save";
import {
  isWorkingProfileDirty,
  profileDraftFromProfile,
} from "@/lib/profile-draft-sync";
import {
  catalogDraftFromProfile,
  isCatalogDraftDirty,
} from "@/lib/profile-catalog-draft-sync";
import {
  persistWorkingProfileDraft,
  validateWorkingProfileDraft,
  workingProfileCabinetReady,
  workingProfileMissingFields,
} from "@/lib/profile-working-save";
import type { EmployeesOverviewResponse } from "@/lib/employees-overview-types";
import { DEV_FIXTURE_EMPLOYEES_OVERVIEW } from "@/lib/dev-profile-fixture-overview";
import { ProfileBranchesSection } from "./ProfileBranchesSection";
import { ProfileCatalogSection } from "./ProfileCatalogSection";
import { ProfileTeamSection } from "./ProfileTeamSection";
import type { ProProfileResponse } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { SelectField, TextAreaField, TextField } from "@/components/ui/FormField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { NotificationSettingsPanel } from "./NotificationSettingsPanel";
import { ProfileOverviewSection } from "./ProfileOverviewSection";
import { ProfileDirectionsPicker } from "./ProfileDirectionsPicker";
import type { WorkingPrimaryDirection } from "@/lib/types";
import {
  buildProfileSectionHref,
  PROFILE_SECTION_NAV,
  resolveProfileSectionFromQuery,
  type ProfileSectionId,
} from "@/lib/profile-sections";
import styles from "./ProfileEditor.module.css";

export type { ProfileSectionId };

const UNSAVED_BASICS_LEAVE_MESSAGE =
  "Есть несохранённые изменения в основных данных. Уйти без сохранения?";
const UNSAVED_CATALOG_LEAVE_MESSAGE =
  "Есть несохранённые изменения в каталоге. Уйти без сохранения?";

const PARTNER_TYPES = [
  { value: "MASTER", label: "Специалист" },
  { value: "COMPANY", label: "Компания" },
  { value: "STORE", label: "Магазин" },
] as const;

const PARTNER_WORK_MODES = [
  { value: "", label: "Не указано" },
  { value: "ON_SITE", label: "По адресу" },
  { value: "MOBILE", label: "На выезде" },
  { value: "BOTH", label: "По адресу и на выезде" },
  { value: "ONLINE", label: "Онлайн" },
] as const;

type ModerationNote = {
  id: string;
  comment: string;
  createdAt: string;
  attachments: string[];
  resolvedAt: string | null;
};

type ProfileEditorProps = {
  initial: ProProfileResponse;
  moderationSection?: boolean;
  returnTo?: string | null;
  section?: ProfileSectionId;
  focusBranchId?: string;
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
  section: sectionProp = "overview",
  focusBranchId,
}: ProfileEditorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const profileBasePath = pathname.startsWith("/profile/dev-fixture")
    ? "/profile/dev-fixture"
    : "/profile";
  const [profile, setProfile] = useState(initial);
  const user = profile.user as ExtendedUser;
  const initialCatalogForm = profileDraftFromProfile(initial);

  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [city, setCity] = useState(user.city ?? "");
  const [description, setDescription] = useState(initialCatalogForm.description);
  const [partnerType, setPartnerType] = useState(user.partnerType ?? "MASTER");
  const [specializations, setSpecializations] = useState<string[]>(initialCatalogForm.specializations);
  const [storeCategories, setStoreCategories] = useState<string[]>(initialCatalogForm.storeCategories);
  const [organizationName, setOrganizationName] = useState(initialCatalogForm.organizationName);
  const [branchAddress, setBranchAddress] = useState(initialCatalogForm.branchAddress);
  const [website, setWebsite] = useState(initialCatalogForm.website);
  const [telegram, setTelegram] = useState(initialCatalogForm.telegram);
  const [publicEmail, setPublicEmail] = useState(initialCatalogForm.publicEmail);
  const [publicPhone, setPublicPhone] = useState(initialCatalogForm.publicPhone);
  const [catalogPublicName, setCatalogPublicName] = useState(initialCatalogForm.catalogPublicName);
  const [catalogCity, setCatalogCity] = useState(initialCatalogForm.catalogCity);
  const [showFullName, setShowFullName] = useState(initialCatalogForm.showFullName);
  const catalogOnOrg = profile.catalogPublication?.catalogEntity === "organization";
  const [catalogImageUrl, setCatalogImageUrl] = useState(initialCatalogForm.catalogImageUrl);
  const initialWorking = initial.workingProfile;
  const [productCategoryIds, setProductCategoryIds] = useState<string[]>(
    initialWorking?.effectiveProductCategoryIds ?? initialWorking?.productCategoryIds ?? [],
  );
  const [serviceSpecializationIds, setServiceSpecializationIds] = useState<string[]>(
    initialWorking?.effectiveServiceSpecializationIds ??
      initialWorking?.serviceSpecializationIds ??
      [],
  );
  const [navigatorStageIds, setNavigatorStageIds] = useState<string[]>(
    initialWorking?.effectiveNavigatorStageIds ?? initialWorking?.navigatorStageIds ?? [],
  );
  const [primaryDirection, setPrimaryDirection] = useState<WorkingPrimaryDirection>(
    initialWorking?.primaryDirection ?? null,
  );
  const [partnerSearchOptIn, setPartnerSearchOptIn] = useState(
    initialWorking?.partnerSearchVisible ?? initialWorking?.partnerSearchOptIn ?? false,
  );
  const partnerSearchTouchedRef = useRef(false);
  const [partnerWorkMode, setPartnerWorkMode] = useState(initialWorking?.partnerWorkMode ?? "");
  const [areasText, setAreasText] = useState((initialWorking?.areas ?? user.areas ?? []).join("\n"));
  const [partnershipContactName, setPartnershipContactName] = useState(
    initialWorking?.partnershipContactName ?? "",
  );
  const [partnershipContactPhone, setPartnershipContactPhone] = useState(
    initialWorking?.partnershipContactPhone ?? "",
  );
  const [partnershipContactEmail, setPartnershipContactEmail] = useState(
    initialWorking?.partnershipContactEmail ?? "",
  );

  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<ProfileSectionId>(() => {
    if (focusBranchId) return "branches";
    if (moderationSection) return "catalog";
    return sectionProp;
  });
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

  const parseAreas = useCallback((): string[] => {
    return areasText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [areasText]);

  const buildDraft = useCallback((): ProfileDraft => {
    return {
      displayName,
      catalogCity,
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
      catalogPublicName: catalogOnOrg ? organizationName : catalogPublicName,
      showFullName,
      catalogImageUrl,
      productCategoryIds,
      serviceSpecializationIds,
      navigatorStageIds,
      primaryDirection,
      partnerSearchOptIn,
      partnerWorkMode,
      areas: parseAreas(),
      partnershipContactName,
      partnershipContactPhone,
      partnershipContactEmail,
    };
  }, [
    branchAddress,
    catalogCity,
    city,
    description,
    displayName,
    navigatorStageIds,
    organizationName,
    parseAreas,
    partnerSearchOptIn,
    partnerWorkMode,
    partnerType,
    partnershipContactEmail,
    partnershipContactName,
    partnershipContactPhone,
    primaryDirection,
    productCategoryIds,
    publicEmail,
    publicPhone,
    catalogPublicName,
    catalogOnOrg,
    showFullName,
    catalogImageUrl,
    serviceSpecializationIds,
    specializations,
    storeCategories,
    telegram,
    website,
  ]);

  const savedSnapshotRef = useRef(profileDraftFromProfile(initial));
  const savedCatalogSnapshotRef = useRef(catalogDraftFromProfile(initial));
  const syncedUserIdRef = useRef(initial.user.id);
  const draftRef = useRef<ProfileDraft | null>(null);

  const applyProfile = useCallback((next: ProProfileResponse) => {
    setProfile(next);
    savedSnapshotRef.current = profileDraftFromProfile(next);
    savedCatalogSnapshotRef.current = catalogDraftFromProfile(next);
    const u = next.user as ExtendedUser;
    const catalogForm = profileDraftFromProfile(next);
    setDisplayName(u.displayName ?? "");
    setCity(u.city ?? "");
    setPartnerType(u.partnerType ?? "MASTER");
    setDescription(catalogForm.description);
    setSpecializations(catalogForm.specializations);
    setStoreCategories(catalogForm.storeCategories);
    setOrganizationName(catalogForm.organizationName);
    setBranchAddress(catalogForm.branchAddress);
    setWebsite(catalogForm.website);
    setTelegram(catalogForm.telegram);
    setPublicEmail(catalogForm.publicEmail);
    setPublicPhone(catalogForm.publicPhone);
    setCatalogPublicName(catalogForm.catalogPublicName);
    setCatalogCity(catalogForm.catalogCity);
    setShowFullName(catalogForm.showFullName);
    setCatalogImageUrl(catalogForm.catalogImageUrl);
    const w = next.workingProfile;
    setProductCategoryIds(w?.effectiveProductCategoryIds ?? w?.productCategoryIds ?? []);
    setServiceSpecializationIds(
      w?.effectiveServiceSpecializationIds ?? w?.serviceSpecializationIds ?? [],
    );
    setNavigatorStageIds(w?.effectiveNavigatorStageIds ?? w?.navigatorStageIds ?? []);
    setPrimaryDirection(w?.primaryDirection ?? null);
    setPartnerSearchOptIn(w?.partnerSearchVisible ?? w?.partnerSearchOptIn ?? false);
    partnerSearchTouchedRef.current = false;
    setPartnerWorkMode(w?.partnerWorkMode ?? "");
    setAreasText((w?.areas ?? u.areas ?? []).join("\n"));
    setPartnershipContactName(w?.partnershipContactName ?? "");
    setPartnershipContactPhone(w?.partnershipContactPhone ?? "");
    setPartnershipContactEmail(w?.partnershipContactEmail ?? "");
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
    if (initial.user.id !== syncedUserIdRef.current) {
      syncedUserIdRef.current = initial.user.id;
      applyProfile(initial);
      return;
    }
    setProfile(initial);
    const currentDraft = draftRef.current ?? savedSnapshotRef.current;
    if (isWorkingProfileDirty(savedSnapshotRef.current, currentDraft)) {
      return;
    }
    applyProfile(initial);
  }, [initial, applyProfile]);

  useEffect(() => {
    const fromUrl = resolveProfileSectionFromQuery({
      section: searchParams.get("section"),
      moderation: searchParams.get("moderation"),
      branchId: searchParams.get("branchId"),
    });
    setActiveSection(fromUrl);
  }, [searchParams]);

  const currentDraft = buildDraft();
  draftRef.current = currentDraft;
  const hasUnsavedBasicsChanges = isWorkingProfileDirty(
    profileDraftFromProfile(profile),
    currentDraft,
  );
  const hasUnsavedCatalogChanges = isCatalogDraftDirty(
    savedCatalogSnapshotRef.current,
    currentDraft,
  );

  const confirmLeaveBasicsUnsaved = useCallback(() => {
    if (activeSection !== "basics" || !hasUnsavedBasicsChanges) return true;
    return window.confirm(UNSAVED_BASICS_LEAVE_MESSAGE);
  }, [activeSection, hasUnsavedBasicsChanges]);

  const confirmLeaveCatalogUnsaved = useCallback(() => {
    if (activeSection !== "catalog" || !hasUnsavedCatalogChanges) return true;
    return window.confirm(UNSAVED_CATALOG_LEAVE_MESSAGE);
  }, [activeSection, hasUnsavedCatalogChanges]);

  const confirmLeaveUnsaved = useCallback(() => {
    if (!confirmLeaveBasicsUnsaved()) return false;
    if (!confirmLeaveCatalogUnsaved()) return false;
    return true;
  }, [confirmLeaveBasicsUnsaved, confirmLeaveCatalogUnsaved]);

  const navigateSection = useCallback(
    (next: ProfileSectionId) => {
      if (next === activeSection) return;
      if (!confirmLeaveUnsaved()) return;
      setActiveSection(next);
      const qs = buildProfileSectionHref(next, new URLSearchParams(searchParams.toString())).split(
        "?",
      )[1];
      const href = qs ? `${profileBasePath}?${qs}` : profileBasePath;
      router.push(href, { scroll: false });
    },
    [activeSection, confirmLeaveUnsaved, profileBasePath, router, searchParams],
  );

  useEffect(() => {
    if (
      (activeSection !== "basics" || !hasUnsavedBasicsChanges) &&
      (activeSection !== "catalog" || !hasUnsavedCatalogChanges)
    ) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [activeSection, hasUnsavedBasicsChanges, hasUnsavedCatalogChanges]);
  const fixtureOverview: EmployeesOverviewResponse | undefined = profileBasePath.includes(
    "dev-fixture",
  )
    ? DEV_FIXTURE_EMPLOYEES_OVERVIEW
    : undefined;

  const openNotes = useMemo(() => notes.filter((n) => !n.resolvedAt), [notes]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!basicsEditable) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const next = await persistWorkingProfileDraft(profile, buildDraft(), {
        partnerSearchTouched: partnerSearchTouchedRef.current,
      });
      partnerSearchTouchedRef.current = false;
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
  const workingComplete = workingProfileCabinetReady(buildDraft());

  const showAside = activeSection !== "overview";

  return (
    <div className={styles.shell} id={moderationSection ? "moderation-remarks" : undefined}>
      {showBack ? (
        <p className={styles.hint}>
          <Link
            href={returnTo}
            onClick={(event) => {
              if (!confirmLeaveUnsaved()) event.preventDefault();
            }}
          >
            ← Вернуться к предыдущему разделу
          </Link>
        </p>
      ) : null}

      <nav className={styles.sectionNav} aria-label="Разделы профиля">
        <ul className={styles.tabStrip} role="tablist">
          {PROFILE_SECTION_NAV.map((item) => (
            <li key={item.id} role="presentation">
              <button
                type="button"
                role="tab"
                aria-selected={activeSection === item.id}
                className={`${styles.tabButton} ${activeSection === item.id ? styles.tabButtonActive : ""}`}
                onClick={() => navigateSection(item.id)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div
        className={`${styles.grid} ${showAside ? "" : styles.gridSingle}`}
      >
      <div className={styles.main}>
        {activeSection === "overview" ? (
          <ProfileOverviewSection
            profile={profile}
            onNavigateSection={navigateSection}
            hasUnsavedBasicsChanges={hasUnsavedBasicsChanges}
            fixtureOverview={fixtureOverview}
          />
        ) : null}
        {revisionBanner && activeSection === "catalog" ? (
          <div className={styles.bannerWarn} role="status">
            <strong>Нужно исправить публикацию в каталоге</strong>
            <p>Внесите правки в разделе «Каталог RemCard», сохраните черновик и отправьте повторно.</p>
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

        <Panel title="Чем вы занимаетесь">
          <ProfileDirectionsPicker
            disabled={!basicsEditable}
            productCategoryIds={productCategoryIds}
            serviceSpecializationIds={serviceSpecializationIds}
            navigatorStageIds={navigatorStageIds}
            primaryDirection={primaryDirection}
            onChangeProducts={setProductCategoryIds}
            onChangeServices={setServiceSpecializationIds}
            onChangeStages={setNavigatorStageIds}
            onChangePrimary={setPrimaryDirection}
          />
        </Panel>

        <Panel title="Где вы работаете">
          <fieldset className={styles.fieldset} disabled={!basicsEditable}>
            <div className={styles.fields}>
              <SelectField
                label="Формат работы"
                value={partnerWorkMode}
                onChange={(event) => setPartnerWorkMode(event.target.value)}
              >
                {PARTNER_WORK_MODES.map((item) => (
                  <option key={item.value || "none"} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SelectField>
              <TextAreaField
                label="Территории обслуживания"
                value={areasText}
                onChange={(event) => setAreasText(event.target.value)}
                hint="По одной зоне в строке или через запятую. Не заменяет точный адрес филиала."
              />
            </div>
          </fieldset>
        </Panel>

        <Panel title="Контакт для сотрудничества">
          <p className={styles.hint}>
            Эти контакты предназначены для сотрудничества с партнёрами RemCard. Они не публикуются
            автоматически в открытом каталоге.
          </p>
          <fieldset className={styles.fieldset} disabled={!basicsEditable}>
            <div className={styles.fields}>
              <TextField
                label="Контактное лицо"
                value={partnershipContactName}
                onChange={(event) => setPartnershipContactName(event.target.value)}
              />
              <TextField
                label="Телефон"
                value={partnershipContactPhone}
                onChange={(event) => setPartnershipContactPhone(event.target.value)}
              />
              <TextField
                label="Email"
                value={partnershipContactEmail}
                onChange={(event) => setPartnershipContactEmail(event.target.value)}
              />
            </div>
          </fieldset>
        </Panel>

        <Panel title="Видимость">
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={partnerSearchOptIn}
              disabled={!basicsEditable}
              onChange={(event) => {
                partnerSearchTouchedRef.current = true;
                setPartnerSearchOptIn(event.target.checked);
              }}
            />
            <span>Показывать партнёрам в RemCard</span>
          </label>
          <p className={styles.hint}>
            Другие партнёры смогут найти вас по товарам, услугам и городу и предложить сотрудничество.
            Публикация на remcard.ru настраивается отдельно.
          </p>
          {profile.workingProfile?.partnerSearchVisible != null ? (
            <p className={styles.hint}>
              Сейчас на сервере:{" "}
              {profile.workingProfile.partnerSearchVisible
                ? "виден партнёрам"
                : "скрыт из поиска партнёров"}
              .
            </p>
          ) : null}
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
              {saving ? "Сохранение…" : "Сохранить основные данные"}
            </Button>
          </div>
        </form>
        ) : null}

        {activeSection === "catalog" ? (
          <ProfileCatalogSection
            profile={profile}
            draft={buildDraft()}
            catalogEditable={catalogEditable}
            partnerType={partnerType}
            needsBranchFields={needsBranchFields}
            onProfileUpdated={applyProfile}
            catalogPublicName={catalogPublicName}
            onCatalogPublicNameChange={setCatalogPublicName}
            onOrganizationNameChange={setOrganizationName}
            showFullName={showFullName}
            onShowFullNameChange={setShowFullName}
            catalogImageUrl={catalogImageUrl}
            onCatalogImageUrlChange={setCatalogImageUrl}
            description={description}
            onDescriptionChange={setDescription}
            specializations={specializations}
            onSpecializationsChange={setSpecializations}
            storeCategories={storeCategories}
            onStoreCategoriesChange={setStoreCategories}
            branchAddress={branchAddress}
            onBranchAddressChange={setBranchAddress}
            website={website}
            onWebsiteChange={setWebsite}
            telegram={telegram}
            onTelegramChange={setTelegram}
            publicEmail={publicEmail}
            onPublicEmailChange={setPublicEmail}
            publicPhone={publicPhone}
            onPublicPhoneChange={setPublicPhone}
            workingProductIds={productCategoryIds}
            workingServiceIds={serviceSpecializationIds}
            onCopyWorkingDirections={() => {
              setStoreCategories([...productCategoryIds]);
              setSpecializations([...serviceSpecializationIds]);
            }}
          />
        ) : null}

        {activeSection === "branches" ? (
          <ProfileBranchesSection
            defaultCity={city}
            hasOrganization={Boolean(profile.organization)}
            partnerType={partnerType}
            initialBranchId={focusBranchId}
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

      {showAside ? (
        <aside className={styles.aside}>
          <Panel title="Подсказка" compact>
            <p>
              Рабочие данные сохраняются без модерации. Публикация в каталоге — добровольно, в
              разделе «Каталог RemCard».
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
              <p className={styles.hint}>
                {profile.organization.catalogPublished
                  ? "Организация видна в каталоге (опубликованная версия)."
                  : "Организация не опубликована для посетителей."}
                {profile.organization.catalogDraft ? " Есть черновик правок." : ""}
              </p>
              <p>Филиалов: {profile.organization.branchCount ?? 0}</p>
            </Panel>
          ) : null}
        </aside>
      ) : null}
      </div>
    </div>
  );
}

async function remcardFetchNotes(): Promise<{ notes: ModerationNote[] }> {
  const { remcardFetch } = await import("@/lib/api-client");
  return remcardFetch<{ notes: ModerationNote[] }>("/api/pro/moderation-notes");
}
