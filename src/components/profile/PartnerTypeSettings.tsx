"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { ProProfileResponse } from "@/lib/types";
import {
  PARTNER_KIND_UI_LABELS,
  resolvePartnerKindUi,
  type PartnerKindUi,
  type PartnerTypeSetupPrefill,
  type PartnerTypeSwitchStateResponse,
} from "@/lib/partner-kind-ui";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import dialogStyles from "@/components/account-session/account-session.module.css";
import {
  PartnerTypeSetupFields,
  type PartnerTypeSetupFormValue,
} from "./PartnerTypeSetupFields";
import styles from "./PartnerTypeSettings.module.css";

type Step = "closed" | "unsaved" | "choose" | "setup";

type PartnerTypeSettingsProps = {
  profile: ProProfileResponse;
  hasUnsavedBasicsChanges: boolean;
  onProfileUpdated: (next: ProProfileResponse) => void;
  onRequestRefresh: () => void;
  autoOpenSetupRecovery?: boolean;
};

function emptySetup(): PartnerTypeSetupFormValue {
  return {
    publicName: "",
    city: "",
    serviceSpecializationIds: [],
    productCategoryIds: [],
    organizationName: "",
  };
}

function fromPrefill(prefill?: PartnerTypeSetupPrefill | null): PartnerTypeSetupFormValue {
  if (!prefill) return emptySetup();
  return {
    publicName: prefill.publicName ?? "",
    city: prefill.city ?? "",
    serviceSpecializationIds: [...(prefill.serviceSpecializationIds ?? [])],
    productCategoryIds: [...(prefill.productCategoryIds ?? [])],
    organizationName: prefill.organizationName ?? "",
  };
}

