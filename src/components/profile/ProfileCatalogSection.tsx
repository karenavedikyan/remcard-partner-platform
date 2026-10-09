"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RemcardApiError } from "@/lib/api-client";
import { uploadCatalogImage, CATALOG_IMAGE_ACCEPT } from "@/lib/catalog-image-upload";
import {
  catalogMissingForSubmit,
  catalogPublicationStatusLabel,
} from "@/lib/profile-catalog-completeness";
import { catalogEntityLabel } from "@/lib/profile-catalog-draft-sync";
import {
  canSubmitProfileForModeration,
  catalogPublicationEditable,
  effectiveCatalogStatus,
  showRevisionBanner,
} from "@/lib/profile-catalog-state";
import {
  discardCatalogDraft,
  persistCatalogDraftOnly,
  refreshProfile,
  submitProfileForModerationReview,
  unpublishFromCatalog,
  type ProfileDraft,
} from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import { CATALOG_STATUS_LABELS, catalogStatusTone } from "@/lib/partnership-labels";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TextAreaField, TextField } from "@/components/ui/FormField";
import { CatalogCategoryAvatar } from "./CatalogCategoryAvatar";
import { CatalogPublicationPreview } from "./CatalogPublicationPreview";
import { ProfileDirectionsPicker } from "./ProfileDirectionsPicker";
import type { WorkingPrimaryDirection } from "@/lib/types";
import styles from "./ProfileEditor.module.css";

export type ProfileCatalogSectionProps = {
  profile: ProProfileResponse;
  draft: ProfileDraft;
  catalogEditable: boolean;
  partnerType: string;
  needsBranchFields: boolean;
  onProfileUpdated: (next: ProProfileResponse) => void;
  catalogPublicName: string;
  onCatalogPublicNameChange: (value: string) => void;
  onOrganizationNameChange: (value: string) => void;
  showFullName: boolean;
  onShowFullNameChange: (value: boolean) => void;
  catalogImageUrl: string;
  onCatalogImageUrlChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  specializations: string[];
  onSpecializationsChange: (ids: string[]) => void;
  storeCategories: string[];
  onStoreCategoriesChange: (ids: string[]) => void;
  branchAddress: string;
  onBranchAddressChange: (value: string) => void;
  website: string;
  onWebsiteChange: (value: string) => void;
  telegram: string;
  onTelegramChange: (value: string) => void;
  publicEmail: string;
  onPublicEmailChange: (value: string) => void;
  publicPhone: string;
  onPublicPhoneChange: (value: string) => void;
  workingProductIds: string[];
  workingServiceIds: string[];
  onCopyWorkingDirections: () => void;
};

function isPubliclyVisible(profile: ProProfileResponse): boolean {
  return profile.catalogPublication?.isLivePublic === true;
}

