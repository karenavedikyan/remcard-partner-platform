"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import {
  buildBusinessDirectionLabelMap,
  businessSummaryInitials,
} from "@/lib/business-profile/wizard-facts";
import { fetchPartnerTaxonomy } from "@/lib/partner-taxonomy";
import type { BusinessProfilePartnerType } from "@/lib/business-profile/eligibility";
import {
  businessStepContextLabel,
  businessStepPanelTitle,
  businessWizardCopy,
} from "@/lib/business-profile/wizard-copy";
import { externalBusinessProfileIdentityShift } from "@/lib/business-profile/wizard-identity";
import { isWorkingProfileDirty, profileDraftFromProfile } from "@/lib/profile-draft-sync";
import type { ProfileDraft } from "@/lib/profile-save";
import { formatAreasForTextField, parseAreasFromText } from "@/lib/profile-working-areas";
import {
  persistWorkingProfileDraft,
  validateWorkingProfileDraft,
  workingProfileCabinetReady,
} from "@/lib/profile-working-save";
import type { ProProfileResponse } from "@/lib/types";
import { ProfileDirectionsPicker } from "@/components/profile/ProfileDirectionsPicker";
import { BusinessWorkingProfileFacts } from "./BusinessWorkingProfileFacts";
import { AgentPhoneField, type AgentPhoneFieldHandle } from "@/components/profile/agent/AgentPhoneField";
import styles from "../agent/AgentProfileWizard.module.css";
import stepStyles from "../specialist/SpecialistWorkingProfileWizard.module.css";
import surfaceStyles from "./BusinessProfileSurface.module.css";

const WORK_MODES = [
  { value: "", label: "Не указано" },
  { value: "ON_SITE", label: "По адресу" },
  { value: "MOBILE", label: "На выезде" },
  { value: "BOTH", label: "По адресу и на выезде" },
  { value: "ONLINE", label: "Онлайн" },
] as const;

type Props = {
  initialProfile: ProProfileResponse;
  partnerType: BusinessProfilePartnerType;
  basicsEditable: boolean;
  onWorkingProfileSaved?: (next: ProProfileResponse) => void;
  onBasicsDirtyChange?: (dirty: boolean) => void;
  /** Dev-fixture only: open step editor without summary (visual QA). */
  forceEditing?: boolean;
  /** Dev-fixture only: initial step index 0..3 (visual QA). */
  forceStep?: number;
};

