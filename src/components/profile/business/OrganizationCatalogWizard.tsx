"use client";

import { FormEvent, useCallback, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { RemcardApiError } from "@/lib/api-client";
import { uploadCatalogImage, CATALOG_IMAGE_ACCEPT } from "@/lib/catalog-image-upload";
import { catalogMissingForSubmit, catalogPublicationStatusLabel } from "@/lib/profile-catalog-completeness";
import type { BusinessProfilePartnerType } from "@/lib/business-profile/eligibility";
import {
  canSubmitProfileForModeration,
  catalogPublicationEditable,
  effectiveCatalogStatus,
} from "@/lib/profile-catalog-state";
import {
  persistCatalogDraftOnly,
  submitProfileForModerationReview,
  type ProfileDraft,
} from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import { catalogStatusTone } from "@/lib/partnership-labels";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TextAreaField, TextField } from "@/components/ui/FormField";
import { CatalogPublicationPreview } from "../CatalogPublicationPreview";
import { CatalogWizardPhotoAttachment } from "../CatalogWizardPhotoAttachment";
import { ProfileDirectionsPicker } from "../ProfileDirectionsPicker";
import { AgentPhoneField, type AgentPhoneFieldHandle } from "../agent/AgentPhoneField";
import type { CatalogPrefillField, CatalogTouchedMap } from "@/lib/specialist-r06/catalog-prefill";
import { markCatalogFieldTouched } from "@/lib/specialist-r06/catalog-prefill";
import { OrganizationCatalogPublicBranchSelector } from "./OrganizationCatalogPublicBranchSelector";
import editorStyles from "../ProfileEditor.module.css";
import catalogStyles from "../specialist/SpecialistCatalogWizard.module.css";
import surfaceStyles from "./BusinessProfileSurface.module.css";

const STEPS = ["Карточка", "Направления", "Контакты", "Оформление", "Предпросмотр"] as const;
const STEP_PANEL_TITLES = [
  "Карточка партнёра",
  "Категории и этапы для каталога",
  "Публичные контакты",
  "Фото и описание",
  "Предпросмотр карточки",
] as const;

export type OrganizationCatalogWizardProps = {
  profile: ProProfileResponse;
  draft: ProfileDraft;
  partnerType: BusinessProfilePartnerType;
  needsBranchFields: boolean;
  catalogEditable: boolean;
  catalogTouched: CatalogTouchedMap;
  onCatalogTouchedChange: (next: CatalogTouchedMap) => void;
  onProfileUpdated: (next: ProProfileResponse) => void;
  /** Pin-only refresh: must not reset unsaved catalog form state. */
  onOrganizationBranchPinUpdated?: (next: ProProfileResponse) => void;
  organizationName: string;
  onOrganizationNameChange: (value: string) => void;
  catalogCity: string;
  onCatalogCityChange: (value: string) => void;
  branchAddress: string;
  onBranchAddressChange: (value: string) => void;
  catalogImageUrl: string;
  onCatalogImageUrlChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  specializations: string[];
  onSpecializationsChange: (ids: string[]) => void;
  storeCategories: string[];
  onStoreCategoriesChange: (ids: string[]) => void;
  website: string;
  onWebsiteChange: (value: string) => void;
  telegram: string;
  onTelegramChange: (value: string) => void;
  publicEmail: string;
  onPublicEmailChange: (value: string) => void;
  publicPhone: string;
  onPublicPhoneChange: (value: string) => void;
  onPullWorkingDirections: () => void;
  workingProductIds: string[];
  workingServiceIds: string[];
  workingStageIds: string[];
  catalogStageIds: string[];
  onCatalogStageIdsChange: (ids: string[]) => void;
  onRevertLocalEdits?: () => void;
  fixtureOrganizationBranches?: Array<{
    id: string;
    name: string;
    city: string;
    address: string;
    isActive?: boolean;
  }> | null;
};

function touchField(
  props: OrganizationCatalogWizardProps,
  field: CatalogPrefillField,
) {
  props.onCatalogTouchedChange(markCatalogFieldTouched(props.catalogTouched, field));
}

