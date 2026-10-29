"use client";

/**
 * Free-name / link invite path (prototype «Пригласить по ссылке»).
 * Uses discussion-invite API — does not change staff invite forms.
 */
import { useEffect, useId, useReducer, useRef, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { getAppUrl } from "@/lib/config";
import { isAgentCooperationInviter } from "@/lib/partnership-agent-inviter";
import { profileUserToPartnerSide } from "@/lib/partnership-rules";
import {
  INVITE_MESSAGE_TEMPLATES,
  type InviteMessageTemplateId,
} from "@/lib/partners-prototype-v1/invite-message-templates";
import {
  INVITE_WIZARD_STEPS,
  applyInviteTemplate,
  createInviteWizardState,
  goInviteWizardStep,
  markInviteSubmitDone,
  markInviteSubmitFailed,
  markInviteSubmitPending,
  setInviteWizardMessage,
  setInviteWizardRecipient,
  type InviteWizardSnapshot,
  type InviteWizardStep,
} from "@/lib/partners-prototype-v1/invite-wizard-state";
import type { ProProfileResponse } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/FormField";
import styles from "./PartnerInviteWizard.module.css";

type Props = {
  meProfile: ProProfileResponse;
  onClose?: () => void;
  onCreated?: () => void;
  disableSubmit?: boolean;
};

type Action =
  | { type: "replace"; state: InviteWizardSnapshot }
  | { type: "patch"; state: InviteWizardSnapshot };

function reducer(_state: InviteWizardSnapshot, action: Action): InviteWizardSnapshot {
  return action.state;
}

export function PartnerLinkInviteWizard({
  meProfile,
  onClose,
  onCreated,
  disableSubmit = false,
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inviterSide = profileUserToPartnerSide(meProfile.user, meProfile.organization);
  const agentOneWay = isAgentCooperationInviter(inviterSide);
  const inviterName =
    meProfile.user.catalogDisplayName?.trim() ||
    meProfile.user.displayName?.trim() ||
    "Партнёр RemCard";

  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInviteWizardState({
      step: "partner",
      agentOneWay,
      requestTerms: true,
      recipientId: "link-draft",
    }),
  );
  const [nameDraft, setNameDraft] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [shareHint, setShareHint] = useState("");
  const lastRecipientKey = useRef("");

  useEffect(() => {
    const key = nameDraft.trim().toLocaleLowerCase("ru");
    if (!key || key === lastRecipientKey.current) return;
    lastRecipientKey.current = key;
    dispatch({
      type: "replace",
      state: setInviteWizardRecipient(createInviteWizardState({ step: "partner" }), {
        recipientId: `link:${key}`,
        recipientName: nameDraft.trim(),
        agentOneWay,
        categories: [],
        requestTerms: true,
      }),
    });
  }, [nameDraft, agentOneWay]);

  function go(step: InviteWizardStep) {
    if (step !== "partner" && !nameDraft.trim()) {
      dispatch({
        type: "patch",
        state: { ...state, error: "Укажите имя или название партнёра" },
      });
      return;
    }
    dispatch({
      type: "patch",
      state: goInviteWizardStep(
        {
          ...state,
          recipientId: state.recipientId || `link:${nameDraft.trim()}`,
          recipientName: nameDraft.trim() || state.recipientName,
        },
        step,
      ),
    });
  }

  /** Exact reference: template click replaces message immediately — no confirmation. */
  function applyTemplate(id: InviteMessageTemplateId) {
    dispatch({
      type: "patch",
      state: applyInviteTemplate(state, id, inviterName),
    });
  }

  async function submitFinal() {
    if (state.submitDone || state.submitPending || shareUrl) return;
    if (disableSubmit) {
      dispatch({
        type: "patch",
        state: markInviteSubmitFailed(state, "Отправка отключена в этом прогоне QA."),
      });
      return;
    }
    let next = markInviteSubmitPending(state);
    dispatch({ type: "patch", state: next });
    try {
      const result = await remcardFetch<{
        token: string;
        previewPath: string;
      }>("/api/partnership/discussion-invite", {
        method: "POST",
        idempotencyKey: next.submitIdempotencyKey ?? undefined,
        body: {
          recipientLabel: nameDraft.trim(),
          cooperationSubject: next.message.trim(),
        },
      });
      setShareUrl(`${getAppUrl()}${result.previewPath}`);
      dispatch({ type: "patch", state: markInviteSubmitDone(next) });
      onCreated?.();
    } catch (caught) {
      dispatch({
        type: "patch",
        state: markInviteSubmitFailed(
          next,
          caught instanceof RemcardApiError ? caught.message : "Не удалось создать приглашение",
        ),
      });
    }
  }

  const stepIndex = INVITE_WIZARD_STEPS.findIndex((s) => s.id === state.step);

  return (
    <section
      ref={dialogRef}
      className={styles.dialog}
      style={{ position: "relative", boxShadow: "none", width: "100%" }}
      data-testid="partner-link-invite-wizard"
      aria-labelledby={titleId}
    >
      <div className={styles.header}>
        <h3 id={titleId}>{shareUrl ? "Приглашение создано" : "Пригласить по ссылке"}</h3>
        {onClose ? (
          <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        ) : null}
      </div>

      {!shareUrl ? (
        <div className={styles.steps} role="list">
          {INVITE_WIZARD_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={styles.step}
              role="listitem"
              data-active={state.step === step.id}
              data-done={index < stepIndex}
            >
              {step.label}
            </div>
          ))}
        </div>
      ) : null}

      {state.error ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}

      {shareUrl ? (
        <div data-testid="link-invite-share">
          <p className={styles.hint}>
            Это приглашение к обсуждению. Сотрудничество начнётся только после согласования условий.
          </p>
          <div className={styles.reviewBlock}>
            <pre>{state.message}</pre>
            <pre data-testid="link-invite-share-url">{shareUrl}</pre>
          </div>
          <div className={styles.actions}>
            <Button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${state.message.trim()}\n\n${shareUrl}`,
                  );
                  setShareHint("Скопировано. Отправьте сами — автоматическая рассылка не выполняется.");
                } catch {
                  setShareHint("Скопируйте ссылку вручную.");
                }
              }}
            >
              Поделиться
            </Button>
          </div>
          {shareHint ? <p className={styles.hint}>{shareHint}</p> : null}
        </div>
      ) : null}

      {!shareUrl && state.step === "partner" ? (
        <div data-testid="link-invite-step-partner">
          <TextField
            label="Имя или название партнёра"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value.slice(0, 100))}
            maxLength={100}
            placeholder="Например, «Дом материалов»"
            data-testid="link-invite-name"
          />
          <p className={styles.hint}>Название магазина, компании или имя мастера. Контакты пока не нужны.</p>
          <div className={styles.actions}>
            <Button type="button" onClick={() => go("message")}>
              Далее: сообщение
            </Button>
          </div>
        </div>
      ) : null}

      {!shareUrl && state.step === "message" ? (
        <div data-testid="link-invite-step-message">
          <div className={styles.templates} role="group" aria-label="Варианты приглашения">
            {INVITE_MESSAGE_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className={styles.templateBtn}
                data-active={state.lastTemplateId === tpl.id && !state.customMessageDirty}
                aria-pressed={state.lastTemplateId === tpl.id && !state.customMessageDirty}
                data-testid={`link-invite-template-${tpl.id}`}
                onClick={() => applyTemplate(tpl.id)}
              >
                {tpl.label}
              </button>
            ))}
          </div>
          <TextAreaField
            label="Текст приглашения"
            value={state.message}
            onChange={(e) =>
              dispatch({ type: "patch", state: setInviteWizardMessage(state, e.target.value) })
            }
            maxLength={1000}
            rows={6}
            placeholder="Напишите своё приглашение"
          />
          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={() => go("partner")}>
              Назад
            </Button>
            <Button type="button" onClick={() => go("review")}>
              Далее: проверить
            </Button>
          </div>
        </div>
      ) : null}

      {!shareUrl && state.step === "review" ? (
        <div data-testid="link-invite-step-review">
          <div className={styles.reviewBlock}>
            <p className={styles.hint}>Кого приглашаете</p>
            <strong>{nameDraft.trim()}</strong>
            <p className={styles.hint}>Сообщение</p>
            <pre>{state.message}</pre>
          </div>
          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={() => go("message")}>
              Назад
            </Button>
            <Button
              type="button"
              disabled={state.submitPending || !state.message.trim()}
              onClick={() => void submitFinal()}
              data-testid="link-invite-submit"
            >
              {state.submitPending ? "Создаём…" : "Создать приглашение"}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
