"use client";
import { TextField } from "@/components/ui/FormField";
import { rewardDateHint, type RewardConfirmationDraft } from "@/lib/reward-confirmation";
import styles from "./scanner.module.css";

export function RewardConfirmationFields({ category, draft, disabled, onChange, onApplyAll }: {
  category: string; draft: RewardConfirmationDraft; disabled: boolean;
  onChange: (value: RewardConfirmationDraft) => void; onApplyAll: () => void;
}) {
  return <fieldset disabled={disabled} className={styles.rewardTerms} data-testid={`reward-terms-${category}`}>
    <legend>Подтверждение вознаграждения</legend>
    <label className={styles.rewardLabel}>
      Тип позиции
      <select value={draft.kind} onChange={e => onChange({ ...draft, kind: e.target.value as "GOODS" | "SERVICE" })}
        data-testid={`reward-kind-${category}`}>
        <option value="GOODS">Товар</option><option value="SERVICE">Услуга</option>
      </select>
    </label>
    <TextField id={`reward-days-${category}`} label="Подтвердить вознаграждение через, дней" type="number" min={0} max={36500}
      step={1} inputMode="numeric" value={draft.days} disabled={disabled}
      data-testid={`reward-days-${category}`}
      onChange={e => onChange({ ...draft, days: e.target.value })} />
    <button type="button" className={styles.rewardApply} onClick={onApplyAll}
      data-testid={`reward-apply-all-${category}`}>Этот срок для всех категорий</button>
    <label className={styles.rewardCheck}>
      <input type="checkbox" checked={draft.handedOver} data-testid={`reward-handover-${category}`}
        onChange={e => onChange({ ...draft, handedOver: e.target.checked })} />
      {draft.kind === "SERVICE" ? "Работы приняты клиентом" : "Товар передан клиенту"}
    </label>
    <p className={styles.meta} data-testid={`reward-date-${category}`}>{rewardDateHint(draft)}</p>
    <p className={styles.meta}>Начисление видно сразу. Срок определяет подтверждение, а не ограничивает право клиента на возврат.</p>
  </fieldset>;
}