export function BusinessWorkingProfileWizard({
  initialProfile,
  partnerType,
  basicsEditable,
  onWorkingProfileSaved,
  onBasicsDirtyChange,
  forceEditing = false,
  forceStep,
}: Props) {
  const copy = businessWizardCopy(partnerType);
  const profileRef = useRef(initialProfile);
  /** Bumped on identity change or unmount — stale persist must not touch UI/callbacks. */
  const persistGenerationRef = useRef(0);
  /** Latest in-flight persist; older requests must not clear `saving` in finally. */
  const persistRequestIdRef = useRef(0);
  const editingRef = useRef(false);
  const phoneRef = useRef<AgentPhoneFieldHandle>(null);

  const [draft, setDraft] = useState<ProfileDraft>(() => profileDraftFromProfile(initialProfile));
  const [savedSnapshot, setSavedSnapshot] = useState<ProfileDraft>(() =>
    profileDraftFromProfile(initialProfile),
  );
  const [areasText, setAreasText] = useState(() =>
    formatAreasForTextField(profileDraftFromProfile(initialProfile).areas),
  );
  const [step, setStep] = useState(() =>
    typeof forceStep === "number" ? Math.min(3, Math.max(0, forceStep)) : 0,
  );
  const [editing, setEditing] = useState(
    () =>
      forceEditing ||
      !workingProfileCabinetReady(profileDraftFromProfile(initialProfile)),
  );
  editingRef.current = editing;
  const [banner, setBanner] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [directionLabelByKey, setDirectionLabelByKey] = useState<Map<string, string>>(
    () => new Map(),
  );

  useEffect(() => {
    let cancelled = false;
    void fetchPartnerTaxonomy()
      .then((data) => {
        if (cancelled) return;
        setDirectionLabelByKey(buildBusinessDirectionLabelMap(data));
      })
      .catch(() => {
        if (!cancelled) setDirectionLabelByKey(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resetWizardFromProfile = useCallback((source: ProProfileResponse, editingNext: boolean) => {
    profileRef.current = source;
    const next = profileDraftFromProfile(source);
    setDraft(next);
    setSavedSnapshot(next);
    setAreasText(formatAreasForTextField(next.areas));
    setStep(0);
    setEditing(editingNext);
    setBanner(null);
    setSaving(false);
  }, []);

  useEffect(() => {
    return () => {
      persistGenerationRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const prev = profileRef.current;
    if (externalBusinessProfileIdentityShift(prev, initialProfile)) {
      persistGenerationRef.current += 1;
      resetWizardFromProfile(
        initialProfile,
        !workingProfileCabinetReady(profileDraftFromProfile(initialProfile)),
      );
      return;
    }
    profileRef.current = initialProfile;
    const next = profileDraftFromProfile(initialProfile);
    setSavedSnapshot(next);
    if (!editingRef.current) {
      setDraft(next);
      setAreasText(formatAreasForTextField(next.areas));
    }
  }, [initialProfile, resetWizardFromProfile]);

  const draftWithAreas = useCallback((): ProfileDraft => {
    return { ...draft, areas: parseAreasFromText(areasText), partnerType };
  }, [areasText, draft, partnerType]);

  const workingDraft = useMemo(() => draftWithAreas(), [draftWithAreas]);
  const basicsDirty = useMemo(
    () => isWorkingProfileDirty(savedSnapshot, workingDraft),
    [savedSnapshot, workingDraft],
  );

  useEffect(() => {
    onBasicsDirtyChange?.(basicsDirty);
  }, [basicsDirty, onBasicsDirtyChange]);

  const persistStillCurrent = (generationAtStart: number, requestId: number): boolean => {
    return (
      generationAtStart === persistGenerationRef.current &&
      requestId === persistRequestIdRef.current
    );
  };

  const persistServer = async (nextDraft: ProfileDraft): Promise<boolean> => {
    const err = validateWorkingProfileDraft(nextDraft);
    if (err) {
      setBanner({ kind: "error", text: err });
      return false;
    }
    const generationAtStart = persistGenerationRef.current;
    const requestId = ++persistRequestIdRef.current;
    setSaving(true);
    setBanner(null);
    try {
      const refreshed = await persistWorkingProfileDraft(profileRef.current, nextDraft);
      if (!persistStillCurrent(generationAtStart, requestId)) {
        return false;
      }
      profileRef.current = refreshed;
      const synced = profileDraftFromProfile(refreshed);
      setDraft(synced);
      setSavedSnapshot(synced);
      setAreasText(formatAreasForTextField(synced.areas));
      onWorkingProfileSaved?.(refreshed);
      return true;
    } catch (e) {
      if (!persistStillCurrent(generationAtStart, requestId)) {
        return false;
      }
      setBanner({
        kind: "error",
        text: e instanceof RemcardApiError ? e.message : "Не удалось сохранить профиль.",
      });
      return false;
    } finally {
      if (persistStillCurrent(generationAtStart, requestId)) {
        setSaving(false);
      }
    }
  };

  const saveDraftOnly = async () => {
    const committed = phoneRef.current?.commitPending();
    let next = draftWithAreas();
    if (committed !== undefined) {
      next = { ...next, partnershipContactPhone: committed };
      setDraft(next);
    }
    const ok = await persistServer(next);
    if (ok) setBanner({ kind: "success", text: "Данные сохранены на сервере." });
  };

  const skipStep = async () => {
    const next = draftWithAreas();
    const ok = await persistServer(next);
    if (ok) setStep((s) => Math.min(3, s + 1));
  };

  const onSubmitStep = async (e: FormEvent) => {
    e.preventDefault();
    if (!basicsEditable) return;

    const committed = phoneRef.current?.commitPending();
    let next = draftWithAreas();
    if (committed !== undefined) {
      next = { ...next, partnershipContactPhone: committed };
      setDraft(next);
    }

    if (step === 0) {
      if (!next.organizationName.trim() || !next.displayName.trim() || !next.city.trim()) {
        setBanner({
          kind: "error",
          text: `Укажите ${copy.orgFieldLabel.toLowerCase()}, ${copy.repFieldLabel.toLowerCase()} и город.`,
        });
        return;
      }
      const ok = await persistServer(next);
      if (ok) setStep(1);
      return;
    }
    if (step === 1) {
      const ok = await persistServer(next);
      if (ok) setStep(2);
      return;
    }
    if (step === 2) {
      const ok = await persistServer(next);
      if (ok) setStep(3);
      return;
    }
    const ok = await persistServer(next);
    if (ok) {
      setEditing(false);
      setBanner({ kind: "success", text: "Рабочий профиль сохранён." });
    }
  };

  const reloadSaved = () => {
    const next = profileDraftFromProfile(profileRef.current);
    setDraft(next);
    setSavedSnapshot(next);
    setAreasText(formatAreasForTextField(next.areas));
    setBanner({ kind: "success", text: "Отменены несохранённые правки." });
    onBasicsDirtyChange?.(false);
  };

  if (!editing && workingProfileCabinetReady(savedSnapshot)) {
    const orgTitle = savedSnapshot.organizationName.trim() || "—";
    const publicId = profileRef.current.user.publicId?.trim() || "";
    return (
      <div className={styles.pw} data-testid="business-profile-completed-summary">
        <section className={styles.summary}>
          <div className={styles.summaryHeader}>
            <div className={styles.avatar} aria-hidden>
              {businessSummaryInitials(savedSnapshot)}
            </div>
            <div className={styles.summaryIdentity}>
              <span className={styles.kicker}>{copy.kicker}</span>
              <h2 className={styles.summaryTitle}>{orgTitle}</h2>
              <p className={styles.cityMuted}>
                {savedSnapshot.city.trim() || "Город не указан"}
              </p>
            </div>
            <span className={styles.summaryStatus}>Заполнено</span>
          </div>
          {banner ? (
            <p className={banner.kind === "error" ? styles.bannerError : styles.bannerSuccess}>
              {banner.text}
            </p>
          ) : null}
          <BusinessWorkingProfileFacts
            draft={savedSnapshot}
            copy={copy}
            labelByKey={directionLabelByKey}
            areasText={areasText}
            testId="business-summary-facts"
          />
          <div className={styles.summaryActions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              data-testid="business-profile-edit-button"
              disabled={!basicsEditable || saving}
              onClick={() => {
                setStep(0);
                setEditing(true);
              }}
            >
              Редактировать профиль
            </button>
            {publicId ? <span className={styles.cityMuted}>ID {publicId}</span> : null}
          </div>
        </section>
        <section className={styles.summaryAfter} aria-label="Каталог RemCard">
          <div>
            <h3>Хотите появиться в каталоге?</h3>
            <p>Публикация добровольна. Публичную карточку можно подготовить отдельно.</p>
          </div>
          <Link href="/profile?section=catalog" className={styles.btn}>
            Перейти к каталогу
          </Link>
        </section>
      </div>
    );
  }

  const patternStep = step === 0 || step === 1 || step === 3;

  return (
    <div
      className={
        patternStep ? `${styles.pw} ${stepStyles.patternWizardRoot}` : styles.pw
      }
      data-testid="business-profile-wizard"
    >
      <div
        className={
          patternStep ? `${styles.layout} ${stepStyles.patternWizardLayout}` : styles.layout
        }
        data-testid="business-profile-wizard-layout"
      >
        <aside className={styles.journey} aria-label="Этапы профиля">
          <span className={styles.kicker}>{copy.kicker}</span>
          <h2 className={styles.title}>{copy.journeyTitle}</h2>
          <p className={styles.intro} data-testid="business-journey-intro">
            {copy.journeyIntro}
          </p>
          <ol className={styles.steps}>
            {copy.steps.map((label, i) => (
              <li
                key={label}
                className={
                  i === step ? styles.stepCurrent : i < step ? styles.stepDone : undefined
                }
              >
                <button
                  type="button"
                  className={styles.stepBtn}
                  aria-current={i === step ? "step" : undefined}
                  disabled={saving || !basicsEditable || i > step}
                  onClick={() => setStep(i)}
                >
                  <span className={styles.stepNumber}>{i < step ? "✓" : i + 1}</span>
                  <span>{label}</span>
                  {i === 1 || i === 2 ? <small>необязательно</small> : null}
                </button>
              </li>
            ))}
          </ol>
        </aside>
        <section
          className={
            patternStep ? `${styles.card} ${stepStyles.patternStepCard}` : styles.card
          }
          data-testid="business-profile-step-card"
        >
          {step === 2 ? (
            <div className={stepStyles.contactsCardTop}>
              <span className={stepStyles.contactsKicker} data-testid="business-profile-progress">
                Шаг {step + 1} из {copy.steps.length}
              </span>
              <span className={stepStyles.contactsStepLabel}>Можно пропустить</span>
            </div>
          ) : (
            <div className={stepStyles.stepCardTop}>
              <span className={stepStyles.stepKicker} data-testid="business-profile-progress">
                Шаг {step + 1} из {copy.steps.length}
              </span>
              <span
                className={
                  step === 3
                    ? `${stepStyles.stepContextLabel} ${stepStyles.stepContextLabelReview}`
                    : stepStyles.stepContextLabel
                }
              >
                {businessStepContextLabel(step)}
              </span>
            </div>
          )}
          {banner ? (
            <p className={banner.kind === "error" ? styles.bannerError : styles.bannerSuccess}>
              {banner.text}
            </p>
          ) : null}
          <h2
            className={
              patternStep ? `${styles.title} ${stepStyles.patternStepTitle}` : styles.title
            }
          >
            {businessStepPanelTitle(step, copy)}
          </h2>
          <form onSubmit={(ev) => void onSubmitStep(ev)}>
            {step === 0 ? (
              <div className={stepStyles.stepPanel} data-testid="business-profile-basics-panel">
                <div className={stepStyles.basicsBlock}>
                  <div className={stepStyles.basicsFields}>
                    <div className={stepStyles.basicsField} data-profile-focus="organizationName">
                      <label htmlFor="bp-org">
                        {copy.orgFieldLabel} <span className={styles.required}>*</span>
                      </label>
                      <input
                        id="bp-org"
                        className={stepStyles.controlInput}
                        placeholder={
                          partnerType === "STORE" ? "Например, Магазин «Оптовик»" : "Например, ООО «Юг»"
                        }
                        value={draft.organizationName}
                        disabled={!basicsEditable}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, organizationName: e.target.value }))
                        }
                      />
                      <small className={stepStyles.basicsHelper}>{copy.orgFieldHint}</small>
                    </div>
                    <div className={stepStyles.basicsField} data-profile-focus="displayName">
                      <label htmlFor="bp-rep">
                        {copy.repFieldLabel} <span className={styles.required}>*</span>
                      </label>
                      <input
                        id="bp-rep"
                        className={stepStyles.controlInput}
                        autoComplete="name"
                        placeholder="Например, Алексей Иванов"
                        value={draft.displayName}
                        disabled={!basicsEditable}
                        onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
                      />
                      <small className={stepStyles.basicsHelper}>{copy.repFieldHint}</small>
                    </div>
                    <div className={stepStyles.basicsField} data-profile-focus="city">
                      <label htmlFor="bp-city">
                        Город <span className={styles.required}>*</span>
                      </label>
                      <input
                        id="bp-city"
                        className={stepStyles.controlInput}
                        placeholder="Например, Краснодар"
                        value={draft.city}
                        disabled={!basicsEditable}
                        onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                      />
                      <small className={stepStyles.basicsHelper}>{copy.cityFieldHint}</small>
                    </div>
                  </div>
                </div>
                <p className={stepStyles.basicsFootnote} data-testid="business-basics-form-footnote">
                  {copy.basicsFormFootnote}
                </p>
              </div>
            ) : null}
            {step === 1 ? (
              <div
                className={stepStyles.stepPanel}
                data-testid="business-profile-directions-panel"
              >
                <p className={stepStyles.specializationLead}>{copy.directionsLead}</p>
                <p className={surfaceStyles.businessDirectionsNote}>{copy.directionsNavigatorNote}</p>
                <ProfileDirectionsPicker
                  tileLayout
                  businessTabbedPick
                  omitLead
                  collapseAdvancedDirections
                  presentationVariant="default"
                  productCategoryIds={draft.productCategoryIds}
                  serviceSpecializationIds={draft.serviceSpecializationIds}
                  navigatorStageIds={draft.navigatorStageIds}
                  primaryDirection={draft.primaryDirection}
                  onChangeProducts={(ids) => setDraft((d) => ({ ...d, productCategoryIds: ids }))}
                  onChangeServices={(ids) =>
                    setDraft((d) => ({ ...d, serviceSpecializationIds: ids }))
                  }
                  onChangeStages={(ids) => setDraft((d) => ({ ...d, navigatorStageIds: ids }))}
                  onChangePrimary={(dir) => setDraft((d) => ({ ...d, primaryDirection: dir }))}
                />
              </div>
            ) : null}
            {step === 2 ? (
              <div
                className={stepStyles.contactsPanel}
                data-testid="business-profile-contacts-panel"
              >
                <p className={styles.intro}>
                  Контакты для сотрудничества с партнёрами RemCard. Не используются для входа через
                  Telegram или MAX.
                </p>
                <div className={stepStyles.contactsTwoCol}>
                  <AgentPhoneField
                    ref={phoneRef}
                    wrapperClassName={styles.phoneFieldWrap}
                    helperText="Можно начать с 8, 7 или ввести 10 цифр. Сохраним через +7."
                    value={draft.partnershipContactPhone}
                    disabled={!basicsEditable}
                    onChange={(v) => setDraft((d) => ({ ...d, partnershipContactPhone: v }))}
                  />
                  <div className={styles.field}>
                    <label htmlFor="bp-email">Email</label>
                    <input
                      id="bp-email"
                      type="email"
                      autoComplete="email"
                      disabled={!basicsEditable}
                      value={draft.partnershipContactEmail}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, partnershipContactEmail: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="bp-contact-name">Контактное лицо</label>
                  <input
                    id="bp-contact-name"
                    disabled={!basicsEditable}
                    value={draft.partnershipContactName}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, partnershipContactName: e.target.value }))
                    }
                  />
                </div>
                <details className={stepStyles.contactsOptional}>
                  <summary>
                    Сайт и Telegram <span>необязательно</span>
                  </summary>
                  <div className={stepStyles.contactsOptionalInner}>
                    <div className={styles.field}>
                      <label htmlFor="bp-site">Сайт</label>
                      <input
                        id="bp-site"
                        disabled={!basicsEditable}
                        value={draft.website}
                        onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="bp-tg">Telegram</label>
                      <input
                        id="bp-tg"
                        disabled={!basicsEditable}
                        value={draft.telegram}
                        onChange={(e) => setDraft((d) => ({ ...d, telegram: e.target.value }))}
                      />
                    </div>
                  </div>
                </details>
                <details className={stepStyles.contactsOptional}>
                  <summary>
                    Где и как вы работаете <span>необязательно</span>
                  </summary>
                  <div className={stepStyles.contactsOptionalInner}>
                    <div className={styles.field}>
                      <label htmlFor="bp-workmode">Формат работы</label>
                      <select
                        id="bp-workmode"
                        disabled={!basicsEditable}
                        value={draft.partnerWorkMode}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, partnerWorkMode: e.target.value }))
                        }
                      >
                        {WORK_MODES.map((m) => (
                          <option key={m.value || "empty"} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="bp-areas">Территория работы</label>
                      <textarea
                        id="bp-areas"
                        disabled={!basicsEditable}
                        value={areasText}
                        onChange={(e) => setAreasText(e.target.value)}
                      />
                    </div>
                  </div>
                </details>
              </div>
            ) : null}
            {step === 3 ? (
              <div
                className={`${stepStyles.stepPanel} ${stepStyles.reviewPanel}`}
                data-testid="business-profile-review-panel"
              >
                <BusinessWorkingProfileFacts
                  draft={workingDraft}
                  copy={copy}
                  labelByKey={directionLabelByKey}
                  areasText={areasText}
                />
                <p className={stepStyles.reviewFootnote}>
                  Рабочий профиль и публикация в каталоге независимы. Сохранение не отправляет на
                  модерацию.
                </p>
              </div>
            ) : null}
            <div
              className={step === 2 ? stepStyles.contactsStepActions : stepStyles.stepActions}
              data-testid={step === 2 ? "business-contacts-actions" : "business-step-actions"}
            >
              <div
                className={step === 2 ? stepStyles.contactsActionsLeft : stepStyles.stepActionsLeft}
              >
                {step > 0 ? (
                  <button
                    type="button"
                    className={styles.btn}
                    disabled={saving || !basicsEditable}
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                  >
                    Назад
                  </button>
                ) : null}
                {step !== 2 ? (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnQuiet}`}
                    disabled={saving || !basicsEditable}
                    onClick={reloadSaved}
                  >
                    Отменить правки
                  </button>
                ) : null}
              </div>
              <div
                className={
                  step === 2 ? stepStyles.contactsActionsRight : stepStyles.stepActionsRight
                }
              >
                {(step === 1 || step === 2) && (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnQuiet}`}
                    disabled={saving || !basicsEditable}
                    onClick={() => void skipStep()}
                  >
                    Пропустить
                  </button>
                )}
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDraft}`}
                  disabled={saving || !basicsEditable}
                  onClick={() => void saveDraftOnly()}
                >
                  {saving ? "Сохранение…" : "Сохранить"}
                </button>
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnPrimary} ${step !== 2 ? stepStyles.stepPrimaryBtn : ""}`}
                  disabled={saving || !basicsEditable}
                >
                  {step === 3 ? "Сохранить профиль" : "Продолжить →"}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
