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
  cooperationVisibilityToken,
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

type PendingAccountDelete = {
  partnerId: string;
  publicId: string;
  displayName: string | null;
  effects: string[];
  warnings: string[];
  loginServices: string[];
  counts: {
    partnerships: number;
    orders: number;
    certificates: number;
    settlements?: number;
  };
  hasClientCabinet: boolean;
  confirmToken: string;
};

type Props = {
  row: PartnerRegistryItem;
  open: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
  pendingPreview: PendingPreview | null;
  pendingAccountDelete?: PendingAccountDelete | null;
  publicIdConfirm?: string;
  onPublicIdConfirmChange?: (value: string) => void;
  onCancelPreview: () => void;
  onRequestPreview: (action: string) => void;
  onRequestAccountDeletePreview?: () => void;
  onConfirmApply: () => void;
  onConfirmAccountDelete?: () => void;
  onRetryDialogError: () => void;
  onClose: () => void;
  isApplying: boolean;
  disabled: boolean;
  dialogError: string | null;
  accountDeleteSuccess?: string | null;
  /** Bumps after successful apply+reload so focus lands on a live in-dialog control. */
  postApplyFocusKey?: number;
};

export function AdminPartnersPartnerDetailDialog({
  row,
  open,
  reason,
  onReasonChange,
  pendingPreview,
  pendingAccountDelete = null,
  publicIdConfirm = "",
  onPublicIdConfirmChange,
  onCancelPreview,
  onRequestPreview,
  onRequestAccountDeletePreview,
  onConfirmApply,
  onConfirmAccountDelete,
  onRetryDialogError,
  onClose,
  isApplying,
  disabled,
  dialogError,
  accountDeleteSuccess = null,
  postApplyFocusKey = 0,
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const errorZoneRef = useRef<HTMLDivElement>(null);
  const retryBtnRef = useRef<HTMLButtonElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const lastErrorRef = useRef<string | null>(null);
  const lastPostApplyKeyRef = useRef(0);

  const catalog = catalogVisibilityToken(row);
  const cooperation = cooperationVisibilityToken(row);
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
  const catalogSwitchOn = catalog.visible === true;
  const searchSwitchOn = cooperation.visible === true;
  const catalogSwitchDisabled =
    disabled || isApplying || catalog.visible === null;
  const searchSwitchDisabled =
    disabled ||
    isApplying ||
    cooperation.visible === null ||
    (searchSwitchOn ? hideControl.disabled : showControl.disabled);
  const searchSwitchHint = searchSwitchOn ? hideControl.hint : showControl.hint;

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
      onClose();
    };
    dialog.addEventListener("close", onCloseEvent);
    return () => dialog.removeEventListener("close", onCloseEvent);
  }, [onClose]);

  // Reveal + focus workflow error inside the dialog scroll container (product behavior).
  useEffect(() => {
    if (!open || !dialogError) {
      lastErrorRef.current = dialogError;
      return;
    }
    if (lastErrorRef.current === dialogError) return;
    lastErrorRef.current = dialogError;
    const reveal = () => {
      const zone = errorZoneRef.current;
      if (!zone || !zone.isConnected) return;
      if (typeof zone.scrollIntoView === "function") {
        zone.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
      const body = bodyRef.current;
      if (body) {
        const zoneTop = zone.offsetTop;
        const zoneBottom = zoneTop + zone.offsetHeight;
        if (zoneTop < body.scrollTop) {
          body.scrollTop = Math.max(0, zoneTop - 8);
        } else if (zoneBottom > body.scrollTop + body.clientHeight) {
          body.scrollTop = Math.max(0, zoneBottom - body.clientHeight + 8);
        }
      }
      const target = retryBtnRef.current ?? zone;
      if (target instanceof HTMLElement && target.isConnected && typeof target.focus === "function") {
        try {
          target.focus({ preventScroll: true });
        } catch {
          target.focus();
        }
      }
    };
    queueMicrotask(reveal);
    requestAnimationFrame(reveal);
  }, [open, dialogError]);

  // After successful apply/reload, focus a live enabled control inside the open card.
  useEffect(() => {
    if (!open || !postApplyFocusKey || isApplying || disabled) return;
    if (postApplyFocusKey === lastPostApplyKeyRef.current) return;
    lastPostApplyKeyRef.current = postApplyFocusKey;
    const focusReason = () => {
      const el = reasonRef.current;
      if (!el || !el.isConnected || el.disabled) return false;
      try {
        el.focus({ preventScroll: true });
      } catch {
        el.focus();
      }
      if (typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
      return document.activeElement === el;
    };
    queueMicrotask(() => {
      if (focusReason()) return;
      requestAnimationFrame(() => {
        focusReason();
      });
    });
  }, [open, postApplyFocusKey, row.id, isApplying, disabled]);

  if (!open) return null;

  function requestClose() {
    if (isApplying) return;
    onCancelPreview();
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
        ref={bodyRef}
        className={styles.partnerDetailBody}
        role="region"
        aria-label={`Управление партнёром ${row.displayName ?? row.id}`}
      >
        {dialogError ? (
          <div
            ref={errorZoneRef}
            className={styles.dialogErrorZone}
            role="alert"
            tabIndex={-1}
            data-dialog-error-zone="true"
          >
            <p className={styles.error}>{dialogError}</p>
            <Button
              ref={retryBtnRef}
              type="button"
              variant="secondary"
              disabled={disabled || isApplying}
              onClick={() => void onRetryDialogError()}
            >
              Повторить
            </Button>
          </div>
        ) : null}

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
          className={`${styles.regPill} ${styles.detailRegBadge} ${
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
            <div className={styles.detailSettingsCopy}>
              <h3>Публичный каталог</h3>
              <p>{catalogDetailCopy(catalog)}</p>
            </div>
            <div className={styles.switchLabel}>
              <button
                type="button"
                role="switch"
                className={styles.visibilitySwitch}
                aria-checked={catalogSwitchOn}
                aria-label="Видимость в каталоге"
                title="Запросит подтверждение; без немедленного применения"
                disabled={catalogSwitchDisabled}
                data-visibility-switch="catalog"
                onClick={() => {
                  if (catalog.visible === true) void onRequestPreview("hide_catalog");
                  else if (catalog.visible === false) void onRequestPreview("publish_catalog");
                }}
              />
            </div>
          </div>
          <div className={styles.detailSettingsRow}>
            <div className={styles.detailSettingsCopy}>
              <h3>Поиск сотрудничества</h3>
              <p>
                {searchPrimary ??
                  (cooperation.visible === true
                    ? "Другие партнёры могут найти"
                    : cooperation.visible === false
                      ? "Другие партнёры не видят в поиске"
                      : "Нет данных с сервера")}
              </p>
              <dl className={styles.searchControlStatus}>
                <div>
                  <dt>Решение администратора</dt>
                  <dd>{searchSetting}</dd>
                </div>
              </dl>
            </div>
            <div className={styles.detailSearchSwitchCluster}>
              <div className={styles.switchLabel}>
                <button
                  type="button"
                  role="switch"
                  className={styles.visibilitySwitch}
                  aria-checked={searchSwitchOn}
                  aria-label="Видимость в сотрудничестве"
                  title={
                    searchSwitchHint ??
                    "Запросит подтверждение; без немедленного применения"
                  }
                  disabled={searchSwitchDisabled}
                  data-visibility-switch="cooperation"
                  onClick={() => {
                    if (searchSwitchOn) {
                      void onRequestPreview(PARTNER_SEARCH_LIFECYCLE_ACTION.hide);
                    } else {
                      void onRequestPreview(PARTNER_SEARCH_LIFECYCLE_ACTION.show);
                    }
                  }}
                />
              </div>
              {!resetControl.disabled ? (
                <Button
                  variant="secondary"
                  className={styles.resetSearchRules}
                  disabled={disabled || isApplying || resetControl.disabled}
                  title={resetControl.hint ?? undefined}
                  onClick={() => void onRequestPreview(PARTNER_SEARCH_LIFECYCLE_ACTION.reset)}
                >
                  По правилам регистрации
                </Button>
              ) : null}
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
          RemScore, процент заполненности, визиты и журнал управления: нет данных API. Архив
          сохраняет аккаунт. Удаление аккаунта необратимо закрывает учётную запись и освобождает
          вход для новой регистрации.
        </p>

        <label className={styles.field}>
          Причина изменения
          <textarea
            ref={reasonRef}
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

        {accountDeleteSuccess ? (
          <div role="status" className={styles.confirmation}>
            <p>{accountDeleteSuccess}</p>
          </div>
        ) : null}

        {pendingAccountDelete ? (
          <div
            role="dialog"
            aria-label="Подтверждение удаления аккаунта"
            className={styles.confirmation}
            data-account-delete-confirm="true"
          >
            <p>
              <strong>
                {pendingAccountDelete.displayName ?? "Партнёр"} · {pendingAccountDelete.publicId}
              </strong>
            </p>
            <p>{[...pendingAccountDelete.effects, ...pendingAccountDelete.warnings].join(" ")}</p>
            <p className={styles.helpTip}>
              Связано: партнёрств {pendingAccountDelete.counts.partnerships}, заказов{" "}
              {pendingAccountDelete.counts.orders}, сертификатов{" "}
              {pendingAccountDelete.counts.certificates}, расчётов{" "}
              {pendingAccountDelete.counts.settlements ?? 0}
              {pendingAccountDelete.loginServices.length > 0
                ? `. Сервисы входа: ${pendingAccountDelete.loginServices.join(", ")}`
                : ""}
              .
            </p>
            <label className={styles.field}>
              Введите публичный ID для подтверждения
              <input
                aria-label="Публичный ID для подтверждения удаления"
                value={publicIdConfirm}
                disabled={disabled || isApplying}
                onChange={(e) => onPublicIdConfirmChange?.(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <div className={styles.actions}>
              <Button variant="secondary" disabled={isApplying} onClick={onCancelPreview}>
                Отмена
              </Button>
              <Button
                className={styles.danger}
                disabled={
                  disabled ||
                  isApplying ||
                  publicIdConfirm.trim() !== pendingAccountDelete.publicId
                }
                onClick={() => void onConfirmAccountDelete?.()}
              >
                {isApplying ? "Удаление…" : "Удалить аккаунт без возможности восстановления"}
              </Button>
            </div>
          </div>
        ) : pendingPreview ? (
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
              title="Профиль перестанет участвовать в работе проекта. Аккаунт и история сохранятся. Это не удаление аккаунта и не новая регистрация"
              onClick={() => void onRequestPreview("archive_project")}
            >
              Архивировать профиль
            </Button>
            <Button
              variant="secondary"
              disabled={disabled || isApplying}
              title="Возвращает существующий профиль. Не создаёт новый аккаунт и не отменяет другие ограничения"
              onClick={() => void onRequestPreview("restore_project")}
            >
              Восстановить профиль из архива
            </Button>
            <Button
              variant="secondary"
              className={styles.danger}
              disabled={disabled || isApplying || !onRequestAccountDeletePreview}
              title="Старый аккаунт будет закрыт. Новый аккаунт не получит старые партнёрства, историю, роли и бонусы"
              onClick={() => void onRequestAccountDeletePreview?.()}
            >
              Удалить аккаунт партнёра
            </Button>
          </div>
        )}
      </div>
    </dialog>
  );
}
