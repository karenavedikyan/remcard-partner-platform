"use client";

import { Button } from "@/components/ui/Button";
import type { PartnerRegistryItem } from "@/lib/prof-admin-partners-api";
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
  return (
    <div
      role="region"
      aria-label={`Управление партнёром ${row.displayName ?? row.id}`}
      className={styles.management}
    >
      <h2>{row.displayName}</h2>
      <p>
        Удаление обратимое: можно убрать карточки из каталога или архивировать профиль. История
        сохраняется, клиентский аккаунт не удаляется. Восстановление не гарантирует прежнюю
        публикацию в каталоге или права.
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
        <div className={styles.actions}>
          <Button
            variant="secondary"
            className={styles.danger}
            disabled={disabled}
            onClick={() => void onRequestPreview("hide_catalog")}
          >
            Убрать из каталога
          </Button>
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={() => void onRequestPreview("publish_catalog")}
          >
            Вернуть в каталог
          </Button>
          <Button
            variant="secondary"
            className={styles.danger}
            disabled={disabled}
            onClick={() => void onRequestPreview("archive_project")}
          >
            В архив проекта
          </Button>
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={() => void onRequestPreview("restore_project")}
          >
            Восстановить профиль
          </Button>
        </div>
      )}
      <Button variant="text" className={styles.close} disabled={isApplying} onClick={onClose}>
        Закрыть
      </Button>
    </div>
  );
}
