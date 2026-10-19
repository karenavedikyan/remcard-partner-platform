"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { formatPhoneForDisplay } from "@/lib/contact-phone-display";
import { RemcardApiError } from "@/lib/api-client";
import { refreshProfile } from "@/lib/profile-save";
import {
  discardSpecialistProfileDraft,
  fetchSpecialistProfileDraft,
  finishSpecialistProfile,
  patchSpecialistProfileDraft,
} from "@/lib/specialist-r06/api";
import type { SpecialistProfileDraftPayload } from "@/lib/specialist-r06/types";
import { applySpecialistPreset } from "@/lib/specialist-r06/presets";
import {
  specialistIdListDisplay,
  specialistKindDisplayLabel,
} from "@/lib/specialist-r06/display-labels";
import { ProfileDirectionsPicker } from "@/components/profile/ProfileDirectionsPicker";
import { AgentPhoneField, type AgentPhoneFieldHandle } from "@/components/profile/agent/AgentPhoneField";
import { SpecialistPresetSection } from "@/components/profile/specialist/SpecialistPresetSection";
import type { ProProfileResponse } from "@/lib/types";
import styles from "../agent/AgentProfileWizard.module.css";
import stepStyles from "./SpecialistWorkingProfileWizard.module.css";

const STEPS = ["О себе", "Специализация", "Связь и работа", "Проверка"] as const;

function stepPanelTitle(step: number): string {
  if (step === 0) return "Расскажите о себе";
  if (step === 1) return "Чем вы занимаетесь?";
  if (step === 2) return "Как с вами связаться?";
  if (step === 3) return "Всё верно?";
  return STEPS[step] ?? "";
}

function stepContextLabel(step: number): string {
  if (step === 0) return "Обязательные данные";
  if (step === 3) return "Перед сохранением";
  return "Можно пропустить";
}

function specialistPresetNotice(
  kind: SpecialistProfileDraftPayload["specialistKind"],
  applied: boolean,
): string {
  if (!kind) return "Категории и этапы можно выбрать вручную.";
  if (kind === "other") return "Укажите свою специализацию и выберите категории/этапы вручную.";
  if (applied) return "Стартовые категории и этапы подставлены. Проверьте и отредактируйте их.";
  return "Текущий выбор сохранён. Чтобы добавить подсказки, откройте стартовый набор.";
}

function displayOrEmpty(value: string | undefined | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "Не указано";
}

const WORK_MODES = [
  { value: "", label: "Не указано" },
  { value: "ON_SITE", label: "По адресу" },
  { value: "MOBILE", label: "На выезде" },
  { value: "BOTH", label: "По адресу и на выезде" },
  { value: "ONLINE", label: "Онлайн" },
] as const;

type Props = {
  onWorkingProfileSaved?: (next: ProProfileResponse) => void;
};

