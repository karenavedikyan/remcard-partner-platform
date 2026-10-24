"use client";

import { FormEvent, useMemo, useRef, useState, useCallback, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { RemcardApiError } from "@/lib/api-client";
import { uploadCatalogImage, CATALOG_IMAGE_ACCEPT } from "@/lib/catalog-image-upload";
import { catalogPublicationStatusLabel } from "@/lib/profile-catalog-completeness";
import { specialistCatalogMissingForSubmit } from "@/lib/specialist-r06/catalog-completeness";
import {
  canSubmitProfileForModeration,
  catalogPublicationEditable,
  effectiveCatalogStatus,
} from "@/lib/profile-catalog-state";
import {
  persistCatalogDraftOnly,
  refreshProfile,
  submitProfileForModerationReview,
  type ProfileDraft,
} from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import { catalogStatusTone } from "@/lib/partnership-labels";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TextAreaField, TextField } from "@/components/ui/FormField";
import { CatalogCategoryAvatar } from "../CatalogCategoryAvatar";
import { CatalogPublicationPreview } from "../CatalogPublicationPreview";
import { CatalogWizardPhotoAttachment } from "../CatalogWizardPhotoAttachment";
import { ProfileDirectionsPicker } from "../ProfileDirectionsPicker";
import { AgentPhoneField, type AgentPhoneFieldHandle } from "../agent/AgentPhoneField";
import type { CatalogPrefillField, CatalogTouchedMap } from "@/lib/specialist-r06/catalog-prefill";
import { markCatalogFieldTouched } from "@/lib/specialist-r06/catalog-prefill";
import editorStyles from "../ProfileEditor.module.css";
import catalogStyles from "./SpecialistCatalogWizard.module.css";
import { SpecialistPresetSection } from "./SpecialistPresetSection";
import { applySpecialistPreset } from "@/lib/specialist-r06/presets";
import type { SpecialistKindId } from "@/lib/specialist-r06/types";

const STEPS = ["Карточка", "Направления", "Контакты", "Оформление", "Предпросмотр"] as const;
const STEP_PANEL_TITLES = [
  "Карточка партнёра",
  "Категории и этапы для каталога",
  "Публичные контакты",
  "Фото и описание",
  "Предпросмотр карточки",
] as const;

function applyCatalogPresetFromKind(
  kind: SpecialistKindId | "",
  merge: boolean,
  serviceIds: string[],
  stageIds: string[],
): { services: string[]; stages: string[] } {
  const draft = {
    specialistKind: kind,
    serviceSpecializationIds: [...serviceIds],
    navigatorStageIds: [...stageIds],
  };
  if (kind) applySpecialistPreset(draft, kind, merge);
  return {
    services: draft.serviceSpecializationIds ?? [],
    stages: draft.navigatorStageIds ?? [],
  };
}

export type SpecialistCatalogWizardProps = {
  profile: ProProfileResponse;
  draft: ProfileDraft;
  catalogEditable: boolean;
  catalogTouched: CatalogTouchedMap;
  onCatalogTouchedChange: (next: CatalogTouchedMap) => void;
  onProfileUpdated: (next: ProProfileResponse) => void;
  catalogPublicName: string;
  onCatalogPublicNameChange: (value: string) => void;
  catalogCity: string;
  onCatalogCityChange: (value: string) => void;
  showFullName: boolean;
  onShowFullNameChange: (value: boolean) => void;
  catalogImageUrl: string;
  onCatalogImageUrlChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  specializations: string[];
  onSpecializationsChange: (ids: string[]) => void;
  catalogStageIds: string[];
  onCatalogStageIdsChange: (ids: string[]) => void;
  website: string;
  onWebsiteChange: (value: string) => void;
  telegram: string;
  onTelegramChange: (value: string) => void;
  publicEmail: string;
  onPublicEmailChange: (value: string) => void;
  publicPhone: string;
  onPublicPhoneChange: (value: string) => void;
  onPullWorkingDirections: () => void;
  workingServiceIds: string[];
  workingStageIds: string[];
  onRevertLocalEdits?: () => void;
};

function touchField(
  props: SpecialistCatalogWizardProps,
  field: CatalogPrefillField,
) {
  props.onCatalogTouchedChange(markCatalogFieldTouched(props.catalogTouched, field));
}

