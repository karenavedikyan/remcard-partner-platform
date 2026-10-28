"use client";

import { Button } from "@/components/ui/Button";
import type { PartnerRegistryItem } from "@/lib/prof-admin-partners-api";
import {
  PARTNER_SEARCH_LIFECYCLE_ACTION,
  adminSearchOverrideSettingLabel,
  effectivePartnerSearchPrimaryLabel,
  isPartnerSearchLifecycleAction,
  partnerSearchActionControl,
  partnerSearchLifecycleActionShortLabel,
} from "./partnerSearchControl";
import styles from "./AdminPartners.module.css";

type PendingPreview = {
  action: string;
  effects: string[];
  warnings: string[];
  confirmToken: string;
};

type Props = {
  row: PartnerRegistryItem;
  reason: string;
  onReasonChange: (value: string) => void;
  pendingPreview: PendingPreview | null;
  onCancelPreview: () => void;
  onRequestPreview: (action: string) => void;
  onConfirmApply: () => void;
  onClose: () => void;
  isApplying: boolean;
  disabled: boolean;
};

function LifecycleConfirmation({
  partnerLabel,
  modeLabel,
  pendingPreview,
  isApplying,
  disabled,
  onConfirmApply,
  onCancelPreview,
}: {
  partnerLabel: string;
  modeLabel: string | null;
  pendingPreview: PendingPreview;
  isApplying: boolean;
  disabled: boolean;
  onConfirmApply: () => void;
  onCancelPreview: () => void;
}) {
  return (
    <div role="dialog" aria-label="Подтверждение изменения" className={styles.confirmation}>
      <p className={styles.confirmationLead}>
        <strong>{partnerLabel}</strong>
        {modeLabel ? <> — {modeLabel}</> : null}
      </p>
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
  );
}

export function AdminPartnersSingleManagementPanel({
  row,
  reason,
  onReasonChange,
  pendingPreview,
  onCancelPreview,
  onRequestPreview,
  onConfirmApply,
  onClose,
  isApplying,
  disabled,
}: Props) {
  const searchPrimary = effectivePartnerSearchPrimaryLabel(row);
  const searchSetting = adminSearchOverrideSettingLabel(row.partnerSearchVisibility);
  const showControl = partnerSearchActionControl(row, PARTNER_SEARCH_LIFECYCLE_ACTION.show);
  const hideControl = partnerSearchActionControl(row, PARTNER_SEARCH_LIFECYCLE_ACTION.hide);
  const resetControl = partnerSearchActionControl(row, PARTNER_SEARCH_LIFECYCLE_ACTION.reset);
  const partnerLabel = row.displayName ?? row.id;
  const pendingSearchAction =
    pendingPreview != null && isPartnerSearchLifecycleAction(pendingPreview.action)
      ? pendingPreview.action
      : null;
  const pendingIsSearch = pendingSearchAction != null;
  const pendingIsCatalog = pendingPreview != null && pendingSearchAction == null;
  const previewLocked = pendingPreview != null;

  return (
    <div
      role="region"
      aria-label={`Управление партнёром ${partnerLabel}`}
      className={styles.management}
    >
      <h2>{row.displayName}</h2>
      <p>
        Удаление обратимое: можно убрать карточки из каталога или архивировать профиль. История
        сохраняется, клиентский аккаунт не удаляется. Восстановление не гарантирует прежнюю
        публикацию в каталоге или права.
      </p>
      <section className={styles.searchControlSection} aria-label="Видимость в поиске сотрудничества">
        <h3>Поиск сотрудничества между партнёрами</h3>
        <p className={styles.searchControlLead}>
          Не меняет регистрацию и публичный каталог. Фактическая видимость в списках у других партнёров
          зависит также от их фильтров (город, тип).
        </p>
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
        {pendingIsSearch && pendingPreview ? (
          <LifecycleConfirmation
            partnerLabel={partnerLabel}
            modeLabel={partnerSearchLifecycleActionShortLabel(pendingSearchAction)}
            pendingPreview={pendingPreview}
            isApplying={isApplying}
            disabled={disabled}
            onConfirmApply={onConfirmApply}
            onCancelPreview={onCancelPreview}
          />
        ) : (
          <div className={styles.actions}>
            <Button
              variant="secondary"
              disabled={disabled || previewLocked || showControl.disabled}
              title={showControl.hint ?? undefined}
              onClick={() => void onRequestPreview(PARTNER_SEARCH_LIFECYCLE_ACTION.show)}
            >
              Показывать партнёрам
            </Button>
            <Button
              variant="secondary"
              disabled={disabled || previewLocked || hideControl.disabled}
              title={hideControl.hint ?? undefined}
              onClick={() => void onRequestPreview(PARTNER_SEARCH_LIFECYCLE_ACTION.hide)}
            >
              Скрыть от партнёров
            </Button>
            <Button
              variant="secondary"
              disabled={disabled || previewLocked || resetControl.disabled}
              title={resetControl.hint ?? undefined}
              onClick={() => void onRequestPreview(PARTNER_SEARCH_LIFECYCLE_ACTION.reset)}
            >
              По правилам регистрации
            </Button>
          </div>
        )}
      </section>
      <section className={styles.searchControlSection} aria-label="Каталог и архив профиля">
        <h3>Каталог и архив</h3>
        <p className={styles.searchControlLead}>
          Для этих действий укажите причину — она уходит в аудит вместе с подтверждением на сервере.
        </p>
        <label className={styles.field}>
          Причина изменения каталога или архива
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
        {pendingIsCatalog && pendingPreview ? (
          <LifecycleConfirmation
            partnerLabel={partnerLabel}
            modeLabel={null}
            pendingPreview={pendingPreview}
            isApplying={isApplying}
            disabled={disabled}
            onConfirmApply={onConfirmApply}
            onCancelPreview={onCancelPreview}
          />
        ) : (
          <div className={styles.actions}>
            <Button
              variant="secondary"
              className={styles.danger}
              disabled={disabled || previewLocked}
              onClick={() => void onRequestPreview("hide_catalog")}
            >
              Убрать из каталога
            </Button>
            <Button
              variant="secondary"
              disabled={disabled || previewLocked}
              onClick={() => void onRequestPreview("publish_catalog")}
            >
              Вернуть в каталог
            </Button>
            <Button
              variant="secondary"
              className={styles.danger}
              disabled={disabled || previewLocked}
              onClick={() => void onRequestPreview("archive_project")}
            >
              В архив проекта
            </Button>
            <Button
              variant="secondary"
              disabled={disabled || previewLocked}
              onClick={() => void onRequestPreview("restore_project")}
            >
              Восстановить профиль
            </Button>
          </div>
        )}
      </section>
      <Button variant="text" className={styles.close} disabled={isApplying} onClick={onClose}>
        Закрыть
      </Button>
    </div>
  );
}
