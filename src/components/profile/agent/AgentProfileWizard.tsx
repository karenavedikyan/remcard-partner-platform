"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import {
  discardAgentProfileDraft,
  fetchAgentProfileDraft,
  finishAgentProfile,
  patchAgentProfileDraft,
} from "@/lib/agent-profile/api";
import type { AgentProfileDraftPayload } from "@/lib/agent-profile/types";
import { formatPhoneForDisplay, formatPhoneInput } from "@/lib/contact-phone-display";
import styles from "./AgentProfileWizard.module.css";

const STEPS = ["О себе", "Аудитория", "Контакты", "Проверка"] as const;

type FieldErrors = Partial<Record<keyof AgentProfileDraftPayload, string>>;

function validateRequiredIdentity(draft: AgentProfileDraftPayload): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.displayName?.trim()) errors.displayName = "Укажите имя";
  if (!draft.city?.trim()) errors.city = "Укажите город";
  return errors;
}

function draftsEqual(a: AgentProfileDraftPayload, b: AgentProfileDraftPayload): boolean {
  const keys: (keyof AgentProfileDraftPayload)[] = [
    "displayName",
    "city",
    "audience",
    "channel",
    "contactPhone",
    "contactEmail",
  ];
  return keys.every((k) => (a[k] ?? "").trim() === (b[k] ?? "").trim());
}

function reviewFacts(draft: AgentProfileDraftPayload) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Имя", value: draft.displayName?.trim() || "Не указано" },
    { label: "Город", value: draft.city?.trim() || "Не указано" },
    {
      label: "Телефон",
      value: formatPhoneForDisplay(draft.contactPhone) || "Не указано",
    },
    { label: "Email", value: draft.contactEmail?.trim() || "Не указано" },
  ];
  if (draft.audience?.trim()) {
    rows.push({ label: "Аудитория", value: draft.audience.trim() });
  }
  if (draft.channel?.trim()) {
    rows.push({ label: "Канал", value: draft.channel.trim() });
  }
  return rows;
}

type AgentProfileWizardProps = {
  userId: string;
  disabled?: boolean;
  onProfileComplete?: () => void;
  /** Open editor on saved profile (basics tab) without nested profile/requisites switch. */
  startInEditMode?: boolean;
  /** Pure-agent basics tab: return to overview after cancel. */
  onExitEditMode?: () => void;
};

