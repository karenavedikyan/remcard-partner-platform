"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/FormField";
import styles from "./AgentDiscussionInviteWizard.module.css";

export const DISCUSSION_INVITE_RECIPIENT_MAX = 120;
export const DISCUSSION_INVITE_SUBJECT_MAX = 500;

/** Agent invitation templates from frozen prototype — all ≤500 for API contract. */
export const AGENT_DISCUSSION_INVITE_TEMPLATES = {
  short: {
    label: "Коротко",
    text: "Здравствуйте! Предлагаю рекомендовать ваши товары или услуги своим клиентам и помогать вам увеличивать продажи. Присоединяйтесь в RemCard по ссылке: зарегистрируйтесь или войдите, чтобы обсудить условия сотрудничества.",
  },
  business: {
    label: "По-деловому",
    text: "Здравствуйте! Приглашаю к сотрудничеству в RemCard. Предлагаю рекомендовать ваши товары или услуги своим клиентам и помогать вам увеличивать продажи. Перейдите по ссылке и зарегистрируйтесь или войдите в существующий аккаунт. В кабинете сможем ознакомиться с предложениями и согласовать условия сотрудничества. Само приглашение не означает принятия условий.",
  },
  friendly: {
    label: "По-дружески",
    text: "Привет! Хочу рекомендовать твои товары или услуги своим клиентам и помогать тебе увеличивать продажи. Пройди регистрацию в RemCard по ссылке или войди, если аккаунт уже есть. Условия сотрудничества обсудим в кабинете.",
  },
} as const;

export type AgentDiscussionInviteTemplateKey = keyof typeof AGENT_DISCUSSION_INVITE_TEMPLATES;

export type AgentDiscussionInviteWizardProps = {
  recipientLabel: string;
  cooperationSubject: string;
  onRecipientLabelChange: (value: string) => void;
  onCooperationSubjectChange: (value: string) => void;
  creating: boolean;
  error: string;
  onCreate: () => void;
};

type Step = 1 | 2 | 3;

const STEP_LABELS = ["Партнёр", "Сообщение", "Проверка"] as const;

function templateKeyForText(text: string): AgentDiscussionInviteTemplateKey | "" {
  const trimmed = text;
  for (const key of Object.keys(
    AGENT_DISCUSSION_INVITE_TEMPLATES,
  ) as AgentDiscussionInviteTemplateKey[]) {
    if (AGENT_DISCUSSION_INVITE_TEMPLATES[key].text === trimmed) return key;
  }
  return "";
}

