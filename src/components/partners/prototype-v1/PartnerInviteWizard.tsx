"use client";

import { useEffect, useId, useReducer, useRef, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { getAppUrl } from "@/lib/config";
import {
  fetchPartnerCertificateProgram,
} from "@/lib/partner-certificate-program";
import { isAgentCooperationInviter } from "@/lib/partnership-agent-inviter";
import {
  inviteRowsToTerms,
  profileUserToPartnerSide,
} from "@/lib/partnership-rules";
import {
  planPublishedInviteTerms,
  publishedTermsFromCertState,
  publishedTermsFromSearchResult,
  POOL_PERCENT_DISCLAIMER,
} from "@/lib/partners-prototype-v1/published-terms";
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

type CreatedInvite = {
  mode: "partnership" | "link";
  partnershipId?: string;
  shareUrl: string;
  previewPath: string;
};

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
  const agentCooperation = isAgentCooperationInviter(inviterSide);
  const inviterName =
    meProfile.user.catalogDisplayName?.trim() ||
    meProfile.user.displayName?.trim() ||
    "Партнёр RemCard";

  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () =>
      setInviteWizardRecipient(createInviteWizardState({ step: "partner" }), {
        recipientId: target.id,
        recipientName: partnerTitle(target),
        agentOneWay: agentCooperation,
        categories: [],
        requestTerms: true,
      }),
  );

  const [termsStatus, setTermsStatus] = useState<
    "loading" | "loaded" | "empty" | "error" | "unavailable"
  >("loading");
  const [termsError, setTermsError] = useState("");
  const [pendingTemplate, setPendingTemplate] = useState<{
    templateId: InviteMessageTemplateId;
    nextMessage: string;
  } | null>(null);
  const [created, setCreated] = useState<CreatedInvite | null>(null);
  const [shareHint, setShareHint] = useState("");

  // Reset only when recipient id changes — profile refresh of same partner must keep message.
  useEffect(() => {
    let cancelled = false;
    setTermsStatus("loading");
    setTermsError("");
    setCreated(null);

    const fromSearch = publishedTermsFromSearchResult(target);
    const applyPlan = (published: Parameters<typeof planPublishedInviteTerms>[2]) => {
      if (cancelled) return;
      const plan = planPublishedInviteTerms(meProfile, target, published);
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
      if (plan.blockedReason) setTermsStatus("unavailable");
      else if (plan.requestTerms) setTermsStatus("empty");
      else setTermsStatus("loaded");
    };

    if (fromSearch && fromSearch.length > 0) {
      applyPlan(fromSearch);
      return () => {
        cancelled = true;
      };
    }

    void fetchPartnerCertificateProgram(target.id).then((cert) => {
      if (cancelled) return;
      const mapped = publishedTermsFromCertState(cert);
      if (mapped.status === "error") {
        setTermsStatus("error");
        setTermsError(mapped.message);
        applyPlan([]);
        return;
      }
      if (mapped.status === "loading" || mapped.status === "idle") return;
      if (mapped.status === "empty" || mapped.status === "unavailable") {
        applyPlan([]);
        return;
      }
      if (mapped.status === "loaded") {
        applyPlan(mapped.items);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only recipient id
  }, [target.id]);

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
    if (state.submitDone || state.submitPending || created) return;
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

    let next = markInviteSubmitPending(state);
    dispatch({ type: "patch", state: next });

    try {
      const selected = next.categories.filter((c) => c.selected && c.storePercent != null);
      const note = next.message.trim() || null;
      const idempotencyKey = next.submitIdempotencyKey ?? undefined;

      let response: {
        partnershipId?: string;
        inviteId?: string;
        token?: string;
        previewPath?: string;
        replayed?: boolean;
      };

      if (selected.length > 0) {
        // Agent or business: keep explicitly selected published categories in payload.
        response = await remcardFetch("/api/partnership/invite", {
          method: "POST",
          idempotencyKey,
          body: {
            targetUserId: target.id,
            note,
            terms: inviteRowsToTerms(
              selected.map((c) => ({
                category: c.category,
                percent: String(c.storePercent),
                excluded: false,
              })),
            ).map((term) => ({
              ...term,
              categoryLabel:
                selected.find((c) => c.category === term.category)?.categoryLabel ??
                term.categoryLabel,
            })),
          },
        });
      } else if (agentCooperation) {
        response = await remcardFetch("/api/partnership/invite", {
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
        // Non-agent without published numeric terms — requestPartnerTerms (not cooperationRequest).
        response = await remcardFetch("/api/partnership/invite", {
          method: "POST",
          idempotencyKey,
          body: {
            targetUserId: target.id,
            note,
            requestPartnerTerms: true,
            terms: [],
          },
        });
      }

      const previewPath =
        response.previewPath ||
        (response.token ? `/invite/${response.token}` : null) ||
        (response.partnershipId
          ? `/partners?partnershipId=${encodeURIComponent(response.partnershipId)}`
          : "/partners");
      const shareUrl = `${getAppUrl()}${previewPath}`;

      setCreated({
        mode: response.token ? "link" : "partnership",
        partnershipId: response.partnershipId,
        shareUrl,
        previewPath,
      });
      dispatch({ type: "patch", state: markInviteSubmitDone(next) });
      onSent();
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

  const sharePath = created?.previewPath ?? "";
  const share = buildInviteShareText(state, sharePath);
  const stepIndex = INVITE_WIZARD_STEPS.findIndex((s) => s.id === state.step);

  async function copyShare() {
    const text = [share.message, share.conditions, created?.shareUrl]
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setShareHint("Текст скопирован. Отправьте его сами — автоматическая рассылка не выполняется.");
    } catch {
      setShareHint("Скопируйте текст вручную. Автоматическая отправка не выполняется.");
    }
  }

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
          <h3 id={titleId}>
            {created ? "Приглашение создано" : "Пригласить по ссылке"}
          </h3>
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

        {!created ? (
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
        ) : null}

        {state.error ? (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        ) : null}

        {created ? (
          <div data-testid="invite-wizard-share">
            <p className={styles.hint}>
              Это приглашение к обсуждению. Сотрудничество начнётся только после согласования и
              принятия условий обеими сторонами.
            </p>
            <div className={styles.reviewBlock}>
              <p className={styles.hint}>Сообщение</p>
              <pre data-testid="invite-share-message">{share.message}</pre>
              <p className={styles.hint}>Условия</p>
              <pre data-testid="invite-share-conditions">{share.conditions}</pre>
              <p className={styles.hint}>Путь получателя</p>
              <pre data-testid="invite-share-path">{created.shareUrl}</pre>
            </div>
            {shareHint ? <p className={styles.hint}>{shareHint}</p> : null}
            <div className={styles.actions}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Закрыть
              </Button>
              <Button type="button" onClick={() => void copyShare()} data-testid="invite-share-copy">
                Поделиться
              </Button>
            </div>
          </div>
        ) : null}

        {!created && state.step === "partner" ? (
          <div data-testid="invite-wizard-step-partner">
            <p className={styles.hint}>
              Получатель: <strong>{state.recipientName}</strong>
            </p>
            {state.agentOneWay ? (
              <p className={styles.hint}>
                Что я предлагаю: рекомендовать товары или услуги получателя своим клиентам.
              </p>
            ) : (
              <p className={styles.hint}>
                Взаимные рекомендации доступны по умолчанию. Отдельный выбор направлений не нужен.
              </p>
            )}
            {termsStatus === "loading" ? (
              <p className={styles.hint}>Загрузка опубликованных условий…</p>
            ) : null}
            {termsStatus === "error" ? (
              <div className={styles.notice} role="alert" data-testid="invite-terms-error">
                Не удалось загрузить условия: {termsError || "ошибка сети"}. Можно запросить условия у
                партнёра без выдуманных процентов.
              </div>
            ) : null}
            {termsStatus === "empty" || state.requestTerms ? (
              <div className={styles.notice} data-testid="invite-request-terms">
                {state.agentOneWay
                  ? `У «${state.recipientName}» нет опубликованных условий. В приглашении попросим партнёра предложить условия.`
                  : `У «${state.recipientName}» нет опубликованных условий. Можно согласовать условия позже.`}
              </div>
            ) : (
              <>
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
                <p className={styles.hint}>{POOL_PERCENT_DISCLAIMER}</p>
              </>
            )}
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

        {!created && state.step === "message" ? (
          <div data-testid="invite-wizard-step-message">
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
                <p>
                  Заменить изменённый текст шаблоном «
                  {INVITE_MESSAGE_TEMPLATES.find((t) => t.id === pendingTemplate.templateId)?.label}
                  »?
                </p>
                <div className={styles.actions}>
                  <Button type="button" variant="secondary" onClick={() => setPendingTemplate(null)}>
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
              label="Текст приглашения"
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
                Далее: проверить
              </Button>
            </div>
          </div>
        ) : null}

        {!created && state.step === "review" ? (
          <div data-testid="invite-wizard-step-review">
            <div className={styles.reviewBlock}>
              <p className={styles.hint}>Кого приглашаете</p>
              <strong>{state.recipientName}</strong>
              <button type="button" className={styles.linkBtn} onClick={() => go("partner")}>
                Изменить
              </button>
              <p className={styles.hint}>Пригласительное сообщение</p>
              <pre data-testid="invite-review-message">{share.message}</pre>
              <button type="button" className={styles.linkBtn} onClick={() => go("message")}>
                Изменить
              </button>
              <p className={styles.hint}>Условия сотрудничества</p>
              <pre data-testid="invite-review-conditions">{share.conditions}</pre>
            </div>
            <p className={styles.hint}>
              Это приглашение к обсуждению. Сотрудничество начнётся только после согласования и
              принятия условий обеими сторонами.
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
                  ? "Создаём…"
                  : state.submitDone
                    ? "Создано"
                    : "Создать приглашение"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
