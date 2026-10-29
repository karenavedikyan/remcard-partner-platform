"use client";

import { useEffect, useId, useMemo, useReducer, useRef, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { isAgentCooperationInviter } from "@/lib/partnership-agent-inviter";
import {
  inviteRowsToTerms,
  profileUserToPartnerSide,
} from "@/lib/partnership-rules";
import { planPublishedInviteTerms } from "@/lib/partners-prototype-v1/published-terms";
import {
  INVITE_MESSAGE_TEMPLATES,
  type InviteMessageTemplateId,
} from "@/lib/partners-prototype-v1/invite-message-templates";
import {
  INVITE_WIZARD_STEPS,
  applyInviteTemplate,
  buildInviteShareText,
  createInviteWizardState,
  goInviteWizardStep,
  markInviteSubmitDone,
  markInviteSubmitFailed,
  markInviteSubmitPending,
  setInviteWizardMessage,
  setInviteWizardRecipient,
  toggleInviteWizardCategory,
  type InviteWizardSnapshot,
  type InviteWizardStep,
} from "@/lib/partners-prototype-v1/invite-wizard-state";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { TextAreaField } from "@/components/ui/FormField";
import styles from "./PartnerInviteWizard.module.css";

type Props = {
  target: PartnerSearchResult;
  meProfile: ProProfileResponse;
  onClose: () => void;
  onSent: () => void;
  /** LOCAL FIXTURE / QA: never set true against production without owner approval. */
  disableSubmit?: boolean;
};

type Action =
  | { type: "replace"; state: InviteWizardSnapshot }
  | { type: "patch"; state: InviteWizardSnapshot };

function reducer(_state: InviteWizardSnapshot, action: Action): InviteWizardSnapshot {
  return action.state;
}

function partnerTitle(partner: PartnerSearchResult) {
  return partner.organizationName?.trim() || partner.displayName?.trim() || "Партнёр";
}

export function PartnerInviteWizard({
  target,
  meProfile,
  onClose,
  onSent,
  disableSubmit = false,
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const inviterSide = profileUserToPartnerSide(meProfile.user, meProfile.organization);
  const inviterName =
    meProfile.user.catalogDisplayName?.trim() ||
    meProfile.user.displayName?.trim() ||
    "Партнёр RemCard";

  const initialPlan = useMemo(
    () => planPublishedInviteTerms(meProfile, target),
    [meProfile, target],
  );

  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () =>
      setInviteWizardRecipient(createInviteWizardState({ step: "partner" }), {
        recipientId: target.id,
        recipientName: partnerTitle(target),
        agentOneWay: initialPlan.agentOneWay,
        categories: initialPlan.categories,
        requestTerms: initialPlan.requestTerms,
      }),
  );

  const [pendingTemplate, setPendingTemplate] = useState<{
    templateId: InviteMessageTemplateId;
    nextMessage: string;
  } | null>(null);

  // Recipient change clears prior conditions — sync when target id changes
  useEffect(() => {
    const plan = planPublishedInviteTerms(meProfile, target);
    dispatch({
      type: "replace",
      state: setInviteWizardRecipient(createInviteWizardState({ step: "partner" }), {
        recipientId: target.id,
        recipientName: partnerTitle(target),
        agentOneWay: plan.agentOneWay,
        categories: plan.categories,
        requestTerms: plan.requestTerms,
      }),
    });
  }, [meProfile, target]);

  useEffect(() => {
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [onClose]);

  function go(step: InviteWizardStep) {
    dispatch({ type: "patch", state: goInviteWizardStep(state, step) });
  }

  function applyTemplate(id: InviteMessageTemplateId, force = false) {
    const result = applyInviteTemplate(state, id, inviterName, { force });
    if ("needsConfirm" in result) {
      setPendingTemplate({ templateId: result.templateId, nextMessage: result.nextMessage });
      return;
    }
    setPendingTemplate(null);
    dispatch({ type: "patch", state: result });
  }

  async function submitFinal() {
    if (state.submitDone || state.submitPending) return;
    if (disableSubmit) {
      dispatch({
        type: "patch",
        state: markInviteSubmitFailed(
          state,
          "Отправка отключена в этом прогоне QA (disableSubmit).",
        ),
      });
      return;
    }
    if (initialPlan.blockedReason) {
      dispatch({
        type: "patch",
        state: markInviteSubmitFailed(state, initialPlan.blockedReason),
      });
      return;
    }

    let next = markInviteSubmitPending(state);
    dispatch({ type: "patch", state: next });

    try {
      const selected = next.categories.filter((c) => c.selected);
      const agentCooperation = isAgentCooperationInviter(inviterSide);
      const note = next.message.trim() || null;

      const idempotencyKey = next.submitIdempotencyKey ?? undefined;
      if (agentCooperation || next.requestTerms) {
        await remcardFetch("/api/partnership/invite", {
          method: "POST",
          idempotencyKey,
          body: {
            targetUserId: target.id,
            note,
            cooperationRequest: true,
            terms: [],
          },
        });
      } else {
        const rows = selected
          .filter((c) => c.storePercent != null)
          .map((c) => ({
            category: c.category,
            percent: String(c.storePercent),
            excluded: false,
          }));
        if (rows.length === 0) {
          await remcardFetch("/api/partnership/invite", {
            method: "POST",
            idempotencyKey,
            body: {
              targetUserId: target.id,
              note,
              cooperationRequest: true,
              terms: [],
            },
          });
        } else {
          await remcardFetch("/api/partnership/invite", {
            method: "POST",
            idempotencyKey,
            body: {
              targetUserId: target.id,
              note,
              terms: inviteRowsToTerms(rows).map((term) => ({
                ...term,
                categoryLabel:
                  selected.find((c) => c.category === term.category)?.categoryLabel ??
                  term.categoryLabel,
              })),
            },
          });
        }
      }

      dispatch({ type: "patch", state: markInviteSubmitDone(next) });
      onSent();
      onClose();
    } catch (caught) {
      dispatch({
        type: "patch",
        state: markInviteSubmitFailed(
          next,
          caught instanceof RemcardApiError ? caught.message : "Не удалось отправить приглашение",
        ),
      });
    }
  }

  const share = buildInviteShareText(
    state,
    `/partners?hub=find&inviteTarget=${encodeURIComponent(target.id)}`,
  );

  const stepIndex = INVITE_WIZARD_STEPS.findIndex((s) => s.id === state.step);

  return (
    <div className={styles.backdrop} role="presentation" data-testid="partner-invite-wizard">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 id={titleId}>Приглашение партнёра</h3>
          <button
            ref={closeRef}
            type="button"
            className={styles.closeBtn}
            aria-label="Закрыть"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className={styles.steps} role="list" aria-label="Шаги приглашения">
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

        {state.error ? (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        ) : null}

        {state.step === "partner" ? (
          <div data-testid="invite-wizard-step-partner">
            <p className={styles.hint}>
              Получатель: <strong>{state.recipientName}</strong>
            </p>
            {state.agentOneWay ? (
              <p className={styles.hint}>
                Вы агент: рекомендуете товары и услуги получателя. Взаимности нет — своих товаров в
                приглашении нет.
              </p>
            ) : (
              <p className={styles.hint}>
                Взаимные рекомендации по умолчанию. Отдельный выбор направлений не требуется.
              </p>
            )}
            {state.requestTerms ? (
              <div className={styles.notice} data-testid="invite-request-terms">
                Опубликованных процентов у получателя нет. Будет честный запрос условий — без
                выдуманных процентов и бонуса.
              </div>
            ) : (
              <ul className={styles.categories}>
                {state.categories.map((cat) => (
                  <li key={cat.category} className={styles.categoryRow}>
                    <label>
                      <input
                        type="checkbox"
                        checked={cat.selected}
                        onChange={(e) =>
                          dispatch({
                            type: "patch",
                            state: toggleInviteWizardCategory(
                              state,
                              cat.category,
                              e.target.checked,
                            ),
                          })
                        }
                      />{" "}
                      {cat.categoryLabel}
                      {cat.storePercent != null ? ` — ${cat.storePercent}%` : ""}
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {initialPlan.blockedReason ? (
              <p className={styles.error}>{initialPlan.blockedReason}</p>
            ) : null}
            <div className={styles.actions}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Отмена
              </Button>
              <Button type="button" onClick={() => go("message")}>
                Далее: сообщение
              </Button>
            </div>
          </div>
        ) : null}

        {state.step === "message" ? (
          <div data-testid="invite-wizard-step-message">
            <p className={styles.hint}>Одно текстовое поле. Шаблоны подставляют текст; свой текст сохраняется при возврате.</p>
            <div className={styles.templates}>
              {INVITE_MESSAGE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className={styles.templateBtn}
                  data-active={state.lastTemplateId === tpl.id && !state.customMessageDirty}
                  data-testid={`invite-template-${tpl.id}`}
                  onClick={() => applyTemplate(tpl.id)}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
            {pendingTemplate ? (
              <div className={styles.notice} data-testid="invite-template-confirm">
                <p>Заменить изменённый текст шаблоном «{INVITE_MESSAGE_TEMPLATES.find((t) => t.id === pendingTemplate.templateId)?.label}»?</p>
                <div className={styles.actions}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setPendingTemplate(null)}
                  >
                    Оставить свой
                  </Button>
                  <Button
                    type="button"
                    onClick={() => applyTemplate(pendingTemplate.templateId, true)}
                  >
                    Заменить
                  </Button>
                </div>
              </div>
            ) : null}
            <TextAreaField
              label="Сообщение"
              value={state.message}
              onChange={(e) =>
                dispatch({
                  type: "patch",
                  state: setInviteWizardMessage(state, e.target.value),
                })
              }
              maxLength={1000}
              rows={6}
              data-testid="invite-wizard-message"
            />
            <div className={styles.actions}>
              <Button type="button" variant="secondary" onClick={() => go("partner")}>
                Назад
              </Button>
              <Button type="button" onClick={() => go("review")}>
                Далее: проверка
              </Button>
            </div>
          </div>
        ) : null}

        {state.step === "review" ? (
          <div data-testid="invite-wizard-step-review">
            <div className={styles.reviewBlock}>
              <p className={styles.hint}>Получатель</p>
              <strong>{state.recipientName}</strong>
              <p className={styles.hint}>Сообщение</p>
              <pre data-testid="invite-review-message">{share.message}</pre>
              <p className={styles.hint}>Условия (отдельно)</p>
              <pre data-testid="invite-review-conditions">{share.conditions}</pre>
              <p className={styles.hint}>Путь получателя</p>
              <pre data-testid="invite-review-path">{share.path}</pre>
            </div>
            <p className={styles.hint}>
              Создание приглашения только этой кнопкой, один раз. Переходы между шагами ничего не
              отправляют.
            </p>
            <div className={styles.actions}>
              <Button type="button" variant="secondary" onClick={() => go("message")}>
                Назад
              </Button>
              <Button
                type="button"
                disabled={state.submitPending || state.submitDone || !state.message.trim()}
                onClick={() => void submitFinal()}
                data-testid="invite-wizard-submit"
              >
                {state.submitPending
                  ? "Отправляем…"
                  : state.submitDone
                    ? "Отправлено"
                    : "Отправить приглашение"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
