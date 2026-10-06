"use client";

import { useEffect, useReducer, useState } from "react";
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
  profileUserToPartnerSide,
  resolveInviteTradeSideCategories,
  searchResultToPartnerSide,
  validateInviteRows,
} from "@/lib/partnership-rules";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/FormField";
import styles from "./PartnerInviteDialog.module.css";

type PartnerInviteDialogProps = {
  target: PartnerSearchResult;
  meProfile: ProProfileResponse;
  busy: boolean;
  onClose: () => void;
  onSent: () => void;
};

function partnerTitle(partner: PartnerSearchResult) {
  return partner.organizationName?.trim() || partner.displayName?.trim() || "Партнёр";
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
}: PartnerInviteDialogProps) {
  const inviterSide = profileUserToPartnerSide(meProfile.user, meProfile.organization);
  const targetSide = searchResultToPartnerSide(target);
  const resolved = resolveInviteTradeSideCategories(inviterSide, targetSide);
  const resetKey = buildInviteFormResetKey(target.id, resolved.categories);

  const [form, dispatch] = useReducer(
    inviteFormReducer,
    { resetKey, categories: resolved.categories, blockedReason: resolved.blockedReason },
    (initial) =>
      createInitialInviteFormState(initial.resetKey, initial.categories, initial.blockedReason),
  );
  const [sending, setSending] = useState(false);

  useEffect(() => {
    dispatch({
      type: "sync",
      resetKey,
      categories: categoriesFromResetKey(resetKey, target.id),
      blockedReason: resolved.blockedReason,
    });
  }, [resetKey, resolved.blockedReason, target.id]);

  async function submit() {
    if (sending) {
      return;
    }
    dispatch({ type: "set_error", error: "" });
    if (resolved.blockedReason) {
      dispatch({ type: "set_error", error: resolved.blockedReason });
      return;
    }
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

    setSending(true);
    try {
      await remcardFetch("/api/partnership/invite", {
        method: "POST",
        body: {
          targetUserId: target.id,
          note: form.note.trim() || null,
          terms: inviteRowsToTerms(activeRows).map((term) => ({
            ...term,
            categoryLabel: categoryLabel(term.category),
          })),
        },
      });
      onSent();
      onClose();
    } catch (caught) {
      dispatch({
        type: "set_error",
        error: caught instanceof RemcardApiError ? caught.message : "Не удалось отправить приглашение",
      });
    } finally {
      setSending(false);
    }
  }

  const title =
    resolved.mode === "store"
      ? `Пригласить ${partnerTitle(target)} к сотрудничеству`
      : `Запрос на сотрудничество: ${partnerTitle(target)}`;

  return (
    <div className={styles.backdrop} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-labelledby="invite-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="invite-title">{title}</h3>
        <p className={styles.hint}>
          Укажите процент по каждой категории. Партнёр увидит эти условия перед принятием приглашения.
        </p>

        {resolved.blockedReason ? (
          <p className={styles.error} role="alert">
            {resolved.blockedReason}
          </p>
        ) : null}

        {!resolved.blockedReason && resolved.categories.length === 0 ? (
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

        {!resolved.blockedReason && resolved.categories.length > 0 ? (
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
          label="Комментарий к приглашению"
          value={form.note}
          onChange={(event) => dispatch({ type: "set_note", note: event.target.value })}
          hint="Необязательно"
        />

        {form.error ? (
          <p className={styles.error} role="alert">
            {form.error}
          </p>
        ) : null}

        <div className={styles.actions}>
          <Button
            disabled={busy || sending || Boolean(resolved.blockedReason)}
            onClick={() => void submit()}
          >
            {sending ? "Отправка…" : resolved.mode === "store" ? "Отправить приглашение" : "Отправить запрос"}
          </Button>
          <Button variant="secondary" disabled={sending} onClick={onClose}>
            Отмена
          </Button>
        </div>
      </div>
    </div>
  );
}