export function PartnerTypeSettings({
  profile,
  hasUnsavedBasicsChanges,
  onProfileUpdated,
  onRequestRefresh,
  autoOpenSetupRecovery = false,
}: PartnerTypeSettingsProps) {
  const titleId = useId();
  const [step, setStep] = useState<Step>("closed");
  const [state, setState] = useState<PartnerTypeSwitchStateResponse | null>(null);
  const [selected, setSelected] = useState<PartnerKindUi | null>(null);
  const [ack, setAck] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [recoveryNotice, setRecoveryNotice] = useState("");
  const [success, setSuccess] = useState("");
  const [setupForm, setSetupForm] = useState<PartnerTypeSetupFormValue>(emptySetup);
  const autoRecoveryOpened = useRef(false);

  const loadState = useCallback(async (previewTarget?: PartnerKindUi) => {
    const qs = previewTarget ? `?target=${encodeURIComponent(previewTarget)}` : "";
    const data = await remcardFetch<PartnerTypeSwitchStateResponse>(
      `/api/pro/partner-type/switch${qs}`,
    );
    setState(data);
    if (data.currentKind && !previewTarget) setSelected(data.currentKind);
    return data;
  }, []);

  useEffect(() => {
    void loadState().catch(() => {
      /* optional block hidden on error */
    });
  }, [loadState, profile.user.id, profile.user.partnerType, profile.user.partnerActivities]);

  useEffect(() => {
    if (!autoOpenSetupRecovery || autoRecoveryOpened.current) return;
    if (!state?.setupRecovery?.needed) return;
    autoRecoveryOpened.current = true;
    openRecovery();
  }, [autoOpenSetupRecovery, state?.setupRecovery?.needed]);

  const currentKind = state?.currentKind ?? null;
  const profileKind = resolvePartnerKindUi({
    partnerType: profile.user.partnerType,
    partnerActivities: profile.user.partnerActivities,
  });
  const currentLabel =
    (currentKind && PARTNER_KIND_UI_LABELS[currentKind]) ||
    (profileKind && PARTNER_KIND_UI_LABELS[profileKind]) ||
    "Партнёр";

  const setupBundle = useMemo(() => {
    if (!selected) return null;
    if (selected === currentKind) return state?.setupRecovery ?? null;
    return state?.setupForTarget ?? null;
  }, [selected, currentKind, state?.setupRecovery, state?.setupForTarget]);

  function closeDialog() {
    setStep("closed");
    setAck(false);
    setError("");
    setFieldErrors({});
  }

  function openFlow(target?: PartnerKindUi) {
    setSuccess("");
    setRecoveryNotice("");
    if (hasUnsavedBasicsChanges) {
      setStep("unsaved");
      return;
    }
    void loadState(target).then((data) => {
      const kind = target ?? data.currentKind;
      setSelected(kind);
      const bundle =
        kind === data.currentKind ? data.setupRecovery : data.setupForTarget;
      setSetupForm(fromPrefill(bundle?.prefill));
      setAck(false);
      setStep(target && kind === data.currentKind ? "setup" : "choose");
      if (target && kind === data.currentKind) {
        setSelected(kind);
      }
    });
  }

  function openRecovery() {
    if (!state?.setupRecovery?.needed || !currentKind) return;
    openFlow(currentKind);
    setStep("setup");
  }

  async function goSetup() {
    if (!selected || !currentKind) return;
    setError("");
    setFieldErrors({});
    const sameKind = selected === currentKind;
    const data = await loadState(sameKind ? undefined : selected);
    const bundle = sameKind ? data.setupRecovery : data.setupForTarget;
    setSetupForm(fromPrefill(bundle?.prefill));
    setAck(false);
    setStep("setup");
  }

  function buildSetupPayload(): Record<string, unknown> {
    return {
      publicName: setupForm.publicName.trim(),
      city: setupForm.city.trim(),
      serviceSpecializationIds: setupForm.serviceSpecializationIds,
      productCategoryIds: setupForm.productCategoryIds,
      organizationName: setupForm.organizationName.trim() || undefined,
    };
  }

  async function applySwitch() {
    if (!selected || !currentKind || !ack || pending) return;
    setPending(true);
    setError("");
    setFieldErrors({});
    try {
      await remcardFetch("/api/pro/partner-type/switch", {
        method: "POST",
        body: {
          targetKind: selected,
          expectedSourceKind: currentKind,
          setup: buildSetupPayload(),
        },
      });
    } catch (caught) {
      if (caught instanceof RemcardApiError) {
        setError(caught.message);
        const fe =
          caught.body &&
          typeof caught.body === "object" &&
          "fieldErrors" in caught.body &&
          caught.body.fieldErrors &&
          typeof caught.body.fieldErrors === "object"
            ? (caught.body.fieldErrors as Record<string, string>)
            : undefined;
        if (fe) setFieldErrors(fe);
      } else {
        setError("Не удалось сохранить. Попробуйте ещё раз.");
      }
      setPending(false);
      return;
    }

    try {
      const nextProfile = await remcardFetch<ProProfileResponse>("/api/pro/profile");
      onProfileUpdated(nextProfile);
    } catch {
      setRecoveryNotice(
        "Данные сохранены на сервере, но полный профиль не загрузился. Обновите страницу.",
      );
      onRequestRefresh();
      await loadState().catch(() => {});
      setPending(false);
      setStep("closed");
      setAck(false);
      setError("");
      return;
    }

    onRequestRefresh();
    await loadState();
    const label = PARTNER_KIND_UI_LABELS[selected];
    setSuccess(
      selected === currentKind
        ? `Данные профиля «${label}» сохранены.`
        : `Тип изменён на «${label}». Данные профиля сохранены.`,
    );
    closeDialog();
    setPending(false);
  }

  if (state?.isEmployee) {
    return (
      <Panel compact className={styles.settings} data-testid="partner-type-settings">
        <div>
          <h2 id="partner-type-title">Тип партнёрства</h2>
          <p className={styles.current}>Сотрудник</p>
          <p>
            Рабочий доступ выдаёт организация по приглашению. Сменить его на доступ владельца или
            управляющего самостоятельно нельзя.
          </p>
        </div>
      </Panel>
    );
  }

  if (!currentKind && !state) return null;

  const previewTarget = selected && selected !== currentKind ? selected : null;
  const preview = state?.preview;
  const targetLabel =
    (selected && PARTNER_KIND_UI_LABELS[selected]) ||
    (previewTarget && PARTNER_KIND_UI_LABELS[previewTarget]) ||
    "";

  return (
    <>
      <section
        className={`${styles.settings} panel`}
        aria-labelledby="partner-type-title"
        data-testid="partner-type-settings"
        data-profile-focus="partnerType"
      >
        <div>
          <h2 id="partner-type-title">Тип партнёрства</h2>
          <p className={styles.current} data-testid="partner-type-current">
            {currentLabel}
          </p>
          <p>Выбрали другой путь? Измените тип в этом аккаунте, без повторной регистрации.</p>
          {state?.setupRecovery?.needed ? (
            <div className={styles.recoveryBanner} data-testid="partner-type-setup-recovery">
              <p>Для текущего типа не хватает данных — часть действий недоступна.</p>
              <Button
                type="button"
                variant="secondary"
                data-testid="partner-type-setup-recovery-open"
                onClick={openRecovery}
              >
                Проверьте данные профиля
              </Button>
            </div>
          ) : null}
          {success ? (
            <p className={styles.success} role="status" data-testid="partner-type-success">
              {success}
            </p>
          ) : null}
          {recoveryNotice ? (
            <p className={styles.error} role="alert" data-testid="partner-type-recovery">
              {recoveryNotice}{" "}
              <Button
                type="button"
                variant="secondary"
                data-testid="partner-type-recovery-reload"
                onClick={() => {
                  onRequestRefresh();
                  void loadState().catch(() => {});
                }}
              >
                Обновить данные
              </Button>
            </p>
          ) : null}
        </div>
        <Button type="button" className={styles.openBtn} data-testid="partner-type-open" onClick={() => openFlow()}>
          Сменить тип партнёрства
        </Button>
      </section>

      {step !== "closed" ? (
        <div
          className={dialogStyles.dialogBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && step !== "setup") closeDialog();
          }}
        >
          <div
            className={dialogStyles.dialogPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-testid={
              step === "unsaved"
                ? "partner-type-unsaved"
                : step === "choose"
                  ? "partner-type-choose"
                  : "partner-type-setup"
            }
          >
            <h2 className={dialogStyles.dialogTitle} id={titleId}>
              {step === "unsaved"
                ? "Сначала сохраните изменения"
                : step === "choose"
                  ? "Сменить тип партнёрства"
                  : "Проверьте данные нового профиля"}
            </h2>
            <div className={`${dialogStyles.dialogBody} ${styles.dialogBody}`}>
              {step === "unsaved" ? (
                <>
                  <p>
                    В профиле есть несохранённые изменения. Сохраните или отмените их, затем
                    вернитесь к смене типа партнёрства.
                  </p>
                  <div className={styles.actions}>
                    <Button type="button" variant="primary" onClick={closeDialog}>
                      Вернуться в профиль
                    </Button>
                  </div>
                </>
              ) : null}

              {step === "choose" && state ? (
                <>
                  <p>Выберите, как хотите работать в RemCard. Аккаунт останется тем же.</p>
                  <fieldset className={styles.options}>
                    <legend className="sr-only">Новый тип партнёрства</legend>
                    {state.options.map((opt) => (
                      <label key={opt.kind} className={styles.option}>
                        <input
                          type="radio"
                          name="partner-type"
                          value={opt.kind}
                          checked={selected === opt.kind}
                          onChange={() => setSelected(opt.kind)}
                        />
                        <span>
                          <strong>
                            {opt.label}
                            {opt.isCurrent ? (
                              <small className={styles.tag}>Сейчас</small>
                            ) : null}
                          </strong>
                          <span className={styles.optionDesc}>{opt.description}</span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <p className={styles.optionDesc}>
                    «Сотрудник» подключается по приглашению. Принятие приглашения не меняет ваш
                    тип партнёрства.
                  </p>
                  {error ? (
                    <p className={styles.error} role="alert">
                      {error}
                    </p>
                  ) : null}
                  <div className={styles.footer}>
                    <div className={styles.actions}>
                      <Button type="button" variant="secondary" onClick={closeDialog}>
                        Отмена
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        data-partner-type-action="setup"
                        disabled={!selected}
                        onClick={() => void goSetup()}
                      >
                        Продолжить
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}

              {step === "setup" && selected && currentKind ? (
                <>
                  {selected !== currentKind ? (
                    <p className={styles.transition}>
                      {PARTNER_KIND_UI_LABELS[currentKind]}{" "}
                      <span aria-hidden="true">→</span> {targetLabel}
                    </p>
                  ) : (
                    <p className={styles.transition}>Текущий тип: {targetLabel}</p>
                  )}
                  {preview ? (
                    <section>
                      <h3>Что изменится</h3>
                      <p>{preview.changes}</p>
                    </section>
                  ) : null}
                  <PartnerTypeSetupFields
                    targetKind={selected}
                    value={setupForm}
                    fieldErrors={fieldErrors}
                    onChange={setSetupForm}
                  />
                  <p className={styles.optionDesc}>
                    Каталог, реквизиты и права сотрудников не меняются автоматически — только
                    подтверждённые поля.
                  </p>
                  <div className={styles.footer}>
                    <label className={styles.ack}>
                      <input
                        type="checkbox"
                        data-partner-type-ack
                        checked={ack}
                        onChange={(event) => setAck(event.target.checked)}
                      />
                      <span>
                        {selected === currentKind
                          ? "Подтверждаю сохранение данных профиля."
                          : "Понимаю, что состав разделов изменится, и подтверждаю данные профиля."}
                      </span>
                    </label>
                    <div className={styles.actions}>
                      <Button
                        type="button"
                        variant="secondary"
                        data-partner-type-action="choose"
                        onClick={() => {
                          setAck(false);
                          setStep("choose");
                        }}
                      >
                        Назад
                      </Button>
                      <Button type="button" variant="secondary" onClick={closeDialog}>
                        Отмена
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        data-partner-type-action="apply"
                        data-testid="partner-type-apply"
                        disabled={!ack || pending}
                        onClick={() => void applySwitch()}
                      >
                        {pending
                          ? "Сохранение…"
                          : selected === currentKind
                            ? "Сохранить данные"
                            : `Сменить на «${targetLabel}»`}
                      </Button>
                    </div>
                  </div>
                  {error ? (
                    <p className={styles.error} role="alert">
                      {error}
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
