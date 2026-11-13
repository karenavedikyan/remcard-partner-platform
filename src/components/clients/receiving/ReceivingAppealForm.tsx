"use client";

import type { ReceivingAppealCreateBody } from "@/lib/clients-parity/receiving-appeals-api";

/** Manual create — prototype renderManualInline / nav:manual. */
export type ReceivingAppealFormProps = {
  disabled?: boolean;
  onSubmit: (body: ReceivingAppealCreateBody) => void;
  onCancel?: () => void;
};

export function ReceivingAppealForm({ disabled = true, onSubmit, onCancel }: ReceivingAppealFormProps) {
  return (
    <form
      data-testid="ca-receiving-appeal-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        onSubmit({ clientName: "" });
      }}
    >
      <p className="muted">
        Форма ручного создания — wiring после K1/P1; submit {disabled ? "disabled" : "enabled"}.
      </p>
      {onCancel ? (
        <button type="button" onClick={onCancel}>
          Отмена
        </button>
      ) : null}
    </form>
  );
}