export function SpecialistCatalogWizard(props: SpecialistCatalogWizardProps) {
  const {
    profile,
    draft,
    catalogEditable,
    onProfileUpdated,
    catalogPublicName,
    onCatalogPublicNameChange,
    catalogCity,
    onCatalogCityChange,
    showFullName,
    onShowFullNameChange,
    catalogImageUrl,
    onCatalogImageUrlChange,
    description,
    onDescriptionChange,
    specializations,
    onSpecializationsChange,
    catalogStageIds,
    onCatalogStageIdsChange,
    website,
    onWebsiteChange,
    telegram,
    onTelegramChange,
    publicEmail,
    onPublicEmailChange,
    publicPhone,
    onPublicPhoneChange,
    onPullWorkingDirections,
    workingServiceIds,
    workingStageIds,
  } = props;

  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [catalogKind, setCatalogKind] = useState<SpecialistKindId | "">("");
  const [catalogPresetNotice, setCatalogPresetNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const publicPhoneRef = useRef<AgentPhoneFieldHandle>(null);
  const submitAlertRef = useRef<HTMLParagraphElement>(null);

  const catalogStatus = effectiveCatalogStatus(profile);
  const publicationLabel = catalogPublicationStatusLabel(profile);
  const canSubmit = canSubmitProfileForModeration(profile);
  const missing = useMemo(() => specialistCatalogMissingForSubmit(profile, draft), [profile, draft]);
  const draftPending = profile.catalogPublication?.draftPending || profile.user.catalogDraftPending;

  const submitLabel =
    catalogStatus === "NEEDS_REVISION"
      ? "Отправить повторно"
      : catalogStatus === "APPROVED" && draftPending
        ? "Отправить повторно"
        : "Отправить на публикацию";

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
    if (specialistCatalogMissingForSubmit(profile, draftForSubmit).length > 0) {
      setError("Заполните обязательные поля перед отправкой.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const result = await submitProfileForModerationReview(profile, draftForSubmit);
      if (result.refreshFailed) {
        setSuccess("Заявка отправлена, ожидает проверки");
        setError("Не удалось обновить статус на экране — обновите страницу.");
        try {
          const refreshed = await refreshProfile();
          onProfileUpdated(refreshed);
          setError("");
        } catch {
          /* keep soft refresh hint */
        }
      } else if (result.profile) {
        onProfileUpdated(result.profile);
        setSuccess("Заявка отправлена, ожидает проверки");
      }
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

  const applyCatalogKind = useCallback(
    (kind: SpecialistKindId | "", merge: boolean) => {
      const next = applyCatalogPresetFromKind(
        kind,
        merge,
        specializations,
        catalogStageIds,
      );
      touchField(props, "specializations");
      touchField(props, "navigatorStageIds");
      onSpecializationsChange(next.services);
      onCatalogStageIdsChange(next.stages);
    },
    [catalogStageIds, onCatalogStageIdsChange, onSpecializationsChange, props, specializations],
  );

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
      if (!catalogPublicName.trim()) return "Публичное имя";
      if (!catalogCity.trim()) return "Город";
    }
    if (idx === 1) {
      if (specializations.length === 0) return "Услуги";
      if (catalogStageIds.length === 0) return "Этапы";
    }
    return null;
  };

  return (
    <div
      className={catalogStyles.root}
      data-testid="specialist-catalog-wizard"
      data-catalog-step={step}
      data-catalog-status={catalogStatus}
    >
      <section className={catalogStyles.introCard} data-testid="catalog-intro-card">
        <header className={catalogStyles.heading}>
          <div>
            <span className={catalogStyles.kicker}>Публичная страница</span>
            <h2 className={catalogStyles.title}>Подключение к каталогу</h2>
          </div>
          <StatusBadge label={publicationLabel} tone={catalogStatusTone(catalogStatus)} />
        </header>
        <p className={catalogStyles.introLead}>
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
        <h2 className={catalogStyles.title}>{STEP_PANEL_TITLES[step]}</h2>
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
              <p className={catalogStyles.stepIntro}>
                Помогите клиенту узнать вас и понять, с какой задачей к вам обратиться. Название и
                описание представляют вас без дополнительных объяснений.
              </p>
              <div className={catalogStyles.field}>
                <label htmlFor="sc-public-name">
                  Публичное имя <span className={catalogStyles.required}>*</span>
                </label>
                <input
                  id="sc-public-name"
                  placeholder="Например: Сергей · электромонтаж"
                  value={catalogPublicName}
                  disabled={!catalogEditable}
                  onChange={(e) => {
                    touchField(props, "catalogPublicName");
                    onCatalogPublicNameChange(e.target.value);
                  }}
                />
                <small className={catalogStyles.fieldHint}>
                  Обязательно для отправки на проверку.
                </small>
              </div>
              <div className={catalogStyles.field}>
                <label htmlFor="sc-city">
                  Город <span className={catalogStyles.required}>*</span>
                </label>
                <input
                  id="sc-city"
                  value={catalogCity}
                  disabled={!catalogEditable}
                  onChange={(e) => {
                    touchField(props, "catalogCity");
                    onCatalogCityChange(e.target.value);
                  }}
                />
                <small className={catalogStyles.fieldHint}>
                  Город работы из основных данных; для карточки можно уточнить.
                </small>
              </div>
              <label className={catalogStyles.checkRow}>
                <input
                  type="checkbox"
                  checked={showFullName}
                  disabled={!catalogEditable}
                  onChange={(e) => onShowFullNameChange(e.target.checked)}
                />
                <span>Показывать полное имя представителя в каталоге</span>
              </label>
            </div>
          ) : null}

          {step === 1 ? (
            <div id="catalog-products">
              <p className={catalogStyles.notice}>
                Для публикации обязательны хотя бы одна категория работ или услуг и хотя бы один
                этап ремонта. Незавершённую карточку можно сохранить как черновик.
              </p>
              <SpecialistPresetSection
                selectId="sc-specialist-kind"
                specialistKind={catalogKind}
                notice={catalogPresetNotice}
                disabled={!catalogEditable}
                persistCustomTitle={false}
                onKindChange={(kind) => {
                  setCatalogKind(kind);
                  applyCatalogKind(kind, false);
                  setCatalogPresetNotice(
                    !kind
                      ? "Категории и этапы можно выбрать вручную."
                      : kind === "other"
                        ? "Выберите категории и этапы вручную (название роли в каталоге не сохраняется)."
                        : "Стартовые категории и этапы подставлены. Проверьте и отредактируйте их.",
                  );
                }}
                onApplyMerge={() => {
                  applyCatalogKind(catalogKind, true);
                  setCatalogPresetNotice(
                    "Стартовый набор добавлен. Уже выбранные категории и этапы сохранены.",
                  );
                }}
              />
              <ProfileDirectionsPicker
                disabled={!catalogEditable}
                catalogMode
                specialistMode
                catalogGroupedDetails
                copyFromWorkingProfileAvailable={
                  workingServiceIds.length > 0 || workingStageIds.length > 0
                }
                onCopyFromWorkingProfile={() => {
                  onPullWorkingDirections();
                  touchField(props, "specializations");
                  touchField(props, "navigatorStageIds");
                }}
                taxonomyProposalScope="catalog-specialist"
                productCategoryIds={[]}
                serviceSpecializationIds={specializations}
                navigatorStageIds={catalogStageIds}
                primaryDirection={null}
                onChangeProducts={() => {}}
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
              <span id="catalog-stages" className={editorStyles.visuallyHidden} />
            </div>
          ) : null}

          {step === 2 ? (
            <div id="catalog-contacts" className={catalogStyles.fields}>
              <p className={catalogStyles.notice}>
                <strong>Для публикации нужен хотя бы один способ связи.</strong> Проверьте
                подставленные контакты или добавьте телефон, Telegram, Email либо сайт, по которым
                клиент может с вами связаться.
              </p>
              <small className={catalogStyles.fieldHint}>
                Сохранённые контакты подставляются из вашего профиля. Можно изменить или убрать их
                только для каталога. После одобрения эти данные будут видны клиентам.
              </small>
              <div className={catalogStyles.field}>
                <label htmlFor="sc-web">Сайт с контактами</label>
                <input
                  id="sc-web"
                  placeholder="example.ru"
                  value={website}
                  disabled={!catalogEditable}
                  onChange={(e) => {
                    touchField(props, "website");
                    onWebsiteChange(e.target.value);
                  }}
                />
                <small className={catalogStyles.fieldHint}>
                  Можно example.ru или https://example.ru — протокол добавим автоматически.
                </small>
              </div>
              <div className={catalogStyles.field}>
                <label htmlFor="sc-tg">Telegram (публичный)</label>
                <input
                  id="sc-tg"
                  placeholder="@username"
                  value={telegram}
                  disabled={!catalogEditable}
                  onChange={(e) => {
                    touchField(props, "telegram");
                    onTelegramChange(e.target.value);
                  }}
                />
                <small className={catalogStyles.fieldHint}>
                  Укажите @username или t.me/username, по которому клиент сможет написать.
                </small>
              </div>
              <div className={catalogStyles.field}>
                <label htmlFor="sc-email">Email для клиентов</label>
                <input
                  id="sc-email"
                  value={publicEmail}
                  disabled={!catalogEditable}
                  onChange={(e) => {
                    touchField(props, "publicEmail");
                    onPublicEmailChange(e.target.value);
                  }}
                />
                <small className={catalogStyles.fieldHint}>Для запроса, сметы или документов.</small>
              </div>
              <AgentPhoneField
                ref={publicPhoneRef}
                wrapperClassName={catalogStyles.phoneFieldWrap}
                helperText="Можно 89186360088, 9186360088 или +79186360088. Сохраним через +7, без пробелов. Можно оставить пустым, если есть другой контакт."
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
            <div>
              <p className={catalogStyles.intro}>
                Посмотрите карточку глазами клиента: всё ли понятно и нет ли данных, которые вы не
                хотите показывать публично.
              </p>
              <CatalogPublicationPreview profile={profile} draft={draft} variant="specialist" />
              {missing.length > 0 ? (
                <ul className={catalogStyles.reviewList}>
                  {missing.map((m) => (
                    <li key={m.id}>{m.label}</li>
                  ))}
                </ul>
              ) : (
                <p className={catalogStyles.intro}>Можно отправить заявку на модерацию.</p>
              )}
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
