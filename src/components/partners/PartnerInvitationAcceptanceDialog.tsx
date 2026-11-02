"use client";

import { useEffect, useId, useRef } from "react";
import type { Partnership } from "@/lib/types";
import { displayCategoryLabel } from "@/lib/category-display";
import { partnerListSubtitle, partnerRowTitle, partnershipPartnerProfile } from "@/lib/agent-r04/partner-list-row";
import { getFocusableElements, handleDialogTabKey, lockBodyScroll, unlockBodyScroll } from "@/lib/dialog-focus";
import { Button } from "@/components/ui/Button";
import styles from "./PartnerInvitationAcceptanceDialog.module.css";

type Props = {
  partnership: Partnership;
  meId: string;
  accepted: boolean;
  busy: boolean;
  error: string;
  onAccept: () => void;
  onClose: () => void;
};

/** An immutable offered snapshot. No terms editor, including after acceptance. */
export function PartnerInvitationAcceptanceDialog({
  partnership, meId, accepted, busy, error, onAccept, onClose,
}: Props) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const latest = useRef({ busy, onClose });
  latest.current = { busy, onClose };
  useEffect(() => {
    lockBodyScroll();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!latest.current.busy) latest.current.onClose();
      } else if (sheetRef.current) {
        if (event.key === "Tab" && document.activeElement === titleRef.current) {
          event.preventDefault();
          const controls = getFocusableElements(sheetRef.current);
          (event.shiftKey ? controls.at(-1) : controls[0])?.focus();
        } else {
          handleDialogTabKey(event, sheetRef.current);
        }
      }
    };
    const focus = (event: FocusEvent) => {
      if (event.target instanceof Node && !sheetRef.current?.contains(event.target)) {
        event.stopImmediatePropagation();
        titleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", key, true);
    window.addEventListener("focusin", focus, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("focusin", focus, true);
      unlockBodyScroll();
    };
  }, []);
  useEffect(() => { titleRef.current?.focus(); }, [accepted]);

  const partner = partnershipPartnerProfile(partnership, meId);
  return (
    <div className={styles.backdrop} role="presentation" onClick={() => { if (!busy) onClose(); }}>
      <div ref={sheetRef} className={styles.sheet} role="dialog" aria-modal="true"
        aria-labelledby={titleId} aria-busy={busy} data-testid="partner-invitation-acceptance"
        onClick={event => event.stopPropagation()}>
        <h2 id={titleId} ref={titleRef} tabIndex={-1}>
          {accepted ? "Приглашение принято" : "Условия сотрудничества"}
        </h2>
        <div className={styles.body}>
          <div data-testid="partner-invitation-acceptance-profile">
            <strong>{partnerRowTitle(partnership, meId)}</strong>
            <p className={styles.meta}>{partnerListSubtitle(partner)}</p>
          </div>
          {accepted ? (
            <p role="status" data-testid="partner-invitation-accepted">
              Сотрудничество активно. Партнёр доступен в разделе «Действующие партнёры».
              Согласованные условия сохранены; менять их можно отдельно из карточки партнёра.
            </p>
          ) : (
            <p>Проверьте предложение партнёра. Принятие начнёт сотрудничество на указанных условиях.</p>
          )}
          <h3>{accepted ? "Согласованные условия" : "Предложенные условия"}</h3>
          <ul className={styles.terms} data-testid="partner-invitation-acceptance-terms">
            {partnership.terms.filter(term => !term.isExcluded).map(term => (
              <li key={term.id || term.category}>
                <span>{displayCategoryLabel(term.category, term.categoryLabel)}</span>
                <strong>{term.storePercent}%</strong>
              </li>
            ))}
          </ul>
          <p className={styles.meta}>Общий процент на скидку клиенту и вознаграждение рекомендателю, а не гарантированный доход.</p>
          {partnership.terms.some(term => term.isExcluded) ? (
            <p className={styles.meta}>Исключено из предложения: {partnership.terms.filter(term => term.isExcluded)
              .map(term => displayCategoryLabel(term.category, term.categoryLabel)).join(", ")}.</p>
          ) : null}
          {partnership.note ? (
            <div className={styles.note} data-testid="partner-invitation-acceptance-note">
              <h3>Сообщение партнёра</h3><p>{partnership.note}</p>
            </div>
          ) : null}
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
        </div>
        <div className={styles.actions}>
          {accepted ? <Button onClick={onClose}>К партнёрам</Button> : (
            <>
              <Button disabled={busy} onClick={onAccept} data-testid="partner-invitation-accept-confirm">
                {busy ? "Принимаем…" : "Принять условия"}
              </Button>
              <Button variant="secondary" className={styles.cancel} disabled={busy} onClick={onClose}>
                Назад
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