export function OrganizationCatalogWizard(props: OrganizationCatalogWizardProps) {
  const {
    profile,
    draft,
    partnerType,
    needsBranchFields,
    catalogEditable,
    onProfileUpdated,
    organizationName,
    onOrganizationNameChange,
    catalogCity,
    onCatalogCityChange,
    branchAddress,
    onBranchAddressChange,
    catalogImageUrl,
    onCatalogImageUrlChange,
    description,
    onDescriptionChange,
    specializations,
    onSpecializationsChange,
    storeCategories,
    onStoreCategoriesChange,
    website,
    onWebsiteChange,
    telegram,
    onTelegramChange,
    publicEmail,
    onPublicEmailChange,
    publicPhone,
    onPublicPhoneChange,
    onPullWorkingDirections,
    workingProductIds,
    workingServiceIds,
    workingStageIds,
    catalogStageIds,
    onCatalogStageIdsChange,
  } = props;

  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const publicPhoneRef = useRef<AgentPhoneFieldHandle>(null);
  const submitAlertRef = useRef<HTMLParagraphElement>(null);

  const catalogStatus = effectiveCatalogStatus(profile);
  const publicationLabel = catalogPublicationStatusLabel(profile);
  const canSubmit = canSubmitProfileForModeration(profile);
  const missing = useMemo(() => catalogMissingForSubmit(profile, draft), [profile, draft]);
  const draftPending = profile.catalogPublication?.draftPending || profile.user.catalogDraftPending;

  const submitLabel =
    catalogStatus === "NEEDS_REVISION"
      ? "Отправить повторно"
      : catalogStatus === "APPROVED" && draftPending
        ? "Отправить повторно"
        : "Отправить на проверку";

  const catalogCardIntro =
    "Помогите клиенту узнать вас и понять, с какой задачей к вам обратиться. Название и описание представляют вас без дополнительных объяснений.";

  const catalogDirectionsNotice =
    partnerType === "COMPANY"
      ? "Для публикации обязательны хотя бы одна категория работ или услуг и хотя бы один этап ремонта. Незавершённую карточку можно сохранить как черновик."
      : "Для публикации обязательны хотя бы одна категория товаров или услуг и хотя бы один этап ремонта. Незавершённую карточку можно сохранить как черновик.";

  const catalogDirectionsLead =
    partnerType === "COMPANY"
      ? "Выберите работы и услуги, которые выполняете. Можно отметить несколько."
      : "Выберите товары и услуги, которые предлагаете. Можно указать одно направление или оба.";

  async function saveDraft(event?: FormEvent) {
    event?.preventDefault();
    const committed = publicPhoneRef.current?.commitPending();
    if (committed !== undefined && committed !== publicPhone) {
      onPublicPhoneChange(committed);
      touchField(props, "publicPhone");
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const next = await persistCatalogDraftOnly(profile, {
        ...draft,
        publicPhone: committed ?? publicPhone,
        catalogTouched: props.catalogTouched,
      } as ProfileDraft);
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
    const committed = publicPhoneRef.current?.commitPending();
    const draftForSubmit = {
      ...draft,
      publicPhone: committed ?? publicPhone,
      catalogTouched: props.catalogTouched,
    } as ProfileDraft;
    if (catalogMissingForSubmit(profile, draftForSubmit).length > 0) {
      setError("Заполните обязательные поля перед отправкой.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const next = await submitProfileForModerationReview(profile, draftForSubmit);
      onProfileUpdated(next);
      setSuccess("Заявка отправлена, ожидает проверки");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось отправить");
    } finally {
      setSubmitting(false);
      requestAnimationFrame(() => {
        submitAlertRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }

  const handleCatalogPhotoFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setUploadError("");
      setUploading(true);
      void uploadCatalogImage(file).then((result) => {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
        if (result.ok) {
          touchField(props, "catalogImageUrl");
          onCatalogImageUrlChange(result.url);
          setUploadError("");
        } else {
          setUploadError(result.error);
        }
      });
    },
    [onCatalogImageUrlChange, props],
  );

  const handleCatalogPhotoRemove = useCallback(() => {
    touchField(props, "catalogImageUrl");
    onCatalogImageUrlChange("");
    setUploadError("");
  }, [onCatalogImageUrlChange, props]);

  const stepMissing = (idx: number): string | null => {
    if (idx === 0) {
      if (!organizationName.trim()) return "Публичное название организации";
      if (needsBranchFields && branchAddress.trim().length < 3) return "Адрес первого филиала";
      if (needsBranchFields && !catalogCity.trim() && !draft.city.trim()) return "Город";
    }
    if (idx === 1) {
      if (storeCategories.length === 0 && specializations.length === 0) {
        return "Товары и/или услуги";
      }
      if (catalogStageIds.length === 0) {
        return "Хотя бы один этап ремонта";
      }
    }
    return null;
  };

  const branchCount = profile.organization?.branchCount ?? 0;
  const hasBranches = branchCount > 0;

  return (
    <div
      className={`${catalogStyles.root} ${surfaceStyles.businessCatalogRoot}`}
      data-testid="organization-catalog-wizard"
      data-catalog-step={step}
      data-catalog-status={catalogStatus}
    >
      {hasBranches ? (
        <OrganizationCatalogPublicBranchSelector
          profile={profile}
          disabled={!catalogEditable}
          onProfileUpdated={props.onOrganizationBranchPinUpdated ?? onProfileUpdated}
          fixtureBranches={props.fixtureOrganizationBranches ?? undefined}
        />
      ) : null}
      <section
        className={`${catalogStyles.introCard} ${surfaceStyles.businessCatalogIntroCard}`}
        data-testid="catalog-intro-card"
      >
        <header className={`${catalogStyles.heading} ${surfaceStyles.businessCatalogIntroHeading}`}>
          <div className={surfaceStyles.businessCatalogIntroCopy}>
            <span className={catalogStyles.kicker}>Публичная страница</span>
            <h2 className={surfaceStyles.businessCatalogIntroTitle}>Подключение к каталогу</h2>
          </div>
          <div className={surfaceStyles.businessCatalogIntroStatus}>
            <StatusBadge label={publicationLabel} tone={catalogStatusTone(catalogStatus)} />
          </div>
        </header>
        <p className={`${catalogStyles.introLead} ${surfaceStyles.businessIntroLead}`}>
          Уже сохранённые данные подставляем из профиля: проверьте их и при необходимости измените.
          Черновик не публикуется, отправка на проверку будет только в конце.
        </p>
      </section>
      <nav className={catalogStyles.steps} aria-label="Этапы каталога">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`${catalogStyles.stepBtn} ${i < step ? catalogStyles.stepDone : ""}`}
            aria-current={i === step ? "step" : undefined}
            disabled={i > step}
            onClick={() => i <= step && setStep(i)}
          >
            <span className={catalogStyles.stepNumber}>{i < step ? "✓" : i + 1}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <section className={catalogStyles.card} data-testid="catalog-step-card">
        <h2 className={`${catalogStyles.title} ${surfaceStyles.businessStepPanelTitle}`}>
          {STEP_PANEL_TITLES[step]}
        </h2>
        {error ? (
          <p ref={submitAlertRef} className={catalogStyles.bannerError} role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p ref={submitAlertRef} className={catalogStyles.bannerSuccess} role="status" aria-live="polite">
            {success}
          </p>
        ) : null}

        {step === 0 ? (
          <div className={catalogStyles.fields}>
            <p className={catalogStyles.stepIntro}>{catalogCardIntro}</p>
            <div className={catalogStyles.field}>
              <label htmlFor="oc-public-name">
                Публичное название организации{" "}
                <span className={catalogStyles.required}>*</span>
              </label>
              <span className={surfaceStyles.businessPublicNameStatus}>Для отправки на проверку</span>
              <input
                id="oc-public-name"
                data-testid="catalog-public-name"
                placeholder={partnerType === "STORE" ? "Например: Магазин «СтройДом»" : "Например: Компания «ЮгСтрой»"}
                value={organizationName}
                disabled={!catalogEditable}
                onChange={(e) => {
                  touchField(props, "catalogPublicName");
                  onOrganizationNameChange(e.target.value);
                }}
              />
              <small
                className={`${catalogStyles.fieldHint} ${surfaceStyles.businessFieldHintBlock}`}
              >
                Привычное название магазина или компании.
              </small>
            </div>
            {!hasBranches ? (
              <div className={catalogStyles.field}>
                <label htmlFor="oc-city">
                  Город <span className={catalogStyles.required}>*</span>
                </label>
                <input
                  id="oc-city"
                  data-testid="catalog-city-input"
                  value={catalogCity}
                  disabled={!catalogEditable}
                  onChange={(e) => {
                    touchField(props, "catalogCity");
                    onCatalogCityChange(e.target.value);
                  }}
                />
                <small className={catalogStyles.fieldHint}>
                  Город первого филиала; адрес укажите ниже, пока филиалов ещё нет.
                </small>
              </div>
            ) : null}
            {hasBranches ? (
              <details className={catalogStyles.branchAccordion} data-testid="catalog-branches-accordion">
                <summary className={catalogStyles.branchAccordionSummary}>
                  Филиалы уже добавлены ({branchCount})
                </summary>
                <p className={catalogStyles.fieldHint}>
                  Повторно вводить адрес первого филиала не нужно. Адреса настраиваются отдельно от
                  публичной карточки организации.
                </p>
              </details>
            ) : null}
            {needsBranchFields ? (
              <TextField
                id="catalog-branch-address"
                label="Адрес первого филиала"
                value={branchAddress}
                disabled={!catalogEditable}
                required
                onChange={(e) => onBranchAddressChange(e.target.value)}
                hint="Нужен, пока нет сохранённых филиалов."
              />
            ) : null}
          </div>
        ) : null}

        {step === 1 ? (
          <div id="catalog-products">
            <p className={catalogStyles.notice}>{catalogDirectionsNotice}</p>
            <ProfileDirectionsPicker
              disabled={!catalogEditable}
              catalogMode
              businessTabbedPick
              catalogGroupedDetails
              leadText={catalogDirectionsLead}
              copyFromWorkingProfileAvailable={
                workingProductIds.length > 0 ||
                workingServiceIds.length > 0 ||
                workingStageIds.length > 0
              }
              onCopyFromWorkingProfile={() => {
                onPullWorkingDirections();
                touchField(props, "specializations");
                touchField(props, "storeCategories");
                touchField(props, "navigatorStageIds");
              }}
              productCategoryIds={storeCategories}
              serviceSpecializationIds={specializations}
              navigatorStageIds={catalogStageIds}
              primaryDirection={null}
              onChangeProducts={(ids) => {
                touchField(props, "storeCategories");
                onStoreCategoriesChange(ids);
              }}
              onChangeServices={(ids) => {
                touchField(props, "specializations");
                onSpecializationsChange(ids);
              }}
              onChangeStages={(ids) => {
                touchField(props, "navigatorStageIds");
                onCatalogStageIdsChange(ids);
              }}
              onChangePrimary={() => {}}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div id="catalog-contacts" className={catalogStyles.fields}>
            <p className={catalogStyles.notice}>
              <strong>Для публикации нужен хотя бы один способ связи.</strong> Проверьте
              подставленные контакты или добавьте телефон, Telegram, Email либо сайт.
            </p>
            <div className={catalogStyles.field}>
              <label htmlFor="oc-web">Сайт с контактами</label>
              <input
                id="oc-web"
                placeholder="example.ru"
                value={website}
                disabled={!catalogEditable}
                onChange={(e) => {
                  touchField(props, "website");
                  onWebsiteChange(e.target.value);
                }}
              />
            </div>
            <div className={catalogStyles.field}>
              <label htmlFor="oc-tg">Telegram (публичный)</label>
              <input
                id="oc-tg"
                placeholder="@username"
                value={telegram}
                disabled={!catalogEditable}
                onChange={(e) => {
                  touchField(props, "telegram");
                  onTelegramChange(e.target.value);
                }}
              />
            </div>
            <div className={catalogStyles.field}>
              <label htmlFor="oc-email">Email для клиентов</label>
              <input
                id="oc-email"
                value={publicEmail}
                disabled={!catalogEditable}
                onChange={(e) => {
                  touchField(props, "publicEmail");
                  onPublicEmailChange(e.target.value);
                }}
              />
            </div>
            <AgentPhoneField
              ref={publicPhoneRef}
              wrapperClassName={catalogStyles.phoneFieldWrap}
              value={publicPhone}
              disabled={!catalogEditable}
              onChange={(v) => {
                touchField(props, "publicPhone");
                onPublicPhoneChange(v);
              }}
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className={catalogStyles.fields}>
            <p className={catalogStyles.intro}>
              Фото и описание необязательны. Можно перейти к предпросмотру без заполнения.
            </p>
            <CatalogWizardPhotoAttachment
              catalogImageUrl={catalogImageUrl}
              catalogEditable={catalogEditable}
              uploading={uploading}
              uploadError={uploadError}
              fileInputRef={fileRef}
              accept={CATALOG_IMAGE_ACCEPT}
              fileInputClassName={editorStyles.visuallyHidden}
              btnClassName={catalogStyles.btn}
              btnGhostClassName={catalogStyles.btnGhost}
              bannerErrorClassName={catalogStyles.bannerError}
              onFileChange={handleCatalogPhotoFileChange}
              onRemove={handleCatalogPhotoRemove}
            />
            <TextAreaField
              label="Описание"
              value={description}
              disabled={!catalogEditable}
              onChange={(e) => {
                touchField(props, "description");
                onDescriptionChange(e.target.value);
              }}
            />
          </div>
        ) : null}

        {step === 4 ? (
          <div className={surfaceStyles.businessCatalogPreviewHost} data-testid="catalog-preview-step">
            <p className={catalogStyles.intro}>
              Посмотрите карточку глазами клиента: всё ли понятно и нет ли данных, которые вы не
              хотите показывать публично.
            </p>
            <div
              className={surfaceStyles.businessCatalogReadiness}
              data-testid="catalog-readiness"
            >
              {missing.length > 0 ? (
                <>
                  <p className={catalogStyles.intro}>Осталось заполнить:</p>
                  <ul className={catalogStyles.reviewList}>
                    {missing.map((m) => (
                      <li key={m.id}>{m.label}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p
                  className={`${surfaceStyles.businessReadinessPill} ${surfaceStyles.businessReadinessPillGood}`}
                >
                  Обязательные поля заполнены
                </p>
              )}
            </div>
            <CatalogPublicationPreview profile={profile} draft={draft} variant="business" />
            <p className={surfaceStyles.businessCatalogPreviewNotice}>
              Когда всё готово, нажмите «{submitLabel}». Карточка появится в каталоге после
              одобрения модератором. Сохранение черновика не публикует карточку.
            </p>
          </div>
        ) : null}
      </section>

      <div className={catalogStyles.stepActions} data-testid="catalog-step-actions">
        <span className={catalogStyles.stepActionsLabel}>
          Шаг {step + 1} из {STEPS.length}
        </span>
        {step > 0 ? (
          <button
            type="button"
            className={catalogStyles.btn}
            disabled={saving || submitting}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Назад
          </button>
        ) : null}
        {step < 4 ? (
          <button
            type="button"
            className={`${catalogStyles.btn} ${catalogStyles.btnPrimary}`}
            disabled={saving}
            onClick={() => {
              const miss = stepMissing(step);
              if (miss) {
                setError(`Заполните: ${miss}. Незавершённую карточку можно сохранить как черновик.`);
                return;
              }
              setError("");
              setStep((s) => Math.min(4, s + 1));
            }}
          >
            {step === 3 ? "Предпросмотр" : "Далее"}
          </button>
        ) : null}
      </div>

      <footer className={catalogStyles.catalogFooter} data-testid="catalog-footer-bar">
        <button
          type="button"
          className={
            step === 4
              ? `${catalogStyles.btn} ${catalogStyles.btnGhost}`
              : `${catalogStyles.btn} ${catalogStyles.btnPrimary}`
          }
          disabled={saving || submitting || !catalogPublicationEditable(profile)}
          onClick={() => void saveDraft()}
        >
          {saving ? "Сохранение…" : "Сохранить черновик"}
        </button>
        <button
          type="button"
          className={`${catalogStyles.btn} ${catalogStyles.btnGhost}`}
          disabled={saving || submitting || !props.onRevertLocalEdits}
          onClick={() => {
            props.onRevertLocalEdits?.();
            setError("");
            setSuccess("");
            setStep(0);
          }}
        >
          Отменить изменения
        </button>
        {step === 4 && canSubmit && missing.length === 0 ? (
          <button
            type="button"
            className={`${catalogStyles.btn} ${catalogStyles.btnPrimary}`}
            disabled={submitting || saving}
            onClick={() => void submitPublication()}
          >
            {submitting ? "Отправка…" : submitLabel}
          </button>
        ) : null}
      </footer>
    </div>
  );
}
