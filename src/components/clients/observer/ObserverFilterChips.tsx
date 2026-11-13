"use client";

import styles from "./observer.module.css";

type Props = {
  q: string;
  period: string;
  onClearQ: () => void;
  onClearPeriod: () => void;
};

const PERIOD_LABELS: Record<string, string> = {
  "30": "30 дней",
  "90": "90 дней",
  "365": "Год",
};

export function ObserverFilterChips({ q, period, onClearQ, onClearPeriod }: Props) {
  const chips: Array<{ key: string; label: string; onClear: () => void }> = [];
  const trimmed = q.trim();
  if (trimmed) chips.push({ key: "q", label: `Поиск: ${trimmed}`, onClear: onClearQ });
  if (period !== "all") {
    chips.push({
      key: "period",
      label: `Период: ${PERIOD_LABELS[period] ?? period}`,
      onClear: onClearPeriod,
    });
  }
  if (!chips.length) return null;
  return (
    <div className={styles.chips} data-testid="ca-observer-filter-chips">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className={styles.chip}
          data-ca-action={`observer:clear-${chip.key === "q" ? "q" : "period"}`}
          onClick={chip.onClear}
        >
          {chip.label} ×
        </button>
      ))}
    </div>
  );
}
