import type { SettlementCompleted, SettlementObligation } from "@/lib/settlements-types";
import { formatIsoShort, formatDeadlineShort } from "@/lib/wallet-accruals/format";
import { isNeedsReview } from "@/lib/wallet-accruals/amounts";
import type { WalletHistoryRowKind, WalletTxnView } from "@/lib/wallet-accruals/types";
import { formatMoneyRub } from "@/lib/history-format";

export type TimelineStep = {
  state: "done" | "current" | "future";
  title: string;
  tone?: "amber" | "danger";
};

function normalizedKind(rowKind: WalletHistoryRowKind): WalletHistoryRowKind {
  return rowKind === "waiting" ? "waiting" : rowKind;
}

export function buildTxnTimeline(
  row: SettlementObligation | SettlementCompleted,
  txn: WalletTxnView,
): TimelineStep[] {
  const kind = normalizedKind(txn.rowKind);
  const accrualCreated = formatIsoShort(row.createdAt);
  const steps: TimelineStep[] = [];

  if (kind === "return") {
    steps.push({ state: "done", title: `Начисление создано · ${accrualCreated}` });
    steps.push({
      state: "current",
      title: "Отмена начисления",
      tone: "danger",
    });
    return steps;
  }

  if (kind === "waiting") {
    steps.push({ state: "done", title: `Начисление создано · ${accrualCreated}` });
    const deadline =
      "confirmationAt" in row && row.confirmationAt
        ? formatDeadlineShort(row.confirmationAt)
        : "—";
    const reviewNote = isNeedsReview(row) ? row.confirmationLabel ?? "Требует сверки" : null;
    steps.push({
      state: "current",
      title: reviewNote
        ? `${reviewNote} · ${deadline !== "—" ? deadline : "срок не задан"}`
        : `Ожидает подтверждения · ${deadline}`,
    });
    steps.push({ state: "future", title: "Выплата · после подтверждения" });
    return steps;
  }

  if (kind === "confirmed") {
    const deadline =
      "confirmationAt" in row && row.confirmationAt
        ? formatDeadlineShort(row.confirmationAt)
        : "—";
    steps.push({ state: "done", title: `Начисление создано · ${accrualCreated}` });
    steps.push({
      state: "done",
      title: `Подтверждено · ${deadline !== "—" ? deadline : "срок не задан"}`,
    });
    steps.push({ state: "future", title: "Выплата · по графику" });
    return steps;
  }

  if (kind === "suspended") {
    const review = isNeedsReview(row);
    const reason = review
      ? row.confirmationLabel ?? "Требует сверки"
      : ("confirmationLabel" in row && row.confirmationLabel) || "без комментария";
    const deadline =
      "confirmationAt" in row && row.confirmationAt
        ? formatDeadlineShort(row.confirmationAt)
        : "—";
    steps.push({ state: "done", title: `Начисление создано · ${accrualCreated}` });
    steps.push({
      state: "current",
      title: review
        ? `${reason} · ${deadline !== "—" ? deadline : "срок не задан"}`
        : `Приостановлено · ${reason}`,
      tone: "amber",
    });
    steps.push({ state: "future", title: "Выплата" });
    return steps;
  }

  if (kind === "received" || kind === "paid-out") {
    const paidLabel = kind === "received" ? "Получено" : "Выплачено";
    const paidDate = txn.paidAt ? formatIsoShort(txn.paidAt) : "—";
    steps.push({ state: "done", title: `Начисление создано · ${accrualCreated}` });
    steps.push({ state: "done", title: "Подтверждено" });
    steps.push({
      state: "done",
      title: `${paidLabel} · ${paidDate} · ${formatMoneyRub(txn.amount)}`,
    });
    if (txn.paidAt && "rewardPaidAt" in row && row.rewardPaidAt) {
      steps.push({
        state: "done",
        title: `Последняя выплата · ${formatIsoShort(row.rewardPaidAt)}`,
      });
    }
  }

  return steps;
}

function isCancelledStatus(status: string): boolean {
  return String(status).toUpperCase() === "CANCELLED";
}

export type FactCell = [label: string, value: string];

export function buildTxnFacts(
  row: SettlementObligation | SettlementCompleted,
  txn: WalletTxnView,
  directionLabel: string,
): FactCell[] {
  const kind = normalizedKind(txn.rowKind);
  const accrualCreated = formatIsoShort(row.createdAt);

  if (kind === "return") {
    return [
      ["Направление", directionLabel],
      ["Начисление создано", accrualCreated],
      ["Статус", "Отмена / возврат"],
    ];
  }

  if (kind === "waiting") {
    return [
      ["Направление", directionLabel],
      ["Начисление создано", accrualCreated],
      [
        "Подтверждение",
        "confirmationAt" in row && row.confirmationAt
          ? formatDeadlineShort(row.confirmationAt)
          : "—",
      ],
      ["Сумма операции", formatMoneyRub(txn.amount)],
    ];
  }

  if (kind === "confirmed") {
    return [
      ["Направление", directionLabel],
      ["Начисление создано", accrualCreated],
      [
        "Срок подтверждения",
        "confirmationAt" in row && row.confirmationAt
          ? formatDeadlineShort(row.confirmationAt)
          : "—",
      ],
      ["Подтверждено к выплате", formatMoneyRub(txn.amount)],
    ];
  }

  if (kind === "suspended") {
    const review = isNeedsReview(row);
    return [
      ["Направление", directionLabel],
      ["Начисление создано", accrualCreated],
      ["Статус", review ? row.confirmationLabel ?? "Требует сверки" : "Приостановлено"],
      [
        "Срок подтверждения",
        "confirmationAt" in row && row.confirmationAt
          ? formatDeadlineShort(row.confirmationAt)
          : "—",
      ],
      ["Сумма операции", formatMoneyRub(txn.amount)],
    ];
  }

  if (kind === "received" || kind === "paid-out") {
    const paidDate = txn.paidAt ? formatIsoShort(txn.paidAt) : "—";
    return [
      ["Направление", directionLabel],
      ["Последняя выплата", paidDate],
      ["Сумма операции", formatMoneyRub(txn.amount)],
    ];
  }

  return [];
}
