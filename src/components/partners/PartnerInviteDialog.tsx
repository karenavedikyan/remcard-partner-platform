"use client";

import { useEffect, useId, useLayoutEffect, useReducer, useRef, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { fetchCertificatePolicyWorkspace } from "@/lib/certificate-policy/api";
import {
  audienceHasDirectionTabs,
  directionTabCopy,
  inviteDirectionOptions,
  searchResultReceivingSide,
  type InviteDirection,
} from "@/lib/partner-directions/direction";
import {
  buildDirectionalInviteBody,
  defaultInviteOfferForm,
  inviteOfferFormFromTerms,
  normalizeInviteNote,
  parseInviteOfferForm,
  INVITE_NOTE_MAX_LENGTH,
  type InviteOfferForm,
} from "@/lib/partner-directions/invite-offer";
import type { PartnersHubAudience } from "@/lib/partners-hub-presentation";
import {
  activeInviteRows,
  buildInviteFormResetKey,
  categoriesFromResetKey,
  createInitialInviteFormState,
  setInviteFormError,
  syncInviteFormState,
  updateInviteGeneralConfirmed,
  updateInviteNote,
  updateInviteRowExcluded,
  updateInviteRowPercent,
  type InviteFormSnapshot,
} from "@/lib/invite-form-state";
import { categoryLabel } from "@/lib/partnership-labels";
import {
  DEFAULT_GENERAL_PERCENT,
  GENERAL_PARTNERSHIP_CATEGORY,
  inviteRowsToTerms,
  isAgentCooperationInviter,
  profileUserToPartnerSide,
  resolveInviteTradeSideCategories,
  searchResultToPartnerSide,
  tradeSideTermCategories,
  validateInviteRows,
  type PartnerSideProfile,
} from "@/lib/partnership-rules";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";
import type { PartnerCertProgramState } from "@/lib/partner-certificate-program";
import { FindDirectoryDetailAgentTermsAccordion } from "./PartnerFindDirectoryDetailShell";
import { searchResultDirectionGroups, searchResultTypeLabel } from "./PartnerSearchResultCard";
import { Button } from "@/components/ui/Button";
import { PartnerCooperationConfirmDialog } from "./PartnerCooperationConfirmDialog";
import { TextAreaField, TextField } from "@/components/ui/FormField";
import styles from "./PartnerInviteDialog.module.css";

type PartnerInviteDialogProps = {
  target: PartnerSearchResult;
  meProfile: ProProfileResponse;
  inviterSide?: PartnerSideProfile;
  busy: boolean;
  onClose: () => void;
  onSent: () => void;
  /** Directory flow keeps search mounted and displays a confirmed result. */
  showSentState?: boolean;
  showPublishedTerms?: boolean;
  publishedTermsSnapshot?: PartnerCertProgramState;
  /** Directional flow: which side the inviter takes. Requires `audience` of a business/specialist. */
  initialDirection?: InviteDirection | null;
  audience?: PartnersHubAudience;
};

function partnerTitle(partner: PartnerSearchResult) {
  return partner.organizationName?.trim() || partner.displayName?.trim() || "Партнёр";
}

function inviteControls(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(
    'a[href],button,input,select,textarea,summary,[tabindex]',
  )).filter(el => {
    if (el.tabIndex < 0 || el.matches(":disabled") || el.closest("[hidden]")) return false;
    const closed = el.closest("details:not([open])");
    if (closed && closed.querySelector("summary") !== el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

type InviteFormAction =
  | {
      type: "sync";
      resetKey: string;
      categories: readonly string[];
      blockedReason?: string;
      keepNote?: boolean;
      restore?: InviteFormSnapshot;
    }
  | { type: "set_percent"; index: number; percent: string }
  | { type: "set_excluded"; index: number; excluded: boolean }
  | { type: "set_note"; note: string }
  | { type: "set_general_confirmed"; generalConfirmed: boolean }
  | { type: "set_error"; error: string };

function inviteFormReducer(state: InviteFormSnapshot, action: InviteFormAction): InviteFormSnapshot {
  switch (action.type) {
    case "sync": {
      if (action.restore && state.resetKey !== action.resetKey) {
        return { ...action.restore, resetKey: action.resetKey, note: state.note, error: "" };
      }
      const next = syncInviteFormState(state, action.resetKey, action.categories, action.blockedReason);
      return action.keepNote && next !== state ? { ...next, note: state.note } : next;
    }
    case "set_percent":
      return updateInviteRowPercent(state, action.index, action.percent);
    case "set_excluded":
      return updateInviteRowExcluded(state, action.index, action.excluded);
    case "set_note":
      return updateInviteNote(state, action.note);
    case "set_general_confirmed":
      return updateInviteGeneralConfirmed(state, action.generalConfirmed);
    case "set_error":
      return setInviteFormError(state, action.error);
    default:
      return state;
  }
}

export function PartnerInviteDialog({
  target,
  meProfile,
  inviterSide: inviterSideProp,
  busy,
  onClose,
  onSent,
  showSentState = false,
  showPublishedTerms = false,
  publishedTermsSnapshot,
  initialDirection = null,
  audience,
}: PartnerInviteDialogProps) {
  const inviterSide =
    inviterSideProp ?? profileUserToPartnerSide(meProfile.user, meProfile.organization);
  const targetSide = searchResultToPartnerSide(target);
  const targetReceivingSide = searchResultReceivingSide(target, targetSide);
  const agentCooperationRequest = isAgentCooperationInviter(inviterSide);
  const directionOptions = audienceHasDirectionTabs(audience) && !agentCooperationRequest
    ? inviteDirectionOptions(inviterSide, targetReceivingSide, audience)
    : [];
  const directional = directionOptions.length > 0;
  const [direction, setDirection] = useState<InviteDirection | null>(() => {
    if (!directional) return null;
    return directionOptions.some((option) => option.value === initialDirection)
      ? initialDirection
      : directionOptions[0].value;
  });
  const issuerRequest = directional && direction === "INVITER_ISSUES";
  const [offer, setOffer] = useState<InviteOfferForm>(defaultInviteOfferForm);
  const offerTouched = useRef(false);
  const receivingDraftRef = useRef<InviteFormSnapshot | null>(null);
  const legacyResolved = resolveInviteTradeSideCategories(inviterSide, targetSide);
  const resolved: typeof legacyResolved = !directional
    ? legacyResolved
    : issuerRequest
      ? { categories: [], mode: "pro" }
      : { categories: tradeSideTermCategories(inviterSide), mode: "store" };
  const resetKey = buildInviteFormResetKey(target.id, resolved.categories);

  const [form, dispatch] = useReducer(
    inviteFormReducer,
    { resetKey, categories: resolved.categories, blockedReason: resolved.blockedReason },
    (initial) =>
      createInitialInviteFormState(initial.resetKey, initial.categories, initial.blockedReason),
  );
  const [edited, setEdited] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const discardOpenRef = useRef(false);
  discardOpenRef.current = discardOpen;
  const editedRef = useRef(false);
  editedRef.current = edited;
  const cancelRef = useRef<HTMLButtonElement>(null);
  const editForm = (action: InviteFormAction) => {
    setEdited(true);
    dispatch(action);
  };
  const editOffer = (patch: Partial<InviteOfferForm>) => {
    offerTouched.current = true;
    setEdited(true);
    setOffer((prev) => ({ ...prev, ...patch }));
  };
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{
    title: string;
    meta: string;
    note: string;
    terms: Array<{ category: string; storePercent: number; isExcluded?: boolean }>;
    restrictions: {
      validityDays: number;
      purchaseLimit: number;
      minimumPurchaseAmount: number | null;
      promotionsCompatible: boolean;
      exclusionsText: string | null;
    } | null;
  } | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const closeCallback = useRef(onClose);
  closeCallback.current = onClose;
  const sentRef = useRef(false);
  const requestClose = useRef(() => {
    if (editedRef.current && !sentRef.current) {
      setDiscardOpen(true);
      return;
    }
    closeCallback.current();
  }).current;
  const headingId = useId();
  const targetMeta = [searchResultTypeLabel(target), target.city?.trim()].filter(Boolean).join(" · ");
  const directions = searchResultDirectionGroups(target).primary.join(" · ");

  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusHeading = () => headingRef.current?.focus({ preventScroll: true });
    focusHeading();
    const onKey = (event: KeyboardEvent) => {
      if (discardOpenRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!inFlight.current) requestClose();
      } else if (event.key === "Tab" && dialogRef.current) {
        const controls = inviteControls(dialogRef.current);
        const active = document.activeElement;
        const first = controls[0], last = controls[controls.length - 1];
        if (!controls.length || !controls.includes(active as HTMLElement) ||
          (event.shiftKey ? active === first : active === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
          if (!controls.length) focusHeading();
        }
        // Do not let the underlying hub's focus trap consume the same key.
        event.stopImmediatePropagation();
      }
    };
    const onFocus = (event: FocusEvent) => {
      const dialog = dialogRef.current;
      if (discardOpenRef.current) return;
      if (!dialog || (event.target instanceof Node && dialog.contains(event.target))) return;
      (inviteControls(dialog)[0] ?? headingRef.current)?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("focusin", onFocus, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("focusin", onFocus, true);
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [requestClose]);

  useEffect(() => {
    sentRef.current = sent !== null;
    if (sent) {
      receivingDraftRef.current = null;
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [sent]);


  useEffect(() => {
    if (!directional || direction !== "INVITER_RECEIVES") return;
    let cancelled = false;
    void fetchCertificatePolicyWorkspace(inviterSide.id).then((res) => {
      if (cancelled || !res.ok || offerTouched.current) return;
      setOffer(inviteOfferFormFromTerms(res.workspace.general.effective));
    });
    return () => {
      cancelled = true;
    };
  }, [directional, direction, inviterSide.id]);

  useEffect(() => {
    let stash = receivingDraftRef.current;
    if (stash && !stash.resetKey.startsWith(`${target.id}\0`)) {
      receivingDraftRef.current = null;
      stash = null;
    }
    dispatch({
      type: "sync",
      resetKey,
      categories: categoriesFromResetKey(resetKey, target.id),
      blockedReason: resolved.blockedReason,
      keepNote: directional,
      restore: directional && direction === "INVITER_RECEIVES" && stash?.resetKey === resetKey ? stash : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `direction` only selects the already-keyed draft
  }, [directional, resetKey, resolved.blockedReason, target.id]);

  async function submit() {
    if (inFlight.current || busy || sent) {
      return;
    }
    dispatch({ type: "set_error", error: "" });
    if (resolved.blockedReason) {
      dispatch({ type: "set_error", error: resolved.blockedReason });
      return;
    }
    const parsedNote = normalizeInviteNote(form.note);
    if (!parsedNote.ok) {
      dispatch({ type: "set_error", error: parsedNote.message });
      return;
    }
    let directionalBody: ReturnType<typeof buildDirectionalInviteBody> | null = null;
    if (directional && direction) {
      const activeRows = issuerRequest ? [] : activeInviteRows(form);
      if (!issuerRequest) {
        const validationError = validateInviteRows(activeRows);
        if (validationError) {
          dispatch({ type: "set_error", error: validationError });
          return;
        }
        if (form.useGeneralFallback && !form.generalConfirmed) {
          dispatch({
            type: "set_error",
            error: `Подтвердите отправку с общими условиями: «${categoryLabel(GENERAL_PARTNERSHIP_CATEGORY)}» — ${DEFAULT_GENERAL_PERCENT}%`,
          });
          return;
        }
      }
      const restrictions = parseInviteOfferForm(offer);
      if (!restrictions.ok && !issuerRequest) {
        dispatch({ type: "set_error", error: restrictions.message });
        return;
      }
      directionalBody = buildDirectionalInviteBody({
        targetUserId: target.id,
        direction,
        note: parsedNote.note,
        terms: inviteRowsToTerms(activeRows).map((term) => ({
          ...term,
          categoryLabel: categoryLabel(term.category),
        })),
        restrictions: restrictions.ok ? restrictions.restrictions : null,
      });
    } else if (!agentCooperationRequest) {
      const activeRows = activeInviteRows(form);
      const validationError = validateInviteRows(activeRows);
      if (validationError) {
        dispatch({ type: "set_error", error: validationError });
        return;
      }
      if (form.useGeneralFallback && !form.generalConfirmed) {
        dispatch({
          type: "set_error",
          error: `Подтвердите отправку с общими условиями: «${categoryLabel(GENERAL_PARTNERSHIP_CATEGORY)}» — ${DEFAULT_GENERAL_PERCENT}%`,
        });
        return;
      }
    } else if (!form.note.trim()) {
      dispatch({
        type: "set_error",
        error: "Укажите предмет сотрудничества или интересующие товары и услуги",
      });
      return;
    }

    inFlight.current = true;
    setSending(true);
    const submitted = {
      title: partnerTitle(target),
      meta: targetMeta,
      note: form.note.trim(),
      terms:
        agentCooperationRequest || issuerRequest ? [] : inviteRowsToTerms(activeInviteRows(form)),
      restrictions:
        directional && !issuerRequest ? (() => {
          const parsed = parseInviteOfferForm(offer);
          return parsed.ok ? parsed.restrictions : null;
        })() : null,
    };
    try {
      const activeRows = activeInviteRows(form);
      await remcardFetch("/api/partnership/invite", {
        method: "POST",
        body: directionalBody
          ? directionalBody
          : agentCooperationRequest
          ? {
              targetUserId: target.id,
              note: form.note.trim() || null,
              cooperationRequest: true,
              terms: [],
            }
          : {
              targetUserId: target.id,
              note: form.note.trim() || null,
              terms: inviteRowsToTerms(activeRows).map((term) => ({
                ...term,
                categoryLabel: categoryLabel(term.category),
              })),
            },
      });
      if (!mounted.current) return;
      if (showSentState) setSent(submitted);
      onSent();
      if (!showSentState) onClose();
    } catch (caught) {
      if (!mounted.current) return;
      dispatch({
        type: "set_error",
        error: caught instanceof RemcardApiError ? caught.message : "Не удалось отправить приглашение",
      });
    } finally {
      inFlight.current = false;
      if (mounted.current) setSending(false);
    }
  }

  const title = issuerRequest
    ? `Запрос условий: ${partnerTitle(target)}`
    : resolved.mode === "store"
      ? `Пригласить ${partnerTitle(target)} к сотрудничеству`
      : `Запрос на сотрудничество: ${partnerTitle(target)}`;
  const tabCopy = directionTabCopy(audience);

  return (
    <div className={styles.backdrop} role="presentation">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        data-testid="partner-direct-invite-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 ref={headingRef} tabIndex={-1} id={headingId}>
          {sent ? "Приглашение отправлено" : title}
        </h3>
        {sent ? (
          <section className={styles.sent} data-testid="partner-direct-invite-ready">
            <strong>{sent.title}</strong>
            {sent.meta ? <p className={styles.hint}>{sent.meta}</p> : null}
            <p className={styles.notice}>
              Приглашение адресовано выбранному профилю RemCard. Повторная регистрация не нужна.
              Сотрудничество начнётся после согласования и принятия условий, не после отправки.
            </p>
            <p role="status" className={styles.waiting}>Ожидает ответа</p>
            <details className={styles.sentCard}>
              <summary>Карточка приглашения</summary>
              <div className={styles.sentDetails}>
                <strong>{sent.title}</strong>
                <p className={styles.message} style={{ whiteSpace: "pre-wrap" }}>{sent.note || "Без комментария"}</p>
                {sent.restrictions ? (
                  <p data-testid="partner-direct-invite-sent-restrictions">
                    Срок скидки: {sent.restrictions.validityDays} дн. · Покупок: {sent.restrictions.purchaseLimit}
                    {sent.restrictions.minimumPurchaseAmount != null
                      ? ` · Минимальная сумма: ${sent.restrictions.minimumPurchaseAmount} ₽`
                      : ""}
                    {sent.restrictions.promotionsCompatible ? " · Совместимо с акциями" : " · Без суммирования с акциями"}
                    {sent.restrictions.exclusionsText ? ` · ${sent.restrictions.exclusionsText}` : ""}
                  </p>
                ) : null}
                {sent.terms.length ? sent.terms.map(term => (
                  <p key={term.category}>
                    {categoryLabel(term.category)}: {term.isExcluded ? "Не участвует" : `${term.storePercent}%`}
                  </p>
                )) : <p className={styles.hint}>Запрос к обсуждению, без числовых условий.</p>}
              </div>
            </details>
            <Button type="button" onClick={onClose}>Назад к поиску</Button>
          </section>
        ) : (
        <>
        <div className={styles.targetSummary} data-testid="partner-direct-invite-target">
          <strong>{partnerTitle(target)}</strong>
          {targetMeta ? <p className={styles.hint}>{targetMeta}</p> : null}
          {directions ? <p className={styles.message}>{directions}</p> : null}
          <p className={styles.hint}>Партнёр уже в RemCard. Приглашение адресовано этому профилю.</p>
        </div>
        {directional ? (
          <fieldset className={styles.directionPicker} data-testid="partner-invite-direction">
            <legend>Кто кого рекомендует</legend>
            {directionOptions.length > 1 ? (
              directionOptions.map((option) => (
                <label key={option.value} className={styles.confirmRow}>
                  <input
                    type="radio"
                    name="invite-direction"
                    value={option.value}
                    checked={direction === option.value}
                    disabled={sending || busy}
                    onChange={() => {
                      if (direction === "INVITER_RECEIVES" && option.value !== direction) {
                        receivingDraftRef.current = form;
                      }
                      setDirection(option.value);
                      dispatch({ type: "set_error", error: "" });
                    }}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small className={styles.hint}> {option.description}</small>
                  </span>
                </label>
              ))
            ) : (
              <p className={styles.hint} data-testid="partner-invite-direction-fixed">
                <strong>{directionOptions[0].label}.</strong> {directionOptions[0].description}
              </p>
            )}
            <p className={styles.hint}>
              {tabCopy.incoming} и {tabCopy.outgoing.toLowerCase()} — отдельные договорённости со своими условиями.
            </p>
          </fieldset>
        ) : null}
        {(agentCooperationRequest || issuerRequest) && (showPublishedTerms || issuerRequest) ? (
          <FindDirectoryDetailAgentTermsAccordion
            partnerUserId={target.id}
            snapshot={publishedTermsSnapshot}
            title={issuerRequest ? "Опубликованные условия партнёра (только просмотр)" : undefined}
          />
        ) : null}
        <p className={styles.hint}>
          {issuerRequest
            ? "Условия получения задаёт сам партнёр: ставки и ограничения вы не редактируете. Он подтвердит их, когда ответит на запрос. Опубликованные условия не являются персональной договорённостью."
            : agentCooperationRequest
              ? "Общие условия не являются персональной договорённостью. Числовые ставки указывает принимающий партнёр в персональном предложении."
              : directional
                ? "Укажите процент и ограничения. Партнёр увидит их до принятия приглашения. Ваши общие условия при этом не меняются."
                : "Укажите процент по каждой категории. Партнёр увидит эти условия перед принятием приглашения."}
        </p>

        <form className={styles.fields} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <fieldset className={styles.fields} disabled={sending || busy}>
        {resolved.blockedReason ? (
          <p className={styles.error} role="alert">
            {resolved.blockedReason}
          </p>
        ) : null}

        {!agentCooperationRequest && !issuerRequest && !resolved.blockedReason && resolved.categories.length === 0 ? (
          <div className={styles.notice}>
            <p>
              Категории для условий не заполнены. Можно отправить упрощённое приглашение с категорией «
              {categoryLabel(GENERAL_PARTNERSHIP_CATEGORY)}» и {DEFAULT_GENERAL_PERCENT}%.
            </p>
            <label className={styles.confirmRow}>
              <input
                type="checkbox"
                checked={form.generalConfirmed}
                onChange={(event) =>
                  editForm({ type: "set_general_confirmed", generalConfirmed: event.target.checked })
                }
              />
              <span>
                Подтверждаю отправку с общими условиями {DEFAULT_GENERAL_PERCENT}% (
                {categoryLabel(GENERAL_PARTNERSHIP_CATEGORY)})
              </span>
            </label>
          </div>
        ) : null}

        {!agentCooperationRequest && !issuerRequest && !resolved.blockedReason && resolved.categories.length > 0 ? (
          <div className={styles.termsList}>
            {form.rows.map((row, index) => (
              <div key={row.category} className={styles.termRow}>
                <div className={styles.termHeader}>
                  <strong>{categoryLabel(row.category)}</strong>
                  <label className={styles.exclude}>
                    <input
                      type="checkbox"
                      checked={row.excluded}
                      onChange={(event) =>
                        editForm({
                          type: "set_excluded",
                          index,
                          excluded: event.target.checked,
                        })
                      }
                    />
                    Исключить
                  </label>
                </div>
                {!row.excluded ? (
                  <TextField
                    id={`invite-percent-${index}-${row.category.replace(/[^A-Za-z0-9_-]/g, "_")}`}
                    label={`Процент: ${categoryLabel(row.category)}`}
                    type="number"
                    min={0}
                    max={100}
                    value={row.percent}
                    onChange={(event) =>
                      editForm({ type: "set_percent", index, percent: event.target.value })
                    }
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {directional && !issuerRequest && !resolved.blockedReason ? (
          <div className={styles.termsList} data-testid="partner-invite-restrictions">
            <div className={styles.termRow}>
              <div className={styles.termHeader}>
                <strong>Условия сертификата для этого приглашения</strong>
              </div>
              <TextField
                label="Срок скидки, дней"
                type="number"
                min={1}
                value={offer.validityDays}
                onChange={(event) => editOffer({ validityDays: event.target.value })}
              />
              <TextField
                label="Число покупок"
                type="number"
                min={1}
                value={offer.purchaseLimit}
                onChange={(event) => editOffer({ purchaseLimit: event.target.value })}
              />
              <TextField
                label="Минимальная сумма покупки, ₽"
                type="number"
                min={0}
                value={offer.minimumPurchase}
                hint="Необязательно"
                onChange={(event) => editOffer({ minimumPurchase: event.target.value })}
              />
              <label className={styles.confirmRow}>
                <input
                  type="checkbox"
                  checked={offer.promotionsCompatible}
                  onChange={(event) => editOffer({ promotionsCompatible: event.target.checked })}
                />
                <span>Скидка суммируется с акциями</span>
              </label>
              <TextAreaField
                label="Исключения"
                value={offer.exclusionsText}
                hint="Необязательно"
                onChange={(event) => editOffer({ exclusionsText: event.target.value })}
              />
            </div>
          </div>
        ) : null}

        <TextAreaField
          label={
            agentCooperationRequest
              ? "Предмет сотрудничества / интересующие товары или услуги"
              : "Комментарий к приглашению"
          }
          value={form.note}
          maxLength={directional ? INVITE_NOTE_MAX_LENGTH : undefined}
          onChange={(event) => editForm({ type: "set_note", note: event.target.value })}
          hint={agentCooperationRequest ? "Обязательно для запроса без процентов" : "Необязательно"}
        />

        {form.error ? (
          <p className={styles.error} role="alert">
            {form.error}
          </p>
        ) : null}
        </fieldset>

        <div className={styles.actions}>
          <Button
            type="submit"
            disabled={busy || sending || Boolean(resolved.blockedReason)}
          >
            {sending ? "Отправка…" : resolved.mode === "store" && !issuerRequest ? "Отправить приглашение" : "Отправить запрос"}
          </Button>
          <Button ref={cancelRef} className={styles.cancel} type="button" variant="secondary" disabled={sending || busy} onClick={requestClose}>
            Отмена
          </Button>
        </div>
        </form>
        </>
        )}
      </div>
      {discardOpen ? (
        <PartnerCooperationConfirmDialog
          open
          testId="partner-invite-discard-confirm"
          title="Закрыть без сохранения?"
          body="Черновик приглашения будет потерян."
          confirmLabel="Продолжить редактирование"
          dismissLabel="Закрыть без сохранения"
          safeAction="confirm"
          onConfirm={() => {
            setDiscardOpen(false);
            requestAnimationFrame(() => cancelRef.current?.focus({ preventScroll: true }));
          }}
          onDismiss={() => {
            setDiscardOpen(false);
            closeCallback.current();
          }}
        />
      ) : null}
    </div>
  );
}