export function AgentProfileWizard({
  userId,
  disabled,
  onProfileComplete,
  startInEditMode = false,
  onExitEditMode,
}: AgentProfileWizardProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState(0);
  const [version, setVersion] = useState(0);
  const [draftEpoch, setDraftEpoch] = useState(0);
  const [savedProfile, setSavedProfile] = useState<AgentProfileDraftPayload>({});
  const [hasDraft, setHasDraft] = useState(false);
  const [draft, setDraft] = useState<AgentProfileDraftPayload>({});
  const [editing, setEditing] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const forceViewSummaryRef = useRef(false);
  const [conflict, setConflict] = useState<{ serverVersion: number; serverEpoch: number } | null>(
    null,
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const hydrateGen = useRef(0);
  const dirtyGen = useRef(0);
  const versionRef = useRef(0);
  const draftEpochRef = useRef(0);
  const editBaselineRef = useRef<AgentProfileDraftPayload>({});

  const syncVersion = (nextVersion: number, nextEpoch: number) => {
    versionRef.current = nextVersion;
    draftEpochRef.current = nextEpoch;
    setVersion(nextVersion);
    setDraftEpoch(nextEpoch);
  };

  const hydrate = useCallback(async () => {
    const gen = ++hydrateGen.current;
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchAgentProfileDraft();
      if (gen !== hydrateGen.current) return;
      setDraft(data.payload ?? {});
      setSavedProfile(data.savedProfile ?? data.payload ?? {});
      setHasDraft(Boolean(data.hasDraft));
      setStep(Math.max(0, Math.min(3, (data.step ?? 1) - 1)));
      syncVersion(data.version ?? 0, data.draftEpoch ?? 0);
      const saved =
        typeof data.profileSaved === "boolean"
          ? data.profileSaved
          : Boolean(data.profileComplete);
      setProfileSaved(saved);
      setProfileComplete(Boolean(data.profileComplete));
      if (forceViewSummaryRef.current) {
        forceViewSummaryRef.current = false;
        setEditing(false);
      } else {
        setEditing(startInEditMode || Boolean(data.hasDraft) || !saved);
      }
      setConflict(null);
    } catch (caught) {
      if (gen !== hydrateGen.current) return;
      setLoadError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить профиль",
      );
    } finally {
      if (gen === hydrateGen.current) setLoading(false);
    }
  }, [startInEditMode]);

  useEffect(() => {
    void hydrate();
  }, [hydrate, userId]);

  const persistDraft = useCallback(
    (
      nextDraft: AgentProfileDraftPayload,
      uiStep: number,
      expectedVersion: number,
      expectedEpoch: number,
      opts: { mode: "save" | "advance"; nextUiStep?: number; releaseBusy?: boolean },
    ) => {
      const run = saveQueue.current.then(async () => {
        setSaving(true);
        const writeGen = dirtyGen.current;
        const releaseBusy = opts.releaseBusy !== false;
        try {
          const res = await patchAgentProfileDraft({
            expectedVersion,
            expectedEpoch,
            step: (opts.nextUiStep ?? uiStep) + 1,
            fromStep: uiStep + 1,
            mode: opts.mode,
            payload: nextDraft as Record<string, string>,
          });
          if (writeGen !== dirtyGen.current) return null;
          setDraft(res.payload ?? nextDraft);
          syncVersion(res.version, typeof res.draftEpoch === "number" ? res.draftEpoch : draftEpochRef.current);
          setHasDraft(true);
          setFieldErrors({});
          setConflict(null);
          return { version: res.version, epoch: res.draftEpoch ?? expectedEpoch };
        } catch (caught) {
          if (caught instanceof RemcardApiError && caught.status === 409) {
            try {
              const latest = await fetchAgentProfileDraft();
              setConflict({
                serverVersion: latest.version ?? expectedVersion,
                serverEpoch: latest.draftEpoch ?? expectedEpoch,
              });
            } catch {
              setConflict({ serverVersion: expectedVersion, serverEpoch: expectedEpoch });
            }
            setBanner({
              kind: "error",
              text: "Черновик на сервере изменился. Сохраните локальные правки или загрузите серверную версию.",
            });
          } else if (caught instanceof RemcardApiError && caught.body?.fields) {
            setFieldErrors(caught.body.fields as FieldErrors);
          } else {
            setBanner({
              kind: "error",
              text: caught instanceof RemcardApiError ? caught.message : "Ошибка сохранения",
            });
          }
          throw caught;
        } finally {
          if (releaseBusy) setSaving(false);
        }
      });
      saveQueue.current = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
    [],
  );

  const rebaseOntoServer = async () => {
    const latest = await fetchAgentProfileDraft();
    syncVersion(latest.version ?? 0, latest.draftEpoch ?? 0);
    setConflict(null);
    setBanner(null);
  };

  const updateField = (key: keyof AgentProfileDraftPayload, value: string) => {
    dirtyGen.current += 1;
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const goToStep = async (target: number) => {
    if (target === step || disabled || saving) return;
    if (target < step) {
      setStep(target);
      return;
    }
    if (target !== step + 1) return;
    if (step === 0) {
      const localErrors = validateRequiredIdentity(draft);
      if (Object.keys(localErrors).length) {
        setFieldErrors(localErrors);
        return;
      }
    }
    try {
      await persistDraft(draft, step, versionRef.current, draftEpochRef.current, {
        mode: "advance",
        nextUiStep: target,
      });
      setStep(target);
    } catch {
      /* errors shown */
    }
  };

  const cancelEditing = async () => {
    if (disabled || saving) return;
    const dirty = !draftsEqual(draft, editBaselineRef.current);
    if (dirty && !window.confirm("Отменить изменения? Несохранённые правки будут потеряны.")) {
      return;
    }
    if (hasDraft) {
      try {
        await discardAgentProfileDraft({
          expectedEpoch: draftEpochRef.current,
          expectedVersion: versionRef.current,
        });
      } catch (caught) {
        setBanner({
          kind: "error",
          text:
            caught instanceof RemcardApiError
              ? caught.message
              : "Не удалось сбросить черновик",
        });
        return;
      }
    } else {
      setDraft({ ...savedProfile });
      setHasDraft(false);
    }
    forceViewSummaryRef.current = true;
    setEditing(false);
    setBanner(null);
    if (startInEditMode && onExitEditMode) {
      onExitEditMode();
      return;
    }
    await hydrate();
  };

  useEffect(() => {
    if (!editing) return;
    const dirty = !draftsEqual(draft, editBaselineRef.current);
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [draft, editing]);

  useEffect(() => {
    if (editing && profileSaved) {
      editBaselineRef.current = { ...savedProfile };
    }
  }, [editing, profileSaved, savedProfile]);

  const onSubmitStep = async (event: FormEvent) => {
    event.preventDefault();
    if (disabled || saving) return;
    const last = STEPS.length - 1;
    if (step < last) {
      if (step === 0) {
        const localErrors = validateRequiredIdentity(draft);
        if (Object.keys(localErrors).length) {
          setFieldErrors(localErrors);
          return;
        }
      }
      try {
        await persistDraft(draft, step, versionRef.current, draftEpochRef.current, {
          mode: "advance",
          nextUiStep: step + 1,
        });
        setStep((s) => Math.min(last, s + 1));
      } catch {
        /* errors shown */
      }
      return;
    }
    try {
      const saved = await persistDraft(draft, step, versionRef.current, draftEpochRef.current, {
        mode: "advance",
        nextUiStep: step,
        releaseBusy: false,
      });
      if (!saved) return;
      await finishAgentProfile({
        expectedVersion: saved.version,
        expectedEpoch: saved.epoch,
      });
      setProfileComplete(true);
      setProfileSaved(true);
      setHasDraft(false);
      setEditing(false);
      setBanner({ kind: "success", text: "Профиль сохранён." });
      onProfileComplete?.();
      await hydrate();
    } catch (caught) {
      if (caught instanceof RemcardApiError && caught.body?.fields) {
        setFieldErrors(caught.body.fields as FieldErrors);
      } else {
        setBanner({
          kind: "error",
          text:
            caught instanceof RemcardApiError
              ? caught.message
              : "Не удалось сохранить профиль. Проверьте подключение и попробуйте снова.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const saveDraftOnly = async () => {
    if (disabled || saving) return;
    try {
      await persistDraft(draft, step, versionRef.current, draftEpochRef.current, {
        mode: "save",
        nextUiStep: step,
      });
      setBanner({ kind: "success", text: "Черновик сохранён. Можно продолжить позже." });
    } catch {
      /* shown */
    }
  };

  const skipStep = async () => {
    if (step >= STEPS.length - 1) return;
    try {
      await persistDraft(draft, step, versionRef.current, draftEpochRef.current, {
        mode: "save",
        nextUiStep: step + 1,
      });
      setStep((s) => s + 1);
    } catch {
      /* shown */
    }
  };

  if (loading) {
    return <p className={styles.intro}>Загрузка профиля агента…</p>;
  }
  if (loadError) {
    return <p className={styles.bannerError}>{loadError}</p>;
  }

  if (!editing && profileSaved) {
    const display = savedProfile.displayName?.trim() ? savedProfile : draft;
    const name = display.displayName?.trim() || "—";
    return (
      <div className={styles.completedShell} data-testid="agent-profile-completed-summary">
        <section className={styles.summary}>
          <div className={styles.summaryHeader}>
            <div className={styles.avatar}>{name.slice(0, 2).toUpperCase()}</div>
            <div className={styles.summaryHeadMain}>
              <span className={styles.kicker} data-testid="agent-profile-role-kicker">
                Агент
              </span>
              <h2 className={styles.summaryTitle}>{name}</h2>
              <p className={styles.cityMuted}>
                {display.city?.trim() || "Город не указан"}
              </p>
              <span className={styles.summaryStatus}>Заполнено</span>
            </div>
          </div>
          {banner ? (
            <p className={banner.kind === "error" ? styles.bannerError : styles.bannerSuccess}>
              {banner.text}
            </p>
          ) : null}
          <dl className={styles.summaryFacts}>
            {reviewFacts(display).map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className={styles.summaryActions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={disabled || saving}
              onClick={() => {
                editBaselineRef.current = { ...savedProfile };
                setEditing(true);
                setStep(0);
                setBanner(null);
              }}
            >
              Редактировать профиль
            </button>
            <span className={styles.summaryId}>ID {userId}</span>
          </div>
        </section>
      </div>
    );
  }

  const titles = [
    "Познакомимся",
    "Кому вы рекомендуете?",
    "Как с вами связаться?",
    "Всё верно?",
  ];

  return (
    <div className={styles.pw} data-testid="agent-profile-wizard">
      <div className={styles.layout}>
        <aside className={styles.journey} aria-label="Шаги заполнения" data-testid="agent-profile-journey">
          <span className={styles.kicker} data-testid="agent-profile-role-kicker">
            Агент
          </span>
          <h2 className={styles.title}>Профиль без лишнего</h2>
          <p className={styles.intro}>
            Для начала достаточно имени и города. Канал или большая аудитория не обязательны.
          </p>
          <ol className={styles.steps} data-testid="agent-profile-steps">
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
                  data-testid={`agent-profile-step-${i}`}
                  disabled={disabled || saving || i > step}
                  onClick={() => void goToStep(i)}
                >
                  <span className={styles.stepNumber}>{i < step ? "✓" : i + 1}</span>
                  <span>{label}</span>
                  {i > 0 && i < STEPS.length - 1 ? <small>необязательно</small> : null}
                </button>
              </li>
            ))}
          </ol>
          <div className={styles.journeyNote}>
            <strong>Не нужно заполнять всё сразу</strong>
            <p>Дополнительные сведения можно пропустить и вернуться к ним позже.</p>
          </div>
        </aside>

        <section className={styles.card}>
          <div className={styles.cardTop}>
            <span className={styles.kicker} data-testid="agent-profile-progress">
              Шаг {step + 1} из {STEPS.length}
            </span>
            <span className={styles.label}>
              {step === 0
                ? "Обязательные данные"
                : step === STEPS.length - 1
                  ? "Перед сохранением"
                  : "Можно пропустить"}
            </span>
          </div>
          {banner ? (
            <p className={banner.kind === "error" ? styles.bannerError : styles.bannerSuccess}>
              {banner.text}
            </p>
          ) : null}
          {conflict ? (
            <div className={styles.bannerError} role="alert">
              <p>Конфликт версии (сервер v{conflict.serverVersion}).</p>
              <div className={styles.actionsRight}>
                <button
                  type="button"
                  className={styles.btn}
                  disabled={saving}
                  onClick={() => void hydrate()}
                >
                  Загрузить с сервера
                </button>
                <button
                  type="button"
                  className={styles.btn}
                  disabled={saving}
                  onClick={() => void rebaseOntoServer()}
                >
                  Оставить мои правки
                </button>
              </div>
            </div>
          ) : null}
          {profileSaved && hasDraft ? (
            <p className={styles.intro} role="status">
              Есть незавершённый черновик — продолжите редактирование или сохраните черновик.
            </p>
          ) : null}
          <h2 className={styles.title} id="agent-profile-step-title">
            {titles[step]}
          </h2>
          <form onSubmit={onSubmitStep} noValidate>
            {step === 0 ? (
              <>
                <div className={styles.fields}>
                  <div
                    className={`${styles.field} ${fieldErrors.displayName ? styles.fieldError : ""}`}
                  >
                    <label htmlFor="agent-displayName">
                      Ваше имя <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="agent-displayName"
                      name="displayName"
                      value={draft.displayName ?? ""}
                      placeholder="Например, Алексей Иванов"
                      disabled={disabled || saving}
                      aria-invalid={Boolean(fieldErrors.displayName)}
                      data-testid="agent-profile-input-displayName"
                      onChange={(e) => updateField("displayName", e.target.value)}
                    />
                    <small>{fieldErrors.displayName || "Так вас будут узнавать в RemCard."}</small>
                  </div>
                  <div className={`${styles.field} ${fieldErrors.city ? styles.fieldError : ""}`}>
                    <label htmlFor="agent-city">
                      Город <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="agent-city"
                      name="city"
                      value={draft.city ?? ""}
                      placeholder="Например, Краснодар"
                      disabled={disabled || saving}
                      data-testid="agent-profile-input-city"
                      onChange={(e) => updateField("city", e.target.value)}
                    />
                    <small>{fieldErrors.city || "Поможет подобрать партнёров рядом."}</small>
                  </div>
                </div>
                <p className={styles.footnote}>
                  Поля со звёздочкой обязательны для завершения профиля.
                </p>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <p className={styles.intro}>
                  Расскажите, кому вы рекомендуете. Если делитесь лично, канал не нужен.
                </p>
                <div className={styles.fields}>
                  <div className={styles.field}>
                    <label htmlFor="agent-audience">Кому вы рекомендуете?</label>
                    <input
                      id="agent-audience"
                      value={draft.audience ?? ""}
                      placeholder="Друзьям, клиентам, подписчикам"
                      disabled={disabled || saving}
                      onChange={(e) => updateField("audience", e.target.value)}
                    />
                    <small>Коротко, своими словами.</small>
                  </div>
                  <div
                    className={`${styles.field} ${fieldErrors.channel ? styles.fieldError : ""}`}
                  >
                    <label htmlFor="agent-channel">Ссылка на канал или страницу</label>
                    <input
                      id="agent-channel"
                      type="url"
                      value={draft.channel ?? ""}
                      placeholder="https://…"
                      disabled={disabled || saving}
                      onChange={(e) => updateField("channel", e.target.value)}
                    />
                    <small>{fieldErrors.channel || "Можно оставить пустым."}</small>
                  </div>
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <p className={styles.intro}>
                  Укажите удобный способ связи. Необязательные поля можно оставить пустыми.
                </p>
                <div className={`${styles.fields} ${styles.fieldsTwo}`}>
                  <div
                    className={`${styles.field} ${fieldErrors.contactPhone ? styles.fieldError : ""}`}
                  >
                    <label htmlFor="agent-phone">Телефон</label>
                    <input
                      id="agent-phone"
                      type="tel"
                      inputMode="tel"
                      value={formatPhoneForDisplay(draft.contactPhone) || draft.contactPhone || ""}
                      placeholder="+7 (___) ___-__-__"
                      disabled={disabled || saving}
                      data-testid="agent-profile-input-phone"
                      onChange={(e) => updateField("contactPhone", formatPhoneInput(e.target.value))}
                    />
                    <small>
                      {fieldErrors.contactPhone ||
                        "Можно начать с 8 или 7. Для связи, не для повторного входа."}
                    </small>
                  </div>
                  <div
                    className={`${styles.field} ${fieldErrors.contactEmail ? styles.fieldError : ""}`}
                  >
                    <label htmlFor="agent-email">Email</label>
                    <input
                      id="agent-email"
                      type="email"
                      value={draft.contactEmail ?? ""}
                      placeholder="name@example.ru"
                      disabled={disabled || saving}
                      onChange={(e) => updateField("contactEmail", e.target.value)}
                    />
                    <small>{fieldErrors.contactEmail || "Для письменных предложений."}</small>
                  </div>
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <dl className={styles.facts}>
                  {reviewFacts(draft).map((row) => (
                    <div key={row.label}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className={styles.footnote}>
                  Сохранение профиля не публикует вас для клиентов и не отправляет данные в каталог.
                </p>
              </>
            ) : null}

            <div className={styles.actions}>
              <div className={styles.actionsLeft}>
                {step > 0 ? (
                  <button
                    type="button"
                    className={styles.btn}
                    disabled={disabled || saving}
                    onClick={() => void goToStep(step - 1)}
                  >
                    Назад
                  </button>
                ) : null}
                {profileSaved && editing ? (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnQuiet}`}
                    disabled={disabled || saving}
                    data-testid="agent-profile-cancel-edit"
                    onClick={() => void cancelEditing()}
                  >
                    Отменить
                  </button>
                ) : null}
              </div>
              <div className={styles.actionsRight}>
                {step > 0 && step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnQuiet}`}
                    disabled={disabled || saving}
                    onClick={() => void skipStep()}
                  >
                    Пропустить
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnQuiet} ${styles.btnDraft}`}
                  disabled={disabled || saving}
                  data-testid="agent-profile-save-draft"
                  onClick={() => void saveDraftOnly()}
                >
                  Сохранить черновик
                </button>
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={disabled || saving}
                  data-testid="agent-profile-next"
                >
                  {step === STEPS.length - 1 ? "Сохранить профиль" : "Продолжить →"}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
