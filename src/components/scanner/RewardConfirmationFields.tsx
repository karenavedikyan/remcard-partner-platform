"use client";

import { useState } from "react";
import { TextField } from "@/components/ui/FormField";
import {
  formatDaysRu,
  rewardDateHint,
  type RewardConfirmationDraft,
} from "@/lib/reward-confirmation";
import styles from "./scanner.module.css";

export function RewardConfirmationFields({
  category,
  draft,
  disabled,
  onChange,
  onApplyAll,
}: {
  category: string;
  draft: RewardConfirmationDraft;
  disabled: boolean;
  onChange: (value: RewardConfirmationDraft) => void;
  onApplyAll: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const summaryDays = formatDaysRu(draft.days);

  return (
    <details
      className={styles.rewardDetails}
      open={detailsOpen}
      onToggle={(event) => setDetailsOpen((event.target as HTMLDetailsElement).open)}
      data-testid={`reward-terms-${category}`}
    >
      <summary className={styles.rewardSummary}>
        <span className={styles.rewardSummaryLabel}>Вознаграждение PRO</span>
        <span className={styles.rewardSummaryValue}>{summaryDays}</span>
        <span className={styles.rewardSummaryAction}>Изменить</span>
      </summary>
      <fieldset disabled={disabled} className={styles.rewardTerms}>
        <legend className={styles.srOnly}>Подтверждение вознаграждения</legend>
        <label className={styles.rewardLabel}>
          Тип позиции
          <select
            value={draft.kind}
            onChange={(e) => onChange({ ...draft, kind: e.target.value as "GOODS" | "SERVICE" })}
            data-testid={`reward-kind-${category}`}
          >
            <option value="GOODS">Товар</option>
            <option value="SERVICE">Услуга</option>
          </select>
        </label>
        <TextField
          id={`reward-days-${category}`}
          label="Подтвердить вознаграждение через, дней"
          type="number"
          min={0}
          max={36500}
          step={1}
          inputMode="numeric"
          value={draft.days}
          disabled={disabled}
          data-testid={`reward-days-${category}`}
          onChange={(e) => onChange({ ...draft, days: e.target.value })}
        />
        <button
          type="button"
          className={styles.rewardApply}
          onClick={onApplyAll}
          data-testid={`reward-apply-all-${category}`}
        >
          Этот срок для всех категорий
        </button>
        <label className={styles.rewardCheck}>
          <input
            type="checkbox"
            checked={draft.handedOver}
            data-testid={`reward-handover-${category}`}
            onChange={(e) => onChange({ ...draft, handedOver: e.target.checked })}
          />
          {draft.kind === "SERVICE" ? "Работы приняты клиентом" : "Товар передан клиенту"}
        </label>
        <p className={styles.meta} data-testid={`reward-date-${category}`}>
          {rewardDateHint(draft)}
        </p>
        <p className={styles.meta}>
          Начисление видно сразу. Срок определяет подтверждение, а не ограничивает право клиента на
          возврат.
        </p>
      </fieldset>
    </details>
  );
}
