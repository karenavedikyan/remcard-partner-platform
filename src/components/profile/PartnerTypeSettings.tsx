"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { ProProfileResponse } from "@/lib/types";
import {
  PARTNER_KIND_UI_LABELS,
  resolvePartnerKindUi,
  type PartnerKindUi,
  type PartnerTypeSwitchStateResponse,
} from "@/lib/partner-kind-ui";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import dialogStyles from "@/components/account-session/account-session.module.css";
import styles from "./PartnerTypeSettings.module.css";

type Step = "closed" | "unsaved" | "choose" | "review";

type PartnerTypeSettingsProps = {
  profile: ProProfileResponse;
  hasUnsavedBasicsChanges: boolean;
  onProfileUpdated: (next: ProProfileResponse) => void;
  onRequestRefresh: () => void;
};

export function PartnerTypeSettings({
  profile,
  hasUnsavedBasicsChanges,
  onProfileUpdated,
  onRequestRefresh,
}: PartnerTypeSettingsProps) {
  const titleId = useId();
  const [step, setStep] = useState<Step>("closed");
  const [state, setState] = useState<PartnerTypeSwitchStateResponse | null>(null);
  const [selected, setSelected] = useState<PartnerKindUi | null>(null);
  const [ack, setAck] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [recoveryNotice, setRecoveryNotice] = useState("");
  const [success, setSuccess] = useState("");

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

  const currentKind = state?.currentKind ?? null;
  const profileKind = resolvePartnerKindUi({
    partnerType: profile.user.partnerType,
    partnerActivities: profile.user.partnerActivities,
  });
  const currentLabel =
    (currentKind && PARTNER_KIND_UI_LABELS[currentKind]) ||
    (profileKind && PARTNER_KIND_UI_LABELS[profileKind]) ||
    "Партнёр";

  function closeDialog() {
    setStep("closed");
    setAck(false);
    setError("");
  }

  function openFlow() {
    setSuccess("");
    setRecoveryNotice("");
    if (hasUnsavedBasicsChanges) {
      setStep("unsaved");
      return;
    }
    void loadState().then((data) => {
      setSelected(data.currentKind);
      setStep("choose");
    });
  }

  async function goReview() {
    if (!selected || !currentKind || selected === currentKind) return;
    setError("");
    await loadState(selected);
    setAck(false);
    setStep("review");
  }

  async function applySwitch() {
    if (!selected || !currentKind || !ack || pending) return;
    setPending(true);
    setError("");
    try {
      await remcardFetch("/api/pro/partner-type/switch", {
        method: "POST",
        body: {
          targetKind: selected,
          expectedSourceKind: currentKind,
        },
      });
    } catch (caught) {
      setError(
        caught instanceof RemcardApiError
          ? caught.message
          : "Не удалось сменить тип. Попробуйте ещё раз.",
      );
      setPending(false);
      return;
    }

    try {
      const nextProfile = await remcardFetch<ProProfileResponse>("/api/pro/profile");
      onProfileUpdated(nextProfile);
    } catch {
      setRecoveryNotice(
        "Тип партнёрства уже изменён на сервере, но полный профиль не загрузился. Обновите страницу — повторная смена не нужна.",
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
    setSuccess(
      `Тип изменён на «${PARTNER_KIND_UI_LABELS[selected]}». Аккаунт сохранён; проверьте профиль нового типа.`,
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
    previewTarget && PARTNER_KIND_UI_LABELS[previewTarget]
      ? PARTNER_KIND_UI_LABELS[previewTarget]
      : "";

  return (
    <>
      <section
        className={`${styles.settings} panel`}
        aria-labelledby="partner-type-title"
        data-testid="partner-type-settings"
      >
        <div>
          <h2 id="partner-type-title">Тип партнёрства</h2>
          <p className={styles.current} data-testid="partner-type-current">
            {currentLabel}
          </p>
          <p>Выбрали другой путь? Измените тип в этом аккаунте, без повторной регистрации.</p>
          {success ? (
            <p className={styles.success} role="status" data-testid="partner-type-success">
              {success}
            </p>
          ) : null}
          {recoveryNotice ? (
            <p
              className={styles.error}
              role="alert"
              data-testid="partner-type-recovery"
            >
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
        <Button type="button" className={styles.openBtn} data-testid="partner-type-open" onClick={openFlow}>
          Сменить тип партнёрства
        </Button>
      </section>

      {step !== "closed" ? (
        <div
          className={dialogStyles.dialogBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && step !== "review") closeDialog();
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
                  : "partner-type-review"
            }
          >
            <h2 className={dialogStyles.dialogTitle} id={titleId}>
              {step === "unsaved"
                ? "Сначала сохраните изменения"
                : step === "choose"
                  ? "Сменить тип партнёрства"
                  : "Подтвердите смену типа"}
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
                    «Сотрудник» подключается по приглашению организации. Эта настройка не выдаёт
                    административные права.
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
                        data-partner-type-action="review"
                        disabled={!selected || selected === currentKind}
                        onClick={() => void goReview()}
                      >
                        Продолжить
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}

              {step === "review" && previewTarget && currentKind ? (
                <>
                  <p className={styles.transition}>
                    {PARTNER_KIND_UI_LABELS[currentKind]}{" "}
                    <span aria-hidden="true">→</span> {targetLabel}
                  </p>
                  <section>
                    <h3>Что изменится</h3>
                    <p>{preview?.changes ?? ""}</p>
                  </section>
                  <section>
                    <h3>Что сохраняется</h3>
                    <p>
                      {preview?.preservedSummary ??
                        `Тот же аккаунт: ${state?.publicId ?? profile.user.publicId}. Личные контакты, клиенты, сертификаты и история не удаляются.`}
                    </p>
                  </section>
                  <p className={styles.optionDesc}>
                    Публикация в каталоге, реквизиты и доступы сотрудников автоматически не
                    меняются. Дополнительные данные нового типа можно заполнить в профиле.
                  </p>
                  <div className={styles.footer}>
                    <label className={styles.ack}>
                      <input
                        type="checkbox"
                        data-partner-type-ack
                        checked={ack}
                        onChange={(event) => setAck(event.target.checked)}
                      />
                      <span>Понимаю, что состав разделов и доступных действий изменится.</span>
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
                        {pending ? "Смена…" : `Сменить на «${targetLabel}»`}
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
