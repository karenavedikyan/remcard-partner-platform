"use client";

import { useEffect, useId, useLayoutEffect, useReducer, useRef, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
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
  validateInviteRows,
} from "@/lib/partnership-rules";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";
import type { PartnerCertProgramState } from "@/lib/partner-certificate-program";
import { FindDirectoryDetailAgentTermsAccordion } from "./PartnerFindDirectoryDetailShell";
import { searchResultDirectionGroups, searchResultTypeLabel } from "./PartnerSearchResultCard";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/FormField";
import styles from "./PartnerInviteDialog.module.css";

type PartnerInviteDialogProps = {
  target: PartnerSearchResult;
  meProfile: ProProfileResponse;
  busy: boolean;
  onClose: () => void;
  onSent: () => void;
  /** Directory flow keeps search mounted and displays a confirmed result. */
  showSentState?: boolean;
  showPublishedTerms?: boolean;
  publishedTermsSnapshot?: PartnerCertProgramState;
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
  | { type: "sync"; resetKey: string; categories: readonly string[]; blockedReason?: string }
  | { type: "set_percent"; index: number; percent: string }
  | { type: "set_excluded"; index: number; excluded: boolean }
  | { type: "set_note"; note: string }
  | { type: "set_general_confirmed"; generalConfirmed: boolean }
  | { type: "set_error"; error: string };

function inviteFormReducer(state: InviteFormSnapshot, action: InviteFormAction): InviteFormSnapshot {
  switch (action.type) {
    case "sync":
      return syncInviteFormState(state, action.resetKey, action.categories, action.blockedReason);
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
  busy,
  onClose,
  onSent,
  showSentState = false,
  showPublishedTerms = false,
  publishedTermsSnapshot,
}: PartnerInviteDialogProps) {
  const inviterSide = profileUserToPartnerSide(meProfile.user, meProfile.organization);
  const targetSide = searchResultToPartnerSide(target);
  const agentCooperationRequest = isAgentCooperationInviter(inviterSide);
  const resolved = resolveInviteTradeSideCategories(inviterSide, targetSide);
  const resetKey = buildInviteFormResetKey(target.id, resolved.categories);

  const [form, dispatch] = useReducer(
    inviteFormReducer,
    { resetKey, categories: resolved.categories, blockedReason: resolved.blockedReason },
    (initial) =>
      createInitialInviteFormState(initial.resetKey, initial.categories, initial.blockedReason),
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{
    title: string;
    meta: string;
    note: string;
    terms: Array<{ category: string; storePercent: number; isExcluded?: boolean }>;
  } | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const closeCallback = useRef(onClose);
  closeCallback.current = onClose;
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
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!inFlight.current) closeCallback.current();
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
  }, []);

  useEffect(() => {
    if (sent) headingRef.current?.focus({ preventScroll: true });
  }, [sent]);

  useEffect(() => {
    dispatch({
      type: "sync",
      resetKey,
      categories: categoriesFromResetKey(resetKey, target.id),
      blockedReason: resolved.blockedReason,
    });
  }, [resetKey, resolved.blockedReason, target.id]);

  async function submit() {
    if (inFlight.current || busy || sent) {
      return;
    }
    dispatch({ type: "set_error", error: "" });
    if (resolved.blockedReason) {
      dispatch({ type: "set_error", error: resolved.blockedReason });
      return;
    }
    if (!agentCooperationRequest) {
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
      terms: agentCooperationRequest ? [] : inviteRowsToTerms(activeInviteRows(form)),
    };
    try {
      const activeRows = activeInviteRows(form);
      await remcardFetch("/api/partnership/invite", {
        method: "POST",
        body: agentCooperationRequest
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

  const title =
    resolved.mode === "store"
      ? `Пригласить ${partnerTitle(target)} к сотрудничеству`
      : `Запрос на сотрудничество: ${partnerTitle(target)}`;

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
                <p className={styles.message}>{sent.note || "Без комментария"}</p>
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
        {agentCooperationRequest && showPublishedTerms ? (
          <FindDirectoryDetailAgentTermsAccordion partnerUserId={target.id} snapshot={publishedTermsSnapshot} />
        ) : null}
        <p className={styles.hint}>
          {agentCooperationRequest
            ? "Общие условия не являются персональной договорённостью. Числовые ставки указывает принимающий партнёр в персональном предложении."
            : "Укажите процент по каждой категории. Партнёр увидит эти условия перед принятием приглашения."}
        </p>

        <form className={styles.fields} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <fieldset className={styles.fields} disabled={sending || busy}>
        {resolved.blockedReason ? (
          <p className={styles.error} role="alert">
            {resolved.blockedReason}
          </p>
        ) : null}

        {!agentCooperationRequest && !resolved.blockedReason && resolved.categories.length === 0 ? (
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
                  dispatch({ type: "set_general_confirmed", generalConfirmed: event.target.checked })
                }
              />
              <span>
                Подтверждаю отправку с общими условиями {DEFAULT_GENERAL_PERCENT}% (
                {categoryLabel(GENERAL_PARTNERSHIP_CATEGORY)})
              </span>
            </label>
          </div>
        ) : null}

        {!agentCooperationRequest && !resolved.blockedReason && resolved.categories.length > 0 ? (
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
                        dispatch({
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
                    label="Процент"
                    type="number"
                    min={0}
                    max={100}
                    value={row.percent}
                    onChange={(event) =>
                      dispatch({ type: "set_percent", index, percent: event.target.value })
                    }
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <TextAreaField
          label={
            agentCooperationRequest
              ? "Предмет сотрудничества / интересующие товары или услуги"
              : "Комментарий к приглашению"
          }
          value={form.note}
          onChange={(event) => dispatch({ type: "set_note", note: event.target.value })}
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
            {sending ? "Отправка…" : resolved.mode === "store" ? "Отправить приглашение" : "Отправить запрос"}
          </Button>
          <Button className={styles.cancel} type="button" variant="secondary" disabled={sending || busy} onClick={onClose}>
            Отмена
          </Button>
        </div>
        </form>
        </>
        )}
      </div>
    </div>
  );
}