export function SpecialistWorkingProfileWizard({ onWorkingProfileSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [version, setVersion] = useState(0);
  const [draft, setDraft] = useState<SpecialistProfileDraftPayload>({});
  const [savedProfile, setSavedProfile] = useState<SpecialistProfileDraftPayload>({});
  const [profileComplete, setProfileComplete] = useState(false);
  const [editing, setEditing] = useState(true);
  const [banner, setBanner] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [versionConflict, setVersionConflict] = useState<{
    localDraft: SpecialistProfileDraftPayload;
    localStep: number;
    serverVersion: number;
    serverPayload: SpecialistProfileDraftPayload;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [specialistNotice, setSpecialistNotice] = useState("");
  const phoneRef = useRef<AgentPhoneFieldHandle>(null);

  const hydrate = useCallback(async () => {
    setLoading(true);
    setBanner(null);
    try {
      const data = await fetchSpecialistProfileDraft();
      setDraft(data.payload ?? {});
      setSavedProfile(data.savedProfile ?? data.payload ?? {});
      setVersion(data.version ?? 0);
      setProfileComplete(Boolean(data.profileComplete));
      setEditing(!data.profileComplete || Boolean(data.hasDraft));
      setStep(Math.max(0, Math.min(3, (data.step ?? 1) - 1)));
    } catch {
      setBanner({ kind: "error", text: "Не удалось загрузить черновик профиля." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const persist = async (
    nextStep: number,
    patch: SpecialistProfileDraftPayload,
    mode: "save" | "advance" = "advance",
  ) => {
    if (versionConflict) {
      setBanner({
        kind: "error",
        text: "Сначала выберите, как поступить с конфликтом версии.",
      });
      return false;
    }
    setSaving(true);
    setBanner(null);
    try {
      const res = await patchSpecialistProfileDraft({
        expectedVersion: version,
        step: nextStep + 1,
        mode,
        payload: patch,
      });
      setDraft(res.payload);
      setVersion(res.version);
      if (mode === "advance") setStep(nextStep);
      return true;
    } catch (e) {
      if (e instanceof RemcardApiError && e.status === 409) {
        const localDraft = { ...patch };
        const localStep = step;
        try {
          const server = await fetchSpecialistProfileDraft();
          setVersionConflict({
            localDraft,
            localStep,
            serverVersion: server.version ?? 0,
            serverPayload: server.payload ?? {},
          });
          setBanner({
            kind: "error",
            text: "Конфликт версии. Выберите, какие данные оставить, затем сохраните снова.",
          });
        } catch {
          setDraft(localDraft);
          setStep(localStep);
          setBanner({
            kind: "error",
            text: "Конфликт версии. Не удалось загрузить серверный черновик — ваши правки сохранены локально.",
          });
        }
      } else {
        setBanner({
          kind: "error",
          text: e instanceof RemcardApiError ? e.message : "Не удалось сохранить черновик.",
        });
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveDraftOnly = async () => {
    const committed = phoneRef.current?.commitPending();
    const patch =
      committed !== undefined ? { ...draft, partnershipContactPhone: committed } : draft;
    if (committed !== undefined) setDraft(patch);
    const ok = await persist(step, patch, "save");
    if (ok) setBanner({ kind: "success", text: "Черновик сохранён." });
  };

  const skipStep = async () => {
    await persist(Math.min(3, step + 1), draft, "advance");
  };

  const onSubmitStep = async (e: FormEvent) => {
    e.preventDefault();
    if (step === 0) {
      if (!draft.displayName?.trim() || !draft.city?.trim()) {
        setBanner({ kind: "error", text: "Укажите имя и город." });
        return;
      }
      await persist(1, draft);
      return;
    }
    if (step === 1) {
      await persist(2, draft);
      return;
    }
    if (step === 2) {
      const committed = phoneRef.current?.commitPending();
      const patch =
        committed !== undefined ? { ...draft, partnershipContactPhone: committed } : draft;
      if (committed !== undefined) setDraft(patch);
      await persist(3, patch);
      return;
    }
    if (versionConflict) {
      setBanner({
        kind: "error",
        text: "Сначала выберите, как поступить с конфликтом версии.",
      });
      return;
    }
    setSaving(true);
    setBanner(null);
    try {
      await finishSpecialistProfile({ expectedVersion: version });
      const refreshed = await refreshProfile();
      const synced = await fetchSpecialistProfileDraft();
      setVersion(synced.version ?? 0);
      setDraft(synced.payload ?? {});
      setSavedProfile(synced.savedProfile ?? synced.payload ?? {});
      setProfileComplete(true);
      setEditing(false);
      setBanner({ kind: "success", text: "Рабочий профиль сохранён." });
      onWorkingProfileSaved?.(refreshed);
    } catch (e) {
      setBanner({
        kind: "error",
        text: e instanceof RemcardApiError ? e.message : "Не удалось завершить профиль.",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetDraft = async () => {
    setSaving(true);
    setBanner(null);
    try {
      await discardSpecialistProfileDraft();
      await hydrate();
      setBanner({ kind: "success", text: "Черновик сброшен." });
    } catch {
      setBanner({ kind: "error", text: "Не удалось сбросить черновик." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className={styles.intro} data-testid="specialist-profile-loading">
        Загружаем профиль специалиста…
      </p>
    );
  }

  if (!editing && profileComplete) {
    const name = savedProfile.displayName?.trim() || "—";
    const factRows: { label: string; value: string }[] = [
      {
        label: "Телефон",
        value: savedProfile.partnershipContactPhone?.trim()
          ? formatPhoneForDisplay(savedProfile.partnershipContactPhone)
          : "",
      },
      { label: "Email", value: savedProfile.partnershipContactEmail?.trim() ?? "" },
      {
        label: "Специализация",
        value:
          specialistKindDisplayLabel(
            savedProfile.specialistKind,
            savedProfile.specialistTitle,
          ) || "",
      },
      {
        label: "Формат работы",
        value:
          WORK_MODES.find((m) => m.value === (savedProfile.partnerWorkMode ?? ""))?.label ?? "",
      },
      { label: "Сайт", value: savedProfile.publicSite?.trim() ?? "" },
      { label: "Telegram", value: savedProfile.publicTelegram?.trim() ?? "" },
      { label: "Территория", value: savedProfile.areas?.trim() ?? "" },
    ];
    const filledFacts = factRows.filter((row) => row.value.trim());
    const emptyFacts = factRows.filter((row) => !row.value.trim());

    return (
      <div className={styles.pw} data-testid="specialist-profile-completed-summary">
        <section className={styles.summary}>
          <div className={styles.summaryHeader}>
            <div className={styles.avatar}>{name.slice(0, 2).toUpperCase()}</div>
            <div className={styles.summaryIdentity}>
              <span className={styles.kicker}>Специалист</span>
              <h2 className={styles.summaryTitle}>{name}</h2>
              <p className={styles.cityMuted}>{savedProfile.city?.trim() || "Город не указан"}</p>
            </div>
            <span className={styles.summaryStatus}>Заполнено</span>
          </div>
          {banner ? (
            <p className={banner.kind === "error" ? styles.bannerError : styles.bannerSuccess}>
              {banner.text}
            </p>
          ) : null}
          {filledFacts.length > 0 ? (
            <dl className={styles.summaryFactsCompact}>
              {filledFacts.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {(savedProfile.serviceSpecializationIds?.length ||
            savedProfile.navigatorStageIds?.length) ? (
            <div className={styles.summaryPicked} aria-label="Выбранные направления">
              {(savedProfile.serviceSpecializationIds ?? []).map((id) => (
                <span key={`s-${id}`} className={styles.summaryChip}>
                  Услуга: {specialistIdListDisplay([id])}
                </span>
              ))}
              {(savedProfile.navigatorStageIds ?? []).map((id) => (
                <span key={`st-${id}`} className={styles.summaryChip}>
                  Этап: {specialistIdListDisplay([id])}
                </span>
              ))}
            </div>
          ) : null}
          {emptyFacts.length > 0 ? (
            <details className={styles.summaryMore}>
              <summary>Дополнительные сведения ({emptyFacts.length} не заполнено)</summary>
              <dl className={styles.summaryFactsCompact}>
                {emptyFacts.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>Не указано</dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : null}
          <div className={styles.summaryActions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={saving}
              onClick={() => {
                void (async () => {
                  setSaving(true);
                  setBanner(null);
                  try {
                    const data = await fetchSpecialistProfileDraft();
                    setDraft(data.payload ?? {});
                    setSavedProfile(data.savedProfile ?? data.payload ?? {});
                    setVersion(data.version ?? 0);
                    setStep(0);
                    setEditing(true);
                  } catch {
                    setBanner({ kind: "error", text: "Не удалось открыть черновик для редактирования." });
                  } finally {
                    setSaving(false);
                  }
                })();
              }}
            >
              Редактировать профиль
            </button>
          </div>
        </section>
        <section
          className={styles.summaryAfter}
          aria-label="Каталог RemCard"
          data-testid="specialist-catalog-cta"
        >
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
        patternStep
          ? `${styles.pw} ${stepStyles.patternWizardRoot}`
          : styles.pw
      }
      data-testid="specialist-profile-wizard"
    >
      <div
        className={
          patternStep ? `${styles.layout} ${stepStyles.patternWizardLayout}` : styles.layout
        }
        data-testid="specialist-profile-wizard-layout"
      >
        <aside className={styles.journey} aria-label="Этапы профиля">
          <span className={styles.kicker}>Специалист</span>
          <h2 className={styles.title}>Профиль без лишнего</h2>
          <p className={styles.intro}>
            Имя и город для начала. Остальное можно заполнить позже.
          </p>
          <ol className={styles.steps}>
            {STEPS.map((label, i) => (
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
                  disabled={saving || i > step}
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
          data-testid="specialist-profile-step-card"
        >
          {step === 2 ? (
            <div className={stepStyles.contactsCardTop}>
              <span className={stepStyles.contactsKicker} data-testid="specialist-profile-progress">
                Шаг {step + 1} из {STEPS.length}
              </span>
              <span className={stepStyles.contactsStepLabel}>Можно пропустить</span>
            </div>
          ) : (
            <div className={stepStyles.stepCardTop}>
              <span className={stepStyles.stepKicker} data-testid="specialist-profile-progress">
                Шаг {step + 1} из {STEPS.length}
              </span>
              <span
                className={
                  step === 3
                    ? `${stepStyles.stepContextLabel} ${stepStyles.stepContextLabelReview}`
                    : stepStyles.stepContextLabel
                }
              >
                {stepContextLabel(step)}
              </span>
            </div>
          )}
          {banner ? (
            <p className={banner.kind === "error" ? styles.bannerError : styles.bannerSuccess}>
              {banner.text}
            </p>
          ) : null}
          {versionConflict ? (
            <div
              className={styles.conflictPanel}
              data-testid="specialist-profile-version-conflict"
              role="alert"
            >
              <p className={styles.intro}>
                На сервере уже есть другая версия черновика. Ваши несохранённые правки не потеряны.
              </p>
              <div className={styles.actionsRight}>
                <button
                  type="button"
                  className={styles.btn}
                  disabled={saving}
                  onClick={() => {
                    setDraft(versionConflict.serverPayload);
                    setVersion(versionConflict.serverVersion);
                    setVersionConflict(null);
                    setBanner({
                      kind: "success",
                      text: "Загружена серверная версия черновика.",
                    });
                  }}
                >
                  Загрузить серверную версию
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={saving}
                  onClick={() => {
                    setDraft(versionConflict.localDraft);
                    setStep(versionConflict.localStep);
                    setVersion(versionConflict.serverVersion);
                    setVersionConflict(null);
                    setBanner({
                      kind: "success",
                      text: "Оставлены ваши правки. Сохраните снова с актуальной версией.",
                    });
                  }}
                >
                  Оставить мои правки
                </button>
              </div>
            </div>
          ) : null}
          <h2
            className={
              patternStep ? `${styles.title} ${stepStyles.patternStepTitle}` : styles.title
            }
          >
            {stepPanelTitle(step)}
          </h2>
          <form onSubmit={(ev) => void onSubmitStep(ev)}>
            {step === 0 ? (
              <div
                className={stepStyles.stepPanel}
                data-testid="specialist-profile-basics-panel"
              >
                <div className={stepStyles.basicsFields}>
                  <div className={stepStyles.basicsField}>
                    <label htmlFor="sp-displayName">
                      Ваше имя <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="sp-displayName"
                      name="name"
                      className={stepStyles.controlInput}
                      autoComplete="name"
                      placeholder="Например, Алексей Иванов"
                      value={draft.displayName ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
                    />
                    <small className={stepStyles.basicsHelper}>Так вас будут узнавать в RemCard.</small>
                  </div>
                  <div className={stepStyles.basicsField}>
                    <label htmlFor="sp-city">
                      Город работы <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="sp-city"
                      className={stepStyles.controlInput}
                      placeholder="Например, Краснодар"
                      value={draft.city ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                    />
                    <small className={stepStyles.basicsHelper}>Поможет подобрать партнёров рядом.</small>
                  </div>
                </div>
                <p
                  className={stepStyles.basicsFootnote}
                  data-testid="specialist-basics-footnote"
                >
                  Поля со звёздочкой обязательны. Это всё, что нужно для первого шага.
                </p>
              </div>
            ) : null}
            {step === 1 ? (
              <div
                className={stepStyles.stepPanel}
                data-testid="specialist-profile-specialization-panel"
              >
              <div className={styles.fields}>
                <p className={stepStyles.specializationLead}>
                  Выберите работы, которые выполняете. Можно несколько.
                </p>
                <div className={stepStyles.presetBundle}>
                  <SpecialistPresetSection
                    presentationVariant="workingProfile"
                    specialistKind={draft.specialistKind}
                    specialistTitle={draft.specialistTitle}
                    notice={specialistNotice}
                    onKindChange={(kind) => {
                      const next = { ...draft, specialistKind: kind, productCategoryIds: [] };
                      const applied = kind ? applySpecialistPreset(next, kind, false) : false;
                      setDraft(next);
                      setSpecialistNotice(specialistPresetNotice(kind, applied));
                    }}
                    onTitleChange={(title) => setDraft((d) => ({ ...d, specialistTitle: title }))}
                    onApplyMerge={() => {
                      const next = { ...draft, productCategoryIds: [] };
                      if (draft.specialistKind) applySpecialistPreset(next, draft.specialistKind, true);
                      setDraft(next);
                      setSpecialistNotice(
                        "Стартовый набор добавлен. Уже выбранные категории и этапы сохранены.",
                      );
                    }}
                  />
                </div>
                <ProfileDirectionsPicker
                  specialistMode
                  compactSpecialistGrid={false}
                  tileLayout
                  collapseAdvancedDirections
                  presentationVariant="specialistWorkingProfile"
                  omitLead
                  taxonomyProposalScope="profile-specialist"
                  productCategoryIds={[]}
                  serviceSpecializationIds={draft.serviceSpecializationIds ?? []}
                  navigatorStageIds={draft.navigatorStageIds ?? []}
                  primaryDirection={null}
                  onChangeProducts={() => {}}
                  onChangeServices={(ids) =>
                    setDraft((d) => ({ ...d, serviceSpecializationIds: ids, productCategoryIds: [] }))
                  }
                  onChangeStages={(ids) => setDraft((d) => ({ ...d, navigatorStageIds: ids }))}
                  onChangePrimary={() => {}}
                />
              </div>
              </div>
            ) : null}
            {step === 2 ? (
              <div
                className={stepStyles.contactsPanel}
                data-testid="specialist-profile-contacts-panel"
              >
                <p className={styles.intro}>
                  Укажите удобный способ связи. Необязательные поля можно оставить пустыми.
                </p>
                <div className={stepStyles.contactsTwoCol} data-testid="specialist-contacts-two-col">
                  <AgentPhoneField
                    ref={phoneRef}
                    wrapperClassName={styles.phoneFieldWrap}
                    helperText="Можно начать с 8, 7 или ввести 10 цифр. Сохраним через +7. Для связи, не для повторного входа."
                    value={draft.partnershipContactPhone ?? ""}
                    onChange={(v) => setDraft((d) => ({ ...d, partnershipContactPhone: v }))}
                  />
                  <div className={styles.field}>
                    <label htmlFor="sp-email">Email</label>
                    <input
                      id="sp-email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.ru"
                      value={draft.partnershipContactEmail ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, partnershipContactEmail: e.target.value }))
                      }
                    />
                    <small>Для письменных предложений.</small>
                  </div>
                </div>
                <details
                  className={stepStyles.contactsOptional}
                  data-testid="sp-contacts-optional-site-tg"
                >
                  <summary>
                    Сайт и Telegram <span>необязательно</span>
                  </summary>
                  <div className={stepStyles.contactsOptionalInner}>
                    <div className={styles.field}>
                      <label htmlFor="sp-site">Сайт</label>
                      <input
                        id="sp-site"
                        placeholder="example.ru"
                        value={draft.publicSite ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, publicSite: e.target.value }))}
                      />
                      <small>
                        Можно без https:// — добавим автоматически. Сайт подставится в каталог.
                      </small>
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="sp-tg">Telegram</label>
                      <input
                        id="sp-tg"
                        placeholder="@username или https://t.me/username"
                        value={draft.publicTelegram ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, publicTelegram: e.target.value }))}
                      />
                      <small>Можно изменить или убрать при подготовке публичной карточки.</small>
                    </div>
                  </div>
                </details>
                <details
                  className={stepStyles.contactsOptional}
                  data-testid="sp-contacts-optional-work"
                >
                  <summary>
                    Где и как вы работаете <span>необязательно</span>
                  </summary>
                  <div className={stepStyles.contactsOptionalInner}>
                    <div className={styles.field}>
                      <label htmlFor="sp-workmode">Формат работы</label>
                      <select
                        id="sp-workmode"
                        value={draft.partnerWorkMode ?? ""}
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
                      <label htmlFor="sp-areas">Территория работы</label>
                      <textarea
                        id="sp-areas"
                        placeholder="Например, Краснодар и ближайшие районы"
                        value={draft.areas ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, areas: e.target.value }))}
                      />
                      <small>Если работаете за пределами основного города.</small>
                    </div>
                  </div>
                </details>
              </div>
            ) : null}
            {step === 3 ? (
              <div
                className={`${stepStyles.stepPanel} ${stepStyles.reviewPanel}`}
                data-testid="specialist-profile-review-panel"
              >
                <dl className={stepStyles.reviewFacts} data-testid="specialist-review-facts">
                  <div>
                    <dt>Имя</dt>
                    <dd>{displayOrEmpty(draft.displayName)}</dd>
                  </div>
                  <div>
                    <dt>Город</dt>
                    <dd>{displayOrEmpty(draft.city)}</dd>
                  </div>
                  <div>
                    <dt>Телефон</dt>
                    <dd>
                      {displayOrEmpty(
                        draft.partnershipContactPhone
                          ? formatPhoneForDisplay(draft.partnershipContactPhone)
                          : "",
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{displayOrEmpty(draft.partnershipContactEmail)}</dd>
                  </div>
                  {draft.specialistKind ? (
                    <div className={stepStyles.reviewFactsFullRow}>
                      <dt>Роль специалиста</dt>
                      <dd>
                        {specialistKindDisplayLabel(draft.specialistKind, draft.specialistTitle)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <div className={stepStyles.reviewDirections}>
                  <strong>Направления</strong>
                  <div className={stepStyles.reviewChipRow}>
                    {(draft.serviceSpecializationIds?.length ||
                      draft.navigatorStageIds?.length) ? (
                      <>
                        {(draft.serviceSpecializationIds ?? []).map((id) => (
                          <span key={`s-${id}`} className={stepStyles.reviewChip}>
                            Услуга: {specialistIdListDisplay([id])}
                          </span>
                        ))}
                        {(draft.navigatorStageIds ?? []).map((id) => (
                          <span key={`st-${id}`} className={stepStyles.reviewChip}>
                            Этап: {specialistIdListDisplay([id])}
                          </span>
                        ))}
                      </>
                    ) : (
                      <span className={styles.intro}>Можно добавить позже</span>
                    )}
                  </div>
                </div>
                <p className={stepStyles.reviewFootnote}>
                  Профиль и карточка в каталоге независимы. Сохранение не публикует вас для клиентов.
                </p>
              </div>
            ) : null}
            <div
              className={
                step === 2 ? stepStyles.contactsStepActions : stepStyles.stepActions
              }
              data-testid={
                step === 2 ? "specialist-contacts-actions" : "specialist-step-actions"
              }
            >
              <div
                className={
                  step === 2 ? stepStyles.contactsActionsLeft : stepStyles.stepActionsLeft
                }
              >
                {step > 0 ? (
                  <button
                    type="button"
                    className={styles.btn}
                    disabled={saving}
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                  >
                    Назад
                  </button>
                ) : null}
                {step !== 2 ? (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnQuiet}`}
                    disabled={saving}
                    onClick={() => void resetDraft()}
                  >
                    Сбросить черновик
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
                    disabled={saving}
                    onClick={() => void skipStep()}
                  >
                    Пропустить
                  </button>
                )}
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDraft}`}
                  disabled={saving}
                  onClick={() => void saveDraftOnly()}
                >
                  {saving ? "Сохранение…" : "Сохранить черновик"}
                </button>
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnPrimary} ${step !== 2 ? stepStyles.stepPrimaryBtn : ""}`}
                  disabled={saving}
                >
                  {step === 3 ? (
                    "Сохранить профиль"
                  ) : (
                    <>
                      Продолжить <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
