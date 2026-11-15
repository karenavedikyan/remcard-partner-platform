"use client";

import { PartnerCooperationConfirmDialog } from "@/components/partners/PartnerCooperationConfirmDialog";

type Props = {
  open: boolean;
  busy?: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
};

/** Nested alertdialog with focus trap; aria-labelledby targets dialog title (see PartnerCooperationConfirmDialog). */
export function CertificatePolicyDiscardGuard({
  open,
  busy,
  onKeepEditing,
  onDiscard,
}: Props) {
  return (
    <PartnerCooperationConfirmDialog
      open={open}
      testId="cp-discard-guard"
      title="Изменения не сохранены"
      body="Выйти без сохранения или продолжить редактирование?"
      confirmLabel="Продолжить редактирование"
      dismissLabel="Выйти без сохранения"
      safeAction="confirm"
      busy={busy}
      onConfirm={onKeepEditing}
      onDismiss={onDiscard}
    />
  );
}