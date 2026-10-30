"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { PartnerRegistryItem } from "@/lib/prof-admin-partners-api";
import {
  PARTNER_SEARCH_LIFECYCLE_ACTION,
  adminSearchOverrideSettingLabel,
  effectivePartnerSearchPrimaryLabel,
  partnerSearchActionControl,
} from "./partnerSearchControl";
import {
  catalogDetailCopy,
  catalogVisibilityToken,
  partnerIdentitySubtitle,
  partnerInitials,
  partnerPublicIdLine,
  partnershipTotalLabel,
  registrationPillLabel,
  registrationPillTone,
} from "./partnerRegistryPresentation";
import { filteredPublicLinks } from "./partnerRegistryDisplay";
import { formatRegistryCount, hasPartnershipCounts } from "./partnerCollaborationDisplay";
import { PartnerCollaborationBlock } from "./PartnerCollaborationBlock";
import styles from "./AdminPartners.module.css";

type PendingPreview = {
  partnerId: string;
  action: string;
  effects: string[];
  warnings: string[];
  confirmToken: string;
};

type Props = {
  row: PartnerRegistryItem;
  open: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
  pendingPreview: PendingPreview | null;
  onCancelPreview: () => void;
  onRequestPreview: (action: string) => void;
  onConfirmApply: () => void;
  onClose: () => void;
  isApplying: boolean;
  disabled: boolean;
  dialogError: string | null;
};