/** Nearest overflow scrollport for modal-body containment (not window). */
function scrollParentOf(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * Minimal scroll so `el` sits inside the scrollport below sticky progress.
 * Does not jump the caret or force the field out of view on every step change.
 */
function ensureInScrollport(el: HTMLElement | null, progress: HTMLElement | null) {
  if (!el?.isConnected) return;
  const port = scrollParentOf(el);
  if (!port) return;
  const portRect = port.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const progressBottom = progress?.getBoundingClientRect().bottom ?? portRect.top;
  const topLimit = Math.max(portRect.top, progressBottom) + 4;
  const bottomLimit = portRect.bottom - 4;
  if (elRect.top < topLimit) {
    port.scrollTop += elRect.top - topLimit;
  } else if (elRect.bottom > bottomLimit) {
    port.scrollTop += elRect.bottom - bottomLimit;
  }
}

export function AgentDiscussionInviteWizard({
  recipientLabel,
  cooperationSubject,
  onRecipientLabelChange,
  onCooperationSubjectChange,
  creating,
  error,
  onCreate,
}: AgentDiscussionInviteWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [templateKey, setTemplateKey] = useState<AgentDiscussionInviteTemplateKey | "">(() =>
    templateKeyForText(cooperationSubject),
  );
  const [stepError, setStepError] = useState("");
  /** Pending focus after Next/Back/edit; consumed in the same effect as async-error focus. */
  const pendingFocusRef = useRef<"partner" | "subject" | "create" | null>("partner");
  const prevErrorRef = useRef(error);
  const focusRafRef = useRef<number | null>(null);
  const partnerInputId = useId();
  const subjectInputId = useId();
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const wizardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    return () => {
      if (focusRafRef.current != null) {
        cancelAnimationFrame(focusRafRef.current);
        focusRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let target = pendingFocusRef.current;
    pendingFocusRef.current = null;

    // First/repeat async failure: empty→non-empty error while Create is again enabled.
    // Must schedule in THIS effect — a later effect that only writes a ref is never consumed.
    const errorAppeared = Boolean(error) && !prevErrorRef.current;
    prevErrorRef.current = error;
    if (errorAppeared && !creating && step === 3) {
      target = "create";
    }

    if (!target) return;

    if (focusRafRef.current != null) {
      cancelAnimationFrame(focusRafRef.current);
    }
    const scheduledStep = step;
    const scheduledTarget = target;
    focusRafRef.current = requestAnimationFrame(() => {
      focusRafRef.current = null;
      // Drop stale focus after close/step change/unmount or while Create is still busy.
      if (scheduledStep !== step) return;

      const progress = wizardRef.current?.querySelector<HTMLElement>(
        '[data-testid="agent-discussion-invite-progress"]',
      );

      if (scheduledTarget === "create") {
        if (creating || step !== 3) return;
        const btn = createButtonRef.current;
        if (!btn || btn.disabled || !btn.isConnected) return;
        btn.focus({ preventScroll: true });
        ensureInScrollport(btn, progress ?? null);
        return;
      }
      if (scheduledTarget === "partner") {
        if (step !== 1) return;
        const input = document.getElementById(partnerInputId);
        input?.focus({ preventScroll: true });
        ensureInScrollport(input, progress ?? null);
        return;
      }
      if (scheduledTarget === "subject") {
        if (step !== 2) return;
        const input = document.getElementById(subjectInputId);
        input?.focus({ preventScroll: true });
        ensureInScrollport(input, progress ?? null);
      }
    });

    return () => {
      if (focusRafRef.current != null) {
        cancelAnimationFrame(focusRafRef.current);
        focusRafRef.current = null;
      }
    };
  }, [step, partnerInputId, subjectInputId, error, creating]);

  function goTo(next: Step, focus: "partner" | "subject" | "create") {
    setStepError("");
    pendingFocusRef.current = focus;
    setStep(next);
  }

  function handleNextFromPartner(event: FormEvent) {
    event.preventDefault();
    if (creating) return;
    if (!recipientLabel.trim()) {
      setStepError("Укажите имя или название партнёра");
      document.getElementById(partnerInputId)?.focus({ preventScroll: true });
      return;
    }
    goTo(2, "subject");
  }

  function handleNextFromMessage(event: FormEvent) {
    event.preventDefault();
    if (creating) return;
    if (!cooperationSubject.trim()) {
      setStepError("Напишите текст приглашения");
      document.getElementById(subjectInputId)?.focus({ preventScroll: true });
      return;
    }
    goTo(3, "create");
  }

  function applyTemplate(key: AgentDiscussionInviteTemplateKey | "") {
    if (creating) return;
    setTemplateKey(key);
    if (key) {
      onCooperationSubjectChange(AGENT_DISCUSSION_INVITE_TEMPLATES[key].text);
    }
    requestAnimationFrame(() => {
      document.getElementById(subjectInputId)?.focus({ preventScroll: true });
    });
  }

  function onSubjectChange(value: string) {
    const next = value.slice(0, DISCUSSION_INVITE_SUBJECT_MAX);
    onCooperationSubjectChange(next);
    setTemplateKey(templateKeyForText(next));
  }

  const title =
    step === 1 ? "Кого хотите пригласить?" : step === 2 ? "Подготовьте приглашение" : "Проверьте приглашение";
  const intro =
    step === 1
      ? "Укажите, кому отправите ссылку к обсуждению сотрудничества."
      : step === 2
        ? `Выберите, как пригласить «${recipientLabel.trim()}», или напишите по-своему. Ссылку создадите на следующем шаге.`
        : "Проверьте получателя и текст. Затем создайте ссылку — автоматической отправки нет.";

  const canCreate =
    Boolean(recipientLabel.trim() && cooperationSubject.trim()) && !creating;

  return (
    <section
      ref={wizardRef}
      className={styles.wizard}
      data-testid="agent-discussion-invite-wizard"
      data-step={step}
    >
      <div
        className={styles.progress}
        aria-label={`Шаг ${step} из 3`}
        data-testid="agent-discussion-invite-progress"
      >
        {STEP_LABELS.map((label, index) => {
          const n = (index + 1) as Step;
          const current = step === n;
          const complete = step > n;
          return (
            <span
              key={label}
              className={`${styles.progressItem} ${current ? styles.progressCurrent : ""} ${complete ? styles.progressComplete : ""}`}
              {...(current ? { "aria-current": "step" as const } : {})}
            >
              <b aria-hidden="true">{complete ? "✓" : n}</b>
              {label}
            </span>
          );
        })}
      </div>

      {step !== 2 ? (
        <div className={styles.stepHead}>
          <span className={styles.eyebrow}>Шаг {step} из 3</span>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.intro}>{intro}</p>
        </div>
      ) : null}

      {step === 1 ? (
        <form className={styles.form} onSubmit={handleNextFromPartner} noValidate>
          <TextField
            id={partnerInputId}
            label="Имя или название партнёра"
            value={recipientLabel}
            onChange={(e) =>
              onRecipientLabelChange(e.target.value.slice(0, DISCUSSION_INVITE_RECIPIENT_MAX))
            }
            required
            maxLength={DISCUSSION_INVITE_RECIPIENT_MAX}
            placeholder="Например, «Дом материалов»"
            autoComplete="off"
            hint="Название магазина, компании или имя. Контакты пока не нужны."
            error={stepError || undefined}
            data-testid="agent-discussion-invite-recipient"
          />
          <div className={styles.example}>
            <span className={styles.eyebrow}>Что будет дальше</span>
            <p>Выберете готовое сообщение или напишете своё, затем проверите приглашение.</p>
          </div>
          <div className={styles.footer}>
            <span className={styles.footerSpacer} />
            <Button type="submit" disabled={creating} data-testid="agent-discussion-invite-next">
              Далее: сообщение
            </Button>
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <form className={`${styles.form} ${styles.formSimple}`} onSubmit={handleNextFromMessage} noValidate>
          <div className={styles.stepHead}>
            <span className={styles.eyebrow}>Шаг 2 из 3</span>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.intro}>{intro}</p>
          </div>
          <div
            className={styles.templates}
            role="group"
            aria-label="Варианты приглашения"
            data-testid="agent-discussion-invite-templates"
          >
            {(Object.keys(AGENT_DISCUSSION_INVITE_TEMPLATES) as AgentDiscussionInviteTemplateKey[]).map(
              (key) => (
                <button
                  key={key}
                  type="button"
                  className={styles.templateBtn}
                  aria-pressed={templateKey === key}
                  disabled={creating}
                  onClick={() => applyTemplate(key)}
                  data-testid={`agent-discussion-invite-template-${key}`}
                >
                  {AGENT_DISCUSSION_INVITE_TEMPLATES[key].label}
                </button>
              ),
            )}
            <button
              type="button"
              className={styles.templateBtn}
              aria-pressed={templateKey === ""}
              disabled={creating}
              onClick={() => applyTemplate("")}
              data-testid="agent-discussion-invite-template-custom"
            >
              Свой текст
            </button>
          </div>
          <TextAreaField
            id={subjectInputId}
            label="Текст приглашения"
            value={cooperationSubject}
            onChange={(e) => onSubjectChange(e.target.value)}
            required
            maxLength={DISCUSSION_INVITE_SUBJECT_MAX}
            rows={6}
            placeholder="Напишите своё приглашение"
            hint={`Любой шаблон можно изменить. До ${DISCUSSION_INVITE_SUBJECT_MAX} символов. Условия сотрудничества согласуете отдельно.`}
            error={stepError || undefined}
            data-testid="agent-discussion-invite-subject"
          />
          <div className={styles.footer}>
            <Button
              type="button"
              variant="text"
              disabled={creating}
              onClick={() => goTo(1, "partner")}
              data-testid="agent-discussion-invite-back"
            >
              Назад
            </Button>
            <Button type="submit" disabled={creating} data-testid="agent-discussion-invite-next">
              Далее: проверить
            </Button>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <div className={styles.review} data-testid="agent-discussion-invite-review">
          <div className={styles.reviewBlock}>
            <span className={styles.reviewLabel}>Кого приглашаете</span>
            <strong className={styles.reviewValue}>{recipientLabel.trim()}</strong>
            <button
              type="button"
              className={styles.editLink}
              disabled={creating}
              aria-label="Изменить имя партнёра"
              onClick={() => goTo(1, "partner")}
              data-testid="agent-discussion-invite-edit-recipient"
            >
              Изменить
            </button>
          </div>
          <div className={styles.reviewBlock}>
            <span className={styles.reviewLabel}>Пригласительное сообщение</span>
            <p className={styles.reviewMessage}>{cooperationSubject.trim()}</p>
            <button
              type="button"
              className={styles.editLink}
              disabled={creating}
              aria-label="Изменить сообщение"
              onClick={() => goTo(2, "subject")}
              data-testid="agent-discussion-invite-edit-subject"
            >
              Изменить
            </button>
          </div>
          <p className={styles.safety} data-testid="agent-discussion-invite-safety">
            Это приглашение к обсуждению. Сотрудничество начнётся только после согласования и
            принятия условий обеими сторонами.
          </p>
          {error ? (
            <p className={styles.error} role="alert" data-testid="agent-discussion-invite-error">
              {error}
            </p>
          ) : null}
          <div className={styles.footer}>
            <Button
              type="button"
              variant="text"
              disabled={creating}
              onClick={() => goTo(2, "subject")}
              data-testid="agent-discussion-invite-back"
            >
              Назад
            </Button>
            <Button
              ref={createButtonRef}
              type="button"
              disabled={!canCreate}
              onClick={() => {
                if (!canCreate) return;
                onCreate();
              }}
              data-testid="agent-discussion-invite-create"
            >
              {creating ? "Создаём…" : "Создать ссылку"}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
