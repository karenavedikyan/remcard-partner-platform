"use client";

import { useEffect, useMemo, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { categoryLabel } from "@/lib/partnership-labels";
import {
  buildDefaultInviteRows,
  buildGeneralInviteRow,
  DEFAULT_GENERAL_PERCENT,
  GENERAL_PARTNERSHIP_CATEGORY,
  inviteRowsToTerms,
  profileUserToPartnerSide,
  resolveInviteTradeSideCategories,
  validateInviteRows,
  type InviteTermRow,
  type PartnerSideProfile,
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

function targetToPartnerSide(target: PartnerSearchResult): PartnerSideProfile {
  return {
    id: target.id,
    partnerType: target.partnerType ?? null,
    storeCategories: target.storeCategories,
    specializations: target.specializations,
    isStoreOwner: target.partnerType === "STORE" || Boolean(target.organizationName),
  };
}

export function PartnerInviteDialog({
  target,
  meProfile,
  busy,
  onClose,
  onSent,
}: PartnerInviteDialogProps) {
  const inviter = profileUserToPartnerSide(meProfile.user, meProfile.organization);
  const targetSide = targetToPartnerSide(target);
  const resolved = useMemo(
    () => resolveInviteTradeSideCategories(inviter, targetSide),
    [inviter, targetSide],
  );

  const [rows, setRows] = useState<InviteTermRow[]>([]);
  const [useGeneralFallback, setUseGeneralFallback] = useState(false);
  const [generalConfirmed, setGeneralConfirmed] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (resolved.categories.length > 0) {
      setRows(buildDefaultInviteRows(resolved.categories));
      setUseGeneralFallback(false);
      setGeneralConfirmed(false);
    } else {
      setRows([]);
      setUseGeneralFallback(true);
      setGeneralConfirmed(false);
    }
    setError("");
  }, [target.id, resolved.categories]);

  async function submit() {
    setError("");
    const activeRows = useGeneralFallback ? [buildGeneralInviteRow()] : rows;
    const validationError = validateInviteRows(activeRows);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (useGeneralFallback && !generalConfirmed) {
      setError(
        `Подтвердите отправку с общими условиями: «${categoryLabel(GENERAL_PARTNERSHIP_CATEGORY)}» — ${DEFAULT_GENERAL_PERCENT}%`,
      );
      return;
    }

    setSending(true);
    try {
      await remcardFetch("/api/partnership/invite", {
        method: "POST",
        body: {
          targetUserId: target.id,
          note: note.trim() || null,
          terms: inviteRowsToTerms(activeRows).map((term) => ({
            ...term,
            categoryLabel: categoryLabel(term.category),
          })),
        },
      });
      onSent();
      onClose();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось отправить приглашение");
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
                checked={generalConfirmed}
                onChange={(event) => setGeneralConfirmed(event.target.checked)}
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
            {rows.map((row, index) => (
              <div key={row.category} className={styles.termRow}>
                <div className={styles.termHeader}>
                  <strong>{categoryLabel(row.category)}</strong>
                  <label className={styles.exclude}>
                    <input
                      type="checkbox"
                      checked={row.excluded}
                      onChange={(event) => {
                        const excluded = event.target.checked;
                        setRows((prev) =>
                          prev.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, excluded } : item,
                          ),
                        );
                      }}
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
                    onChange={(event) => {
                      const percent = event.target.value;
                      setRows((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, percent } : item,
                        ),
                      );
                    }}
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <TextAreaField
          label="Комментарий к приглашению"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          hint="Необязательно"
        />

        {error ? (
          <p className={styles.error} role="alert">
            {error}
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