export function AdminPartnersPartnerDetailDialog({
  row,
  open,
  reason,
  onReasonChange,
  pendingPreview,
  onCancelPreview,
  onRequestPreview,
  onConfirmApply,
  onClose,
  isApplying,
  disabled,
  dialogError,
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const catalog = catalogVisibilityToken(row);
  const searchPrimary = effectivePartnerSearchPrimaryLabel(row);
  const searchSetting = adminSearchOverrideSettingLabel(row.partnerSearchVisibility);
  const showControl = partnerSearchActionControl(row, PARTNER_SEARCH_LIFECYCLE_ACTION.show);
  const hideControl = partnerSearchActionControl(row, PARTNER_SEARCH_LIFECYCLE_ACTION.hide);
  const resetControl = partnerSearchActionControl(row, PARTNER_SEARCH_LIFECYCLE_ACTION.reset);
  const publicLinks = filteredPublicLinks(row);
  const pillTone = registrationPillTone(row);
  const partnershipStat = hasPartnershipCounts(row)
    ? formatRegistryCount(row.partnershipCounts.total)
    : "—";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
      queueMicrotask(() => closeBtnRef.current?.focus());
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onCloseEvent = () => {
      // Escape / backdrop native close — parent may already have handled X button.
      onClose();
    };
    dialog.addEventListener("close", onCloseEvent);
    return () => dialog.removeEventListener("close", onCloseEvent);
  }, [onClose]);

  if (!open) return null;

  function requestClose() {
    if (isApplying) return;
    onCancelPreview();
    // Always notify parent (jsdom may not emit `close` after dialog.close()).
    onClose();
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.partnerDetailDialog} ${styles.partnerDetailDrawer}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        if (isApplying) {
          e.preventDefault();
          return;
        }
        onCancelPreview();
      }}
    >
      <div className={styles.partnerDetailHead}>
        <h2 id={titleId}>Карточка партнёра</h2>
        <button
          ref={closeBtnRef}
          type="button"
          className={styles.partnerDetailClose}
          aria-label="Закрыть карточку"
          disabled={isApplying}
          onClick={requestClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <div
        className={styles.partnerDetailBody}
        role="region"
        aria-label={`Управление партнёром ${row.displayName ?? row.id}`}
      >
        <div className={styles.detailTop}>
          <span className={styles.detailAvatar} aria-hidden="true">
            {partnerInitials(row.displayName, row.id)}
          </span>
          <div className={styles.detailTopText}>
            <h3>{row.displayName ?? row.id}</h3>
            <p>
              {partnerIdentitySubtitle(row)} · {partnerPublicIdLine(row)}
            </p>
          </div>
        </div>

        <span
          className={`${styles.regPill} ${
            pillTone === "good"
              ? styles.regPillGood
              : pillTone === "archived"
                ? styles.regPillArchived
                : ""
          }`}
        >
          <span className={styles.regPillDot} aria-hidden="true" />
          {registrationPillLabel(row)}
        </span>

        <div className={styles.detailStats}>
          <div>
            <strong>{partnershipStat}</strong>
            <small>партнёрства</small>
          </div>
          <div>
            <strong>Нет данных</strong>
            <small>профиль заполнен</small>
          </div>
          <div>
            <strong>Нет данных</strong>
            <small>последний визит</small>
          </div>
        </div>

        <div className={styles.detailList}>
          <div className={styles.detailSettingsRow}>
            <div>
              <h3>Публичный каталог</h3>
              <p>{catalogDetailCopy(catalog)}</p>
            </div>
            <div className={styles.detailToggleActions} role="group" aria-label="Действия каталога">
              <Button
                variant="secondary"
                disabled={disabled || isApplying}
                onClick={() => void onRequestPreview("publish_catalog")}
              >
                Вернуть в каталог
              </Button>
              <Button
                variant="secondary"
                className={styles.danger}
                disabled={disabled || isApplying}
                onClick={() => void onRequestPreview("hide_catalog")}
              >
                Убрать из каталога
              </Button>
            </div>
          </div>
          <div className={styles.detailSettingsRow}>
            <div>
              <h3>Поиск сотрудничества</h3>
              <dl className={styles.searchControlStatus}>
                <div>
                  <dt>Фактически в поиске</dt>
                  <dd>{searchPrimary ?? "Нет данных с сервера"}</dd>
                </div>
                <div>
                  <dt>Решение администратора</dt>
                  <dd>{searchSetting}</dd>
                </div>
              </dl>
            </div>
            <div
              className={styles.detailToggleActions}
              role="group"
              aria-label="Действия поиска сотрудничества"
            >
              <Button
                variant="secondary"
                disabled={disabled || isApplying || showControl.disabled}
                title={showControl.hint ?? undefined}
                onClick={() => void onRequestPreview(PARTNER_SEARCH_LIFECYCLE_ACTION.show)}
              >
                Показывать партнёрам
              </Button>
              <Button
                variant="secondary"
                disabled={disabled || isApplying || hideControl.disabled}
                title={hideControl.hint ?? undefined}
                onClick={() => void onRequestPreview(PARTNER_SEARCH_LIFECYCLE_ACTION.hide)}
              >
                Скрыть от партнёров
              </Button>
              <Button
                variant="secondary"
                disabled={disabled || isApplying || resetControl.disabled}
                title={resetControl.hint ?? undefined}
                onClick={() => void onRequestPreview(PARTNER_SEARCH_LIFECYCLE_ACTION.reset)}
              >
                По правилам регистрации
              </Button>
            </div>
          </div>
        </div>

        <details className={styles.detailDisclosure}>
          <summary>Пояснение поиска и статусы связей</summary>
          <PartnerCollaborationBlock row={row} variant="card" />
        </details>

        <section className={styles.detailSection}>
          <h3>
            Партнёрства{" "}
            <span className={styles.mutedInline}>{partnershipTotalLabel(row)}</span>
          </h3>
          <Link
            className={styles.detailPartnershipsLink}
            href={`/admin/partners/${encodeURIComponent(row.id)}/partnerships`}
          >
            Открыть партнёрства
          </Link>
        </section>

        <section className={styles.detailSection}>
          <h3>Публичный вид</h3>
          {publicLinks.length > 0 ? (
            <ul className={styles.detailPublicLinks}>
              {publicLinks.map((link) => (
                <li key={link.path}>
                  <a href={`https://remcard.ru${link.path}`} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.detailSectionLead}>Публичных карточек нет</p>
          )}
          <a
            className={styles.detailPartnershipsLink}
            href={`/admin/moderation/partners/${encodeURIComponent(row.id)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Открыть профиль модерации
          </a>
        </section>

        <p className={styles.helpTip}>
          RemScore, процент заполненности, визиты и журнал управления: нет данных API. Действия —
          только через preview / confirmToken. «Удалить из проекта» = архив профиля, не удаление
          аккаунта.
        </p>

        <label className={styles.field}>
          Причина изменения
          <textarea
            aria-label="Причина"
            rows={3}
            placeholder="Причина"
            value={reason}
            disabled={disabled || isApplying}
            onChange={(e) => {
              onReasonChange(e.target.value);
              onCancelPreview();
            }}
          />
        </label>

        {dialogError ? (
          <p role="alert" className={styles.error}>
            {dialogError}
          </p>
        ) : null}

        {pendingPreview ? (
          <div role="dialog" aria-label="Подтверждение изменения" className={styles.confirmation}>
            <p>{[...pendingPreview.effects, ...pendingPreview.warnings].join(" ")}</p>
            <div className={styles.actions}>
              <Button disabled={isApplying || disabled} onClick={() => void onConfirmApply()}>
                {isApplying ? "Применение…" : "Подтвердить"}
              </Button>
              <Button variant="secondary" disabled={isApplying} onClick={onCancelPreview}>
                Отмена
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.inlineActions}>
            <Button
              variant="secondary"
              className={styles.danger}
              disabled={disabled || isApplying}
              onClick={() => void onRequestPreview("archive_project")}
            >
              В архив проекта
            </Button>
            <Button
              variant="secondary"
              disabled={disabled || isApplying}
              onClick={() => void onRequestPreview("restore_project")}
            >
              Восстановить профиль
            </Button>
            <Button
              variant="secondary"
              className={styles.danger}
              disabled={disabled || isApplying}
              onClick={() => void onRequestPreview("archive_project")}
              title="Архив профиля с сохранением истории; аккаунт и покупки не удаляются"
            >
              Удалить из проекта
            </Button>
          </div>
        )}
      </div>
    </dialog>
  );
}
