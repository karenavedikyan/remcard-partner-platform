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
import { SPECIALIST_PRESETS, applySpecialistPreset } from "@/lib/specialist-r06/presets";
import {
  specialistIdListDisplay,
  specialistKindDisplayLabel,
} from "@/lib/specialist-r06/display-labels";
import { ProfileDirectionsPicker } from "@/components/profile/ProfileDirectionsPicker";
import { AgentPhoneField, type AgentPhoneFieldHandle } from "@/components/profile/agent/AgentPhoneField";
import type { ProProfileResponse } from "@/lib/types";
import styles from "../agent/AgentProfileWizard.module.css";

const STEPS = ["О себе", "Специализация", "Связь и работа", "Проверка"] as const;

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
            <p>
              Публикация добровольна. Публичную карточку можно подготовить отдельно — это не
              меняет рабочий профиль.
            </p>
          </div>
          <Link href="/profile?section=catalog" className={styles.btn}>
            Перейти к каталогу
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.pw} data-testid="specialist-profile-wizard">
      <div className={styles.layout}>
        <aside className={styles.journey} aria-label="Этапы профиля">
          <span className={styles.kicker}>Специалист</span>
          <h2 className={styles.title}>Рабочий профиль</h2>
          <p className={styles.intro}>
            Заполните профиль для работы с партнёрами. Это не публикует вас в каталоге RemCard.
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
        <section className={styles.card}>
          <span className={styles.kicker}>
            Шаг {step + 1} из {STEPS.length}
          </span>
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
          <h2 className={styles.title}>{STEPS[step]}</h2>
          <form onSubmit={(ev) => void onSubmitStep(ev)}>
            {step === 0 ? (
              <div className={styles.fields}>
                <div className={styles.field}>
                  <label htmlFor="sp-displayName">Как к вам обращаться?</label>
                  <input
                    id="sp-displayName"
                    value={draft.displayName ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="sp-city">Город</label>
                  <input
                    id="sp-city"
                    value={draft.city ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                  />
                </div>
              </div>
            ) : null}
            {step === 1 ? (
              <div className={styles.fields}>
                <div className={styles.field}>
                  <label htmlFor="sp-kind">Кто вы как специалист?</label>
                  <select
                    id="sp-kind"
                    value={draft.specialistKind ?? ""}
                    onChange={(e) => {
                      const kind = e.target.value as SpecialistProfileDraftPayload["specialistKind"];
                      const next = { ...draft, specialistKind: kind, productCategoryIds: [] };
                      if (kind) applySpecialistPreset(next, kind, false);
                      setDraft(next);
                    }}
                  >
                    <option value="">Выберите роль или заполните вручную</option>
                    {SPECIALIST_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                {draft.specialistKind === "other" ? (
                  <div className={styles.field}>
                    <label htmlFor="sp-title">Ваша специализация</label>
                    <input
                      id="sp-title"
                      value={draft.specialistTitle ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, specialistTitle: e.target.value }))}
                    />
                  </div>
                ) : null}
                <ProfileDirectionsPicker
                  specialistMode
                  compactSpecialistGrid={false}
                  tileLayout
                  collapseAdvancedDirections
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
                <button
                  type="button"
                  className={styles.btn}
                  disabled={!draft.specialistKind || draft.specialistKind === "other"}
                  onClick={() => {
                    const next = { ...draft, productCategoryIds: [] };
                    if (draft.specialistKind) applySpecialistPreset(next, draft.specialistKind, true);
                    setDraft(next);
                  }}
                >
                  Добавить этот набор к выбранному
                </button>
              </div>
            ) : null}
            {step === 2 ? (
              <div className={styles.fields}>
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
                <AgentPhoneField
                  ref={phoneRef}
                  value={draft.partnershipContactPhone ?? ""}
                  onChange={(v) => setDraft((d) => ({ ...d, partnershipContactPhone: v }))}
                />
                <div className={styles.field}>
                  <label htmlFor="sp-email">Email</label>
                  <input
                    id="sp-email"
                    value={draft.partnershipContactEmail ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, partnershipContactEmail: e.target.value }))
                    }
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="sp-site">Сайт (необязательно)</label>
                  <input
                    id="sp-site"
                    value={draft.publicSite ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, publicSite: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="sp-tg">Telegram (необязательно)</label>
                  <input
                    id="sp-tg"
                    value={draft.publicTelegram ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, publicTelegram: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="sp-areas">Территория работы</label>
                  <textarea
                    id="sp-areas"
                    value={draft.areas ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, areas: e.target.value }))}
                  />
                </div>
              </div>
            ) : null}
            {step === 3 ? (
              <ul className={styles.reviewList}>
                <li>
                  <strong>Имя:</strong> {draft.displayName}
                </li>
                <li>
                  <strong>Город:</strong> {draft.city}
                </li>
                <li>
                  <strong>Специализация:</strong>{" "}
                  {specialistKindDisplayLabel(draft.specialistKind, draft.specialistTitle)}
                </li>
                <li>
                  <strong>Услуги:</strong> {specialistIdListDisplay(draft.serviceSpecializationIds)}
                </li>
                <li>
                  <strong>Этапы:</strong> {specialistIdListDisplay(draft.navigatorStageIds)}
                </li>
              </ul>
            ) : null}
            <div className={styles.actionsRight}>
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
              {(step === 1 || step === 2) && (
                <button type="button" className={styles.btn} disabled={saving} onClick={() => void skipStep()}>
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
                type="button"
                className={styles.btn}
                disabled={saving}
                onClick={() => void resetDraft()}
              >
                Сбросить черновик
              </button>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
                {step === 3 ? "Завершить профиль" : "Далее"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
