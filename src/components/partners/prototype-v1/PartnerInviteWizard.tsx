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
  agentInviteProposal,
  applyInviteTemplate,
  buildInvitePersistNote,
  buildInviteShareText,
  createInviteWizardState,
  goInviteWizardStep,
  markInviteSubmitDone,
  markInviteSubmitFailed,
  markInviteSubmitPending,
  selectedPublishedTermsForSubmit,
  setInviteTermField,
  setInviteTermsMode,
  setInviteWizardMessage,
  setInviteWizardRecipient,
  syncInviteWizardPublishedTerms,
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
  const agentProposal = agentInviteProposal({
    recipientPartnerType: target.partnerType,
  });

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
  const [created, setCreated] = useState<CreatedInvite | null>(null);
  const [shareHint, setShareHint] = useState("");

  // Hard-reset only when recipient id changes. Same-user profile refresh must NOT
  // clear step/message. Async terms load uses soft sync for the same recipient.
  const stateRef = useRef(state);
  stateRef.current = state;
  const targetRef = useRef(target);
  targetRef.current = target;
  const meProfileRef = useRef(meProfile);
  meProfileRef.current = meProfile;
  const agentCooperationRef = useRef(agentCooperation);
  agentCooperationRef.current = agentCooperation;
  /** Shared sequence for initial cert load and review retry — stale responses must not apply. */
  const certRequestSeqRef = useRef(0);

  useEffect(() => {
    const requestSeq = ++certRequestSeqRef.current;
    const recipientId = target.id;
    const actorId = meProfile.user.id;
    const isCurrent = () =>
      certRequestSeqRef.current === requestSeq &&
      targetRef.current.id === recipientId &&
      meProfileRef.current.user.id === actorId;

    setTermsStatus("loading");
    setTermsError("");
    setCreated(null);

    dispatch({
      type: "replace",
      state: setInviteWizardRecipient(createInviteWizardState({ step: "partner" }), {
        recipientId: target.id,
        recipientName: partnerTitle(target),
        agentOneWay: agentCooperation,
        categories: [],
        requestTerms: true,
      }),
    });

    const applyPlan = (
      published: Parameters<typeof planPublishedInviteTerms>[2],
      statusOverride?: "error" | "unavailable",
    ) => {
      if (!isCurrent()) return;
      const liveTarget = targetRef.current;
      const liveMe = meProfileRef.current;
      const plan = planPublishedInviteTerms(liveMe, liveTarget, published);
      const input = {
        recipientId: liveTarget.id,
        recipientName: partnerTitle(liveTarget),
        agentOneWay: plan.agentOneWay,
        categories: plan.categories,
        requestTerms: plan.requestTerms,
      };
      dispatch({
        type: "patch",
        state: syncInviteWizardPublishedTerms(stateRef.current, input),
      });
      // Error/unavailable must not be overwritten into a false «условий нет».
      if (statusOverride === "error") {
        setTermsStatus("error");
        return;
      }
      if (statusOverride === "unavailable" || plan.blockedReason) {
        setTermsStatus("unavailable");
        return;
      }
      if (plan.requestTerms) setTermsStatus("empty");
      else setTermsStatus("loaded");
    };

    const fromSearch = publishedTermsFromSearchResult(target);
    if (fromSearch && fromSearch.length > 0) {
      applyPlan(fromSearch);
      return () => {
        if (certRequestSeqRef.current === requestSeq) {
          certRequestSeqRef.current += 1;
        }
      };
    }

    void fetchPartnerCertificateProgram(recipientId).then((cert) => {
      if (!isCurrent()) return;
      const mapped = publishedTermsFromCertState(cert);
      if (mapped.status === "error") {
        setTermsError(mapped.message);
        applyPlan([], "error");
        return;
      }
      if (mapped.status === "loading" || mapped.status === "idle") return;
      if (mapped.status === "empty") {
        applyPlan([]);
        return;
      }
      if (mapped.status === "unavailable") {
        applyPlan([], "unavailable");
        return;
      }
      if (mapped.status === "loaded") {
        applyPlan(mapped.items);
      }
    });

    return () => {
      if (certRequestSeqRef.current === requestSeq) {
        certRequestSeqRef.current += 1;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only recipient id; meProfile refresh must not reset
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

  /** Exact reference: template click replaces message immediately — no confirmation. */
  function applyTemplate(id: InviteMessageTemplateId) {
    dispatch({
      type: "patch",
      state: applyInviteTemplate(state, id, inviterName),
    });
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
      const selected = selectedPublishedTermsForSubmit(next);
      const idempotencyKey = next.submitIdempotencyKey ?? undefined;
      // Empty/custom: full review conditions in note. Published numeric → terms[];
      // still keep explicit reciprocal ownTerms in note when the sender typed them.
      const note = buildInvitePersistNote(next, {
        agentProposal,
        includeConditions: selected.length === 0,
        includeOwnTermsAlongsidePublished: selected.length > 0,
      });

      let response: {
        partnershipId?: string;
        inviteId?: string;
        token?: string;
        previewPath?: string;
        replayed?: boolean;
      };

      if (selected.length > 0) {
        // Published numeric categories only — never invent percents for custom mode.
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
        // Release guard: cooperationRequest remains agent-only.
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
        // Extended contract: non-agent empty terms → requestPartnerTerms (not cooperationRequest).
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
  const share = buildInviteShareText(state, sharePath, { agentProposal });
  const stepIndex = INVITE_WIZARD_STEPS.findIndex((s) => s.id === state.step);
  const customTerms = state.termsMode === "custom";
  const publishedWithPercent = state.categories.filter((c) => c.storePercent != null);

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
                Не удалось загрузить условия: {termsError || "ошибка сети"}. На шаге проверки можно
                запросить условия у партнёра без выдуманных процентов.
              </div>
            ) : (
              <p className={styles.hint}>
                Условия сотрудничества выберете на шаге проверки.
              </p>
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
            {/* Exact reference simplified step 2: three templates + one field; no «Свой текст», no confirm. */}
            <div className={styles.templates} role="group" aria-label="Варианты приглашения">
              {INVITE_MESSAGE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className={styles.templateBtn}
                  data-active={state.lastTemplateId === tpl.id && !state.customMessageDirty}
                  data-testid={`invite-template-${tpl.id}`}
                  aria-pressed={state.lastTemplateId === tpl.id && !state.customMessageDirty}
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
                dispatch({
                  type: "patch",
                  state: setInviteWizardMessage(state, e.target.value),
                })
              }
              maxLength={1000}
              rows={6}
              placeholder="Напишите своё приглашение"
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
            </div>

            <details className={styles.termsDetails} open data-testid="invite-terms-editor">
              <summary>Условия сотрудничества</summary>

              {state.agentOneWay && !customTerms ? (
                <div className={styles.notice} data-testid="invite-agent-proposal">
                  <p className={styles.hint}>Что я предлагаю</p>
                  <p>{agentProposal}</p>
                </div>
              ) : null}

              <div className={styles.termModes} role="group" aria-label="Источник условий">
                <button
                  type="button"
                  className={styles.templateBtn}
                  data-active={!customTerms}
                  aria-pressed={!customTerms}
                  data-testid="invite-terms-mode-published"
                  onClick={() =>
                    dispatch({
                      type: "patch",
                      state: setInviteTermsMode(state, "published"),
                    })
                  }
                >
                  Условия партнёра
                </button>
                <button
                  type="button"
                  className={styles.templateBtn}
                  data-active={customTerms}
                  aria-pressed={customTerms}
                  data-testid="invite-terms-mode-custom"
                  onClick={() =>
                    dispatch({
                      type: "patch",
                      state: setInviteTermsMode(state, "custom", {
                        agentDefaultAction: agentProposal,
                      }),
                    })
                  }
                >
                  Свой вариант
                </button>
              </div>

              {customTerms ? (
                <div className={styles.termFields} data-testid="invite-terms-custom">
                  <TextAreaField
                    label={
                      state.agentOneWay
                        ? "Что я предлагаю партнёру"
                        : "Как предлагаю рекомендовать партнёра"
                    }
                    value={state.partnerAction}
                    onChange={(e) =>
                      dispatch({
                        type: "patch",
                        state: setInviteTermField(state, "partnerAction", e.target.value),
                      })
                    }
                    maxLength={250}
                    rows={2}
                    placeholder="Например, рекомендовать ваши товары своим клиентам"
                    data-testid="invite-partner-action"
                  />
                  <TextAreaField
                    label={
                      state.agentOneWay
                        ? "На каких условиях хочу работать"
                        : "На каких условиях хочу рекомендовать партнёра"
                    }
                    value={state.partnerBenefit}
                    onChange={(e) =>
                      dispatch({
                        type: "patch",
                        state: setInviteTermField(state, "partnerBenefit", e.target.value),
                      })
                    }
                    maxLength={250}
                    rows={2}
                    placeholder="Напишите пожелания или оставьте пустым"
                    data-testid="invite-partner-benefit"
                  />
                </div>
              ) : termsStatus === "error" ? (
                <div className={styles.notice} role="alert" data-testid="invite-terms-error">
                  Не удалось загрузить опубликованные условия
                  {termsError ? `: ${termsError}` : ""}. Можно выбрать «Свой вариант» или повторить
                  позже — отсутствие условий не подтверждено.
                  <div className={styles.actions}>
                    <Button
                      type="button"
                      variant="secondary"
                      data-testid="invite-terms-retry"
                      onClick={() => {
                        const requestSeq = ++certRequestSeqRef.current;
                        const recipientId = targetRef.current.id;
                        const actorId = meProfileRef.current.user.id;
                        const isCurrent = () =>
                          certRequestSeqRef.current === requestSeq &&
                          targetRef.current.id === recipientId &&
                          meProfileRef.current.user.id === actorId;
                        setTermsStatus("loading");
                        setTermsError("");
                        void fetchPartnerCertificateProgram(recipientId).then((cert) => {
                          if (!isCurrent()) return;
                          const mapped = publishedTermsFromCertState(cert);
                          if (mapped.status === "error") {
                            setTermsError(mapped.message);
                            setTermsStatus("error");
                            return;
                          }
                          if (mapped.status === "loaded") {
                            const liveTarget = targetRef.current;
                            const liveMe = meProfileRef.current;
                            const plan = planPublishedInviteTerms(
                              liveMe,
                              liveTarget,
                              mapped.items,
                            );
                            dispatch({
                              type: "patch",
                              state: syncInviteWizardPublishedTerms(stateRef.current, {
                                recipientId: liveTarget.id,
                                recipientName: partnerTitle(liveTarget),
                                agentOneWay: plan.agentOneWay,
                                categories: plan.categories,
                                requestTerms: plan.requestTerms,
                              }),
                            });
                            setTermsStatus(plan.requestTerms ? "empty" : "loaded");
                            return;
                          }
                          if (mapped.status === "loading" || mapped.status === "idle") {
                            return;
                          }
                          setTermsStatus(
                            mapped.status === "unavailable" ? "unavailable" : "empty",
                          );
                        });
                      }}
                    >
                      Повторить загрузку
                    </Button>
                  </div>
                </div>
              ) : termsStatus === "loading" ? (
                <div className={styles.notice} data-testid="invite-terms-loading">
                  Загружаем опубликованные условия… Пока загрузка не завершена, отсутствие условий
                  не подтверждено. Можно выбрать «Свой вариант».
                </div>
              ) : publishedWithPercent.length > 0 ? (
                <>
                  <p className={styles.hint}>
                    Опубликованные условия «{state.recipientName}». Выберите подходящие категории.
                  </p>
                  <ul className={styles.categories} data-testid="invite-published-terms">
                    {state.categories.map((cat) =>
                      cat.storePercent == null ? null : (
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
                            <span>{cat.categoryLabel}</span>
                            <b> {cat.storePercent}%</b>
                          </label>
                        </li>
                      ),
                    )}
                  </ul>
                  <p className={styles.hint}>{POOL_PERCENT_DISCLAIMER}</p>
                </>
              ) : (
                <div className={styles.notice} data-testid="invite-request-terms">
                  {`У «${state.recipientName}» нет опубликованных условий. ${
                    state.agentOneWay
                      ? "В приглашении попросим партнёра предложить условия."
                      : "Можно написать свой вариант или согласовать условия позже."
                  }`}
                </div>
              )}

              {!state.agentOneWay ? (
                <TextAreaField
                  label="Что предлагаю партнёру за рекомендации"
                  value={state.ownTerms}
                  onChange={(e) =>
                    dispatch({
                      type: "patch",
                      state: setInviteTermField(state, "ownTerms", e.target.value),
                    })
                  }
                  maxLength={250}
                  rows={2}
                  placeholder="Напишите свои условия или согласуйте их позже"
                  data-testid="invite-own-terms"
                />
              ) : null}

              <div className={styles.reviewBlock}>
                <p className={styles.hint}>Предпросмотр условий</p>
                <pre data-testid="invite-review-conditions">{share.conditions}</pre>
              </div>
            </details>

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
                disabled={
                  state.submitPending ||
                  state.submitDone ||
                  !state.message.trim() ||
                  (termsStatus === "loading" && state.termsMode !== "custom")
                }
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