export function ProfileCatalogSection(props: ProfileCatalogSectionProps) {
  const {
    profile,
    draft,
    catalogEditable,
    partnerType,
    needsBranchFields,
    onProfileUpdated,
    catalogPublicName,
    onCatalogPublicNameChange,
    onOrganizationNameChange,
    showFullName,
    onShowFullNameChange,
    catalogImageUrl,
    onCatalogImageUrlChange,
    description,
    onDescriptionChange,
    specializations,
    onSpecializationsChange,
    storeCategories,
    onStoreCategoriesChange,
    branchAddress,
    onBranchAddressChange,
    website,
    onWebsiteChange,
    telegram,
    onTelegramChange,
    publicEmail,
    onPublicEmailChange,
    publicPhone,
    onPublicPhoneChange,
    workingProductIds,
    workingServiceIds,
    onCopyWorkingDirections,
  } = props;

  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(
    () => effectiveCatalogStatus(profile) !== "DRAFT" || showRevisionBanner(profile),
  );
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPreview, setShowPreview] = useState(true);

  const catalogStatus = effectiveCatalogStatus(profile);
  const statusLabel = CATALOG_STATUS_LABELS[catalogStatus] ?? catalogStatus;
  const publicationLabel = catalogPublicationStatusLabel(profile);
  const canSubmit = canSubmitProfileForModeration(profile);
  const missing = catalogMissingForSubmit(profile, draft);
  const entity = catalogEntityLabel(profile);
  const draftPending = profile.catalogPublication?.draftPending || profile.user.catalogDraftPending;

  const publicId = profile.user.publicId;
  const livePublicUrl =
    isPubliclyVisible(profile) && publicId
      ? `https://remcard.ru/partner/${encodeURIComponent(publicId)}`
      : null;

  async function saveDraft(event?: FormEvent) {
    event?.preventDefault();
    if (uploading) {
      setError("Дождитесь завершения загрузки изображения");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const next = await persistCatalogDraftOnly(profile, draft);
      onProfileUpdated(next);
      setSuccess("Черновик публикации сохранён");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function submitPublication() {
    if (uploading) {
      setError("Дождитесь завершения загрузки изображения");
      return;
    }
    if (missing.length > 0) {
      setError(`Заполните обязательные поля: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const next = await submitProfileForModerationReview(profile, draft);
      onProfileUpdated(next);
      setSuccess(
        catalogStatus === "APPROVED"
          ? "Изменения отправлены на повторную проверку"
          : "Отправлено на проверку для публикации в каталоге",
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось отправить");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDiscard() {
    if (!window.confirm("Отменить все несохранённые правки черновика каталога?")) return;
    setSubmitting(true);
    setError("");
    try {
      await discardCatalogDraft(profile);
      const refreshed = await refreshProfile();
      onProfileUpdated(refreshed);
      setSuccess("Черновик отменён, показана опубликованная версия");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось отменить черновик");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnpublish() {
    if (!window.confirm("Снять карточку с публикации на remcard.ru?")) return;
    setSubmitting(true);
    setError("");
    try {
      await unpublishFromCatalog(profile);
      const refreshed = await refreshProfile();
      onProfileUpdated(refreshed);
      setSuccess("Карточка снята с публикации");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось снять с публикации");
    } finally {
      setSubmitting(false);
    }
  }

  async function onPickImage(file: File | null) {
    if (!file) return;
    setUploadError("");
    setUploading(true);
    const result = await uploadCatalogImage(file);
    setUploading(false);
    if (!result.ok) {
      setUploadError(result.error);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    onCatalogImageUrlChange(result.url);
  }

  function scrollToField(fieldId: string) {
    document.getElementById(fieldId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const submitLabel =
    catalogStatus === "NEEDS_REVISION"
      ? "Отправить повторно"
      : catalogStatus === "APPROVED" && draftPending
        ? "Отправить повторно"
        : "Отправить на проверку";

  return (
    <>
      <Panel title="Помогите новым клиентам найти вас">
        <p className={styles.lead}>
          Расскажите о себе, добавьте товары и/или услуги и удобные способы связи. Клиенты смогут
          найти вашу карточку в каталоге RemCard.
        </p>
        <p className={styles.hint}>
          Публикация по желанию. Работать с партнёрами в PROF можно без неё.
        </p>
        <div className={styles.statusRow}>
          <StatusBadge label={publicationLabel} tone={catalogStatusTone(catalogStatus)} />
          <StatusBadge label={statusLabel} tone={catalogStatusTone(catalogStatus)} />
          {isPubliclyVisible(profile) ? (
            <StatusBadge label="Видна в каталоге" tone="active" />
          ) : (
            <StatusBadge label="Не видна посетителям" tone="pending" />
          )}
          {draftPending ? <StatusBadge label="Черновик правок" tone="pending" /> : null}
        </div>
        <p className={styles.hint}>
          Сущность публикации: {entity === "organization" ? "организация" : "профиль специалиста"}.
        </p>

        {!expanded ? (
          <Button type="button" onClick={() => setExpanded(true)}>
            Подготовить профиль к публикации
          </Button>
        ) : null}
      </Panel>

      {expanded ? (
        <>
          <Panel title="Карточка партнёра">
            <div className={styles.statusRow}>
              <CatalogCategoryAvatar
                imageUrl={catalogImageUrl}
                categories={storeCategories.length ? storeCategories : specializations}
                partnerType={partnerType}
              />
              <div className={styles.fields}>
                {entity === "organization" ? (
                  <TextField
                    id="catalog-public-name"
                    label="Публичное название организации"
                    value={draft.organizationName}
                    onChange={(e) => onOrganizationNameChange(e.target.value)}
                    disabled={!catalogEditable}
                    required
                  />
                ) : (
                  <TextField
                    id="catalog-public-name"
                    label="Публичное имя"
                    value={catalogPublicName}
                    onChange={(e) => onCatalogPublicNameChange(e.target.value)}
                    disabled={!catalogEditable}
                    required
                    hint="Отображается на remcard.ru при включённой опции «показывать полное имя»."
                  />
                )}
                {entity === "organization" ? null : (
                  <label className={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={showFullName}
                      disabled={!catalogEditable}
                      onChange={(e) => onShowFullNameChange(e.target.checked)}
                    />
                    <span>Показывать полное имя представителя в каталоге</span>
                  </label>
                )}
              </div>
            </div>

            <fieldset className={styles.fieldset} disabled={!catalogEditable}>
              <legend>Логотип или фото</legend>
              <input
                ref={fileRef}
                type="file"
                accept={CATALOG_IMAGE_ACCEPT}
                className={styles.visuallyHidden}
                onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
              />
              <div className={styles.actions}>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!catalogEditable || uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? "Загрузка…" : catalogImageUrl ? "Заменить изображение" : "Добавить изображение"}
                </Button>
                {catalogImageUrl ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!catalogEditable}
                    onClick={() => onCatalogImageUrlChange("")}
                  >
                    Убрать — использовать автоматическую иконку
                  </Button>
                ) : null}
              </div>
              {uploadError ? (
                <p className={styles.error} role="alert">
                  {uploadError}
                </p>
              ) : null}
              {!catalogImageUrl ? (
                <p className={styles.hint}>
                  Без загрузки показывается встроенная иконка по основному направлению (или нейтральная
                  для партнёра).
                </p>
              ) : null}
            </fieldset>

            <TextAreaField
              label="Описание для каталога"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              disabled={!catalogEditable}
            />
          </Panel>

          <Panel title="Товары и услуги">
            <div id="catalog-products" />
            <p className={styles.hint}>
              Используются канонические категории RemCard. Рабочие направления из «Основных данных» не
              подставляются автоматически.
            </p>
            {(workingProductIds.length > 0 || workingServiceIds.length > 0) && (
              <Button type="button" variant="secondary" disabled={!catalogEditable} onClick={onCopyWorkingDirections}>
                Перенести направления из рабочего профиля
              </Button>
            )}
            <ProfileDirectionsPicker
              disabled={!catalogEditable}
              catalogMode
              productCategoryIds={storeCategories}
              serviceSpecializationIds={specializations}
              navigatorStageIds={[]}
              primaryDirection={null as WorkingPrimaryDirection}
              onChangeProducts={onStoreCategoriesChange}
              onChangeServices={onSpecializationsChange}
              onChangeStages={() => {}}
              onChangePrimary={() => {}}
            />
          </Panel>

          {needsBranchFields ? (
            <Panel title="Филиал для модерации">
              <TextField
                id="catalog-branch-address"
                label="Адрес первого филиала"
                value={branchAddress}
                onChange={(e) => onBranchAddressChange(e.target.value)}
                disabled={!catalogEditable}
                hint="Нужен для отправки организации в каталог."
              />
            </Panel>
          ) : null}

          <Panel title="Как с вами связаться">
            <p className={styles.hint}>Эти контакты будут видны посетителям remcard.ru.</p>
            <fieldset className={styles.fieldset} disabled={!catalogEditable}>
              <div className={styles.fields}>
                <TextField label="Сайт" value={website} onChange={(e) => onWebsiteChange(e.target.value)} />
                <TextField
                  label="Telegram (публичный)"
                  value={telegram}
                  onChange={(e) => onTelegramChange(e.target.value)}
                />
                <TextField
                  label="Email для клиентов"
                  value={publicEmail}
                  onChange={(e) => onPublicEmailChange(e.target.value)}
                />
                <TextField
                  label="Телефон для клиентов"
                  value={publicPhone}
                  onChange={(e) => onPublicPhoneChange(e.target.value)}
                />
              </div>
            </fieldset>
          </Panel>

          <Panel title="Предпросмотр">
            <div className={styles.actions}>
              <Button type="button" variant="secondary" onClick={() => setShowPreview((v) => !v)}>
                {showPreview ? "Скрыть предпросмотр" : "Предпросмотр"}
              </Button>
            </div>
            {showPreview ? <CatalogPublicationPreview profile={profile} draft={draft} /> : null}
          </Panel>

          <Panel title="Статус публикации">
            {missing.length > 0 ? (
              <div className={styles.bannerWarn}>
                <strong>Для отправки на проверку не хватает:</strong>
                <ul className={styles.notesList}>
                  {missing.map((item) => (
                    <li key={item.id}>
                      <button type="button" className={styles.linkButton} onClick={() => scrollToField(item.fieldId)}>
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className={styles.hint}>Обязательные поля для модерации заполнены.</p>
            )}
            {profile.user.rejectionReason ? (
              <p className={styles.error}>{profile.user.rejectionReason}</p>
            ) : null}
            <p className={styles.hint}>
              Загрузка товаров и услуг из файла и подключение учётной системы — в следующих обновлениях.
            </p>

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

            <form onSubmit={(e) => void saveDraft(e)}>
              <div className={styles.actions}>
                <Button
                  type="submit"
                  disabled={saving || uploading || !catalogPublicationEditable(profile)}
                >
                  {saving ? "Сохранение…" : "Сохранить черновик"}
                </Button>
                {canSubmit && missing.length === 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={submitting || saving || uploading}
                    onClick={() => void submitPublication()}
                  >
                    {submitting ? "Отправка…" : submitLabel}
                  </Button>
                ) : null}
                {draftPending ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={submitting}
                    onClick={() => void handleDiscard()}
                  >
                    Отменить изменения
                  </Button>
                ) : null}
                {livePublicUrl ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => window.open(livePublicUrl, "_blank", "noopener,noreferrer")}
                  >
                    Открыть на remcard.ru
                  </Button>
                ) : null}
                {isPubliclyVisible(profile) ? (
                  <Button type="button" variant="secondary" disabled={submitting} onClick={() => void handleUnpublish()}>
                    Снять с публикации
                  </Button>
                ) : null}
              </div>
            </form>
          </Panel>
        </>
      ) : null}
    </>
  );
}
