"use client";

import { useEffect, useId, useRef } from "react";
import {
  PARTNERSHIP_STATUS_LABELS,
  partnershipStatusTone,
} from "@/lib/partnership-labels";
import { getPartnershipUiActions, partnershipInviteTermsEmpty } from "@/lib/partnership-rules";
import {
  partnerListSubtitle,
  partnerRowOfficialLine,
  partnerRowTitle,
  partnerSpecializationFull,
  partnerTermsFullDetail,
  partnershipPartnerProfile,
} from "@/lib/agent-r04/partner-list-row";
import { resolvePublicPartnerType } from "@/lib/agent-r04/partner-filters";
import type { Partnership } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import sheetStyles from "./PartnerPersonalAliasDialog.module.css";
import styles from "./PartnerPartnershipDetailDialog.module.css";

type Props = {
  partnership: Partnership | null;
  meId: string;
  open: boolean;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
};

function isEmptyAgentInviteRequest(partnership: Partnership, meId: string): boolean {
  if (partnership.status !== "INVITED" || !partnershipInviteTermsEmpty(partnership)) {
    return false;
  }
  if (partnership.initiatedBy === meId) return false;
  const partner = partnershipPartnerProfile(partnership, meId);
  return resolvePublicPartnerType(partner) === "agent";
}

export function PartnerPartnershipDetailDialog({
  partnership,
  meId,
  open,
  onClose,
  returnFocusRef,
}: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) return;
    returnFocusRef?.current?.focus();
  }, [open, returnFocusRef]);

  if (!open || !partnership) return null;

  const partner = partnershipPartnerProfile(partnership, meId);
  const statusLabel = PARTNERSHIP_STATUS_LABELS[partnership.status] ?? partnership.status;
  const actions = getPartnershipUiActions(partnership, meId);
  const waiting = actions.filter((a) => a.kind === "waiting");
  const actionLabels = actions
    .filter((a) => a.kind !== "waiting")
    .map((a) => a.label);
  const termsLines = partnerTermsFullDetail(partnership);
  const specFull = partnerSpecializationFull(partner);
  const official = partnerRowOfficialLine(partnership, meId);
  const showAgentEmptyExplain = isEmptyAgentInviteRequest(partnership, meId);

  return (
    <div className={sheetStyles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={`${sheetStyles.sheet} ${styles.sheetWide}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="partner-partnership-detail-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.headerRow}>
          <h2 id={titleId}>{partnerRowTitle(partnership, meId)}</h2>
          <Button
            ref={closeRef}
            type="button"
            variant="secondary"
            className={styles.closeTop}
            onClick={onClose}
            data-testid="partner-detail-close"
          >
            Закрыть
          </Button>
        </div>

        <div className={styles.body}>
          {official ? (
            <p className={styles.metaBlock}>
              Официально: <strong>{official}</strong>
            </p>
          ) : null}
          <p className={styles.metaBlock}>{partnerListSubtitle(partner)}</p>
          <StatusBadge label={statusLabel} tone={partnershipStatusTone(partnership.status)} />

          {showAgentEmptyExplain ? (
            <p className={styles.explain} data-testid="partner-detail-agent-empty-hint">
              Агент хочет рекомендовать ваши товары и услуги клиентам. Вы можете подготовить
              персональное предложение с категориями и процентами или отклонить запрос.
            </p>
          ) : null}

          <p className={styles.sectionTitle}>Специализации и категории</p>
          <p className={styles.metaBlock}>
            {specFull || "Специализация не указана"}
          </p>

          <p className={styles.sectionTitle}>Персональные условия</p>
          {termsLines.length ? (
            <ul className={styles.list} data-testid="partner-detail-terms-list">
              {termsLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.metaBlock}>Персональные условия пока не согласованы.</p>
          )}

          {waiting.map((item) => (
            <p key={item.message} className={styles.waiting}>
              {item.message}
            </p>
          ))}

          {actionLabels.length ? (
            <>
              <p className={styles.sectionTitle}>Доступные действия в списке</p>
              <p className={styles.metaBlock}>{actionLabels.join(" · ")}</p>
            </>
          ) : null}

          {partnership.note ? (
            <>
              <p className={styles.sectionTitle}>Комментарий</p>
              <p className={styles.metaBlock}>{partnership.note}</p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
