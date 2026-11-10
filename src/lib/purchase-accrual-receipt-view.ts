import type { CertificatePurchase } from "@/lib/certificate-types";
import { formatMoneyRub } from "@/lib/history-format";
import { orderStatusLabel } from "@/lib/history-labels";
import { displayCategoryLabelFromStored } from "@/lib/category-display";
import type { RewardAmounts, RewardLineView, RewardResponse } from "@/lib/reward-lifecycle-types";
import { rewardActionLabels } from "@/lib/reward-lifecycle-types";

export type AccrualAmountTone = "default" | "muted" | "strike";

export type AccrualHistoryEvent = {
  label: string;
  done: boolean;
  pending?: boolean;
  cancelled?: boolean;
};

export type CategoryAccrualLine = {
  categoryLabel: string;
  beforeRub: number;
  discountRub: number;
  paidRub: number;
};

export type RewardBreakdownRub = {
  totalRub: number;
  confirmedRub: number;
  pendingRub: number;
  paidRub: number;
  suspendedRub: number;
  reviewRub: number;
};

export type PurchaseAccrualReceiptView = {
  loading: boolean;
  headline: string;
  amountText: string;
  amountTone: AccrualAmountTone;
  statusBadge: string;
  helperText: string;
  purchaseStatus: string;
  purchaseNumber: string;
  purchaseDateLabel: string;
  merchantName: string;
  paidRub: number;
  categoryLines: CategoryAccrualLine[];
  calcLines: string[];
  showCalc: boolean;
  showBreakdown: boolean;
  breakdown: RewardBreakdownRub | null;
  history: AccrualHistoryEvent[];
  lifecycleNote: string | null;
};

export function resolveRecipientAccess(reward: RewardResponse | null, rewardLoaded: boolean) {
  if (!rewardLoaded) {
    return { loading: true as const, recipient: false as const, summary: null, lines: [] as RewardLineView[] };
  }
  const recipient = Boolean(reward?.permissions?.recipient && reward.reward);
  if (!recipient || !reward?.reward) {
    return { loading: false as const, recipient: false as const, summary: null, lines: [] as RewardLineView[] };
  }
  return {
    loading: false as const,
    recipient: true as const,
    summary: reward.reward.summary,
    lines: reward.reward.lines,
  };
}

function shortPurchaseNumber(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length <= 12) return trimmed;
  return `…${trimmed.slice(-8)}`;
}

function formatPurchaseDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Moscow",
  });
}

function kopecksToRub(k: number): number {
  return Math.round(k) / 100;
}

function rubFromKopecks(k: number): string {
  return formatMoneyRub(kopecksToRub(k));
}

function formatSignedRub(rub: number): string {
  if (rub <= 0) return formatMoneyRub(0);
  return `+${formatMoneyRub(rub)}`;
}

export function buildCategoryLines(order: CertificatePurchase): CategoryAccrualLine[] {
  return order.items.map((item) => ({
    categoryLabel: displayCategoryLabelFromStored(item.categoryLabel || item.category),
    beforeRub: item.amount,
    discountRub: item.discountAmount,
    paidRub: Math.max(0, item.amount - item.discountAmount),
  }));
}

function buildRecipientCalcLines(lines: RewardLineView[]): string[] {
  return lines
    .filter((line) => line.amount > 0)
    .map((line) => `${line.categoryLabel}: ${rubFromKopecks(line.amount)} по вашей позиции`);
}

function buildLifecycleHistory(reward: RewardResponse | null): AccrualHistoryEvent[] {
  if (!reward?.reward?.history?.length) return [];
  return reward.reward.history.slice(-8).map((entry) => ({
    label: rewardActionLabels[entry.action] ?? entry.action,
    done: true,
  }));
}

function isOrderCancelled(order: CertificatePurchase): boolean {
  const status = order.status?.toUpperCase() ?? "";
  return status === "CANCELLED" || status === "RETURNED";
}

export function breakdownFromSummary(summary: RewardAmounts): RewardBreakdownRub {
  return {
    totalRub: kopecksToRub(summary.amount),
    confirmedRub: kopecksToRub(summary.confirmed),
    pendingRub: kopecksToRub(summary.pending),
    paidRub: kopecksToRub(summary.paid),
    suspendedRub: kopecksToRub(summary.suspended),
    reviewRub: kopecksToRub(summary.review),
  };
}

export function summaryHasRecipientActivity(summary: RewardAmounts): boolean {
  return (
    summary.amount > 0 ||
    summary.paid > 0 ||
    summary.confirmed > 0 ||
    summary.pending > 0 ||
    summary.suspended > 0 ||
    summary.review > 0
  );
}

export function deriveRecipientStatus(summary: RewardAmounts): {
  badge: string;
  headline: string;
  helper: string;
  tone: AccrualAmountTone;
} {
  const breakdown = breakdownFromSummary(summary);
  const { totalRub, confirmedRub, pendingRub, paidRub, suspendedRub, reviewRub } = breakdown;
  const paidExceedsAmount = summary.amount > 0 && summary.paid > summary.amount;
  const fullyPaid = summary.amount > 0 && summary.paid >= summary.amount && !paidExceedsAmount;
  const partialPaid = summary.paid > 0 && (summary.amount <= 0 || summary.paid < summary.amount);

  if (
    summary.amount <= 0 &&
    summary.paid <= 0 &&
    summary.confirmed <= 0 &&
    summary.pending <= 0 &&
    summary.suspended <= 0 &&
    summary.review <= 0
  ) {
    return {
      badge: "Нет начисления",
      headline: "Без начисления",
      helper: "Для этого аккаунта сумма вознаграждения равна нулю.",
      tone: "muted",
    };
  }

  if (reviewRub > 0) {
    return {
      badge: paidRub > 0 ? "Требует сверки" : "На сверке",
      headline: paidRub > 0 ? "Ваше вознаграждение" : "Сверка после изменений",
      helper: `К сверке: ${formatMoneyRub(reviewRub)}${paidRub > 0 ? ` · уже выплачено ${formatMoneyRub(paidRub)}` : ""}.`,
      tone: "default",
    };
  }

  if (summary.suspended > 0 && summary.confirmed <= 0 && summary.pending <= 0) {
    return {
      badge: "Приостановлено",
      headline: "Ваше вознаграждение",
      helper: `Приостановлено: ${formatMoneyRub(suspendedRub)}.`,
      tone: "muted",
    };
  }

  if (fullyPaid) {
    return {
      badge: "Выплачено",
      headline: "Выплачено",
      helper: `Получено ${formatMoneyRub(paidRub)}${summary.amount > 0 ? ` из ${formatMoneyRub(totalRub)}` : ""} по вашему начислению.`,
      tone: "default",
    };
  }

  if (paidExceedsAmount) {
    return {
      badge: "Частично выплачено",
      headline: "Ваше вознаграждение",
      helper: `Выплачено ${formatMoneyRub(paidRub)} при начислении ${formatMoneyRub(totalRub)} — требуется сверка с учётом.`,
      tone: "default",
    };
  }

  if (partialPaid) {
    return {
      badge: "Частично выплачено",
      headline: "Ваше вознаграждение",
      helper: `Выплачено ${formatMoneyRub(paidRub)} · подтверждено ${formatMoneyRub(confirmedRub)} · ожидает ${formatMoneyRub(pendingRub)}.`,
      tone: "default",
    };
  }

  if (summary.confirmed > 0 && summary.pending > 0) {
    return {
      badge: "Начислено",
      headline: "Ваше вознаграждение",
      helper: `Подтверждено ${formatMoneyRub(confirmedRub)} · ожидает ${formatMoneyRub(pendingRub)}. Выплата ещё не проведена.`,
      tone: "default",
    };
  }

  if (summary.confirmed > 0) {
    return {
      badge: "Начислено",
      headline: "Ваше вознаграждение",
      helper: "Начисление учтено. Выплата ещё не проведена.",
      tone: "default",
    };
  }

  if (summary.pending > 0) {
    return {
      badge: "Ожидает начисления",
      headline: "Ожидается начисление",
      helper: `Ожидает подтверждения: ${formatMoneyRub(pendingRub)}.`,
      tone: "muted",
    };
  }

  return {
    badge: "По данным учёта",
    headline: "Ваше вознаграждение",
    helper: "Статус начисления уточняется по условиям покупки.",
    tone: "default",
  };
}

export function mapPurchaseAccrualReceiptView(
  order: CertificatePurchase,
  reward: RewardResponse | null,
  rewardLoaded: boolean,
): PurchaseAccrualReceiptView {
  const paidRub = Math.max(0, order.totalAmount - order.discountAmount);
  const categoryLines = buildCategoryLines(order);
  const purchaseStatus = orderStatusLabel(order.status);
  const cancelled = isOrderCancelled(order);
  const access = resolveRecipientAccess(reward, rewardLoaded);

  if (access.loading && !order.isSelfScan) {
    return {
      loading: true,
      headline: "Ваше вознаграждение",
      amountText: "—",
      amountTone: "muted",
      statusBadge: "Загрузка",
      helperText: "Загружаем персональный статус начисления…",
      purchaseStatus,
      purchaseNumber: shortPurchaseNumber(order.id),
      purchaseDateLabel: formatPurchaseDate(order.createdAt),
      merchantName: order.certificatePartner?.storeName?.trim() || "Название не сохранено",
      paidRub,
      categoryLines,
      calcLines: [],
      showCalc: false,
      showBreakdown: false,
      breakdown: null,
      history: [],
      lifecycleNote: null,
    };
  }

  let headline = "Начисление по покупке";
  let amountText = "—";
  let amountTone: AccrualAmountTone = "muted";
  let statusBadge = "Статус недоступен";
  let helperText = "Персональный статус начисления для этого аккаунта не получен.";
  let lifecycleNote: string | null = null;
  let calcLines: string[] = [];
  let showCalc = false;
  let showBreakdown = false;
  let breakdown: RewardBreakdownRub | null = null;

  if (order.isSelfScan) {
    headline = "Без начисления";
    amountText = formatMoneyRub(0);
    amountTone = "strike";
    statusBadge = "Самосканирование";
    helperText = "По этой покупке вознаграждение не начисляется.";
  } else if (access.recipient && access.summary && !summaryHasRecipientActivity(access.summary)) {
    const derived = deriveRecipientStatus(access.summary);
    headline = derived.headline;
    statusBadge = cancelled ? `Покупка отменена · ${derived.badge}` : derived.badge;
    helperText = cancelled ? `Покупка отменена или возвращена. ${derived.helper}` : derived.helper;
    amountTone = derived.tone;
    amountText = formatMoneyRub(0);
    if (order.proBonus > 0) {
      lifecycleNote = `В снимке покупки указано ${formatMoneyRub(order.proBonus)} — это общий снимок, не персональная сумма для этого аккаунта.`;
    }
  } else if (access.recipient && access.summary && summaryHasRecipientActivity(access.summary)) {
    const summary = access.summary;
    breakdown = breakdownFromSummary(summary);
    showBreakdown = summaryHasRecipientActivity(summary);
    const derived = deriveRecipientStatus(summary);
    headline = derived.headline;
    statusBadge = cancelled ? `Покупка отменена · ${derived.badge}` : derived.badge;
    helperText = cancelled
      ? `Покупка отменена или возвращена. ${derived.helper}`
      : derived.helper;
    amountTone = derived.tone;
    const heroRub =
      summary.amount > 0
        ? breakdown.totalRub
        : summary.paid > 0
          ? breakdown.paidRub
          : summary.confirmed > 0
            ? breakdown.confirmedRub
            : breakdown.pendingRub;
    amountText = heroRub > 0 ? formatSignedRub(heroRub) : formatMoneyRub(0);
    calcLines = buildRecipientCalcLines(access.lines);
    showCalc = calcLines.length > 0;

    if (order.proBonus > 0 && Math.abs(order.proBonus - heroRub) > 0.009) {
      lifecycleNote = `В снимке покупки указано ${formatMoneyRub(order.proBonus)} — это общий снимок, не персональная сумма для этого аккаунта.`;
    }
  } else if (cancelled && rewardLoaded) {
    headline = "Покупка отменена";
    amountText = "—";
    amountTone = "muted";
    statusBadge = "Покупка отменена · Статус недоступен";
    helperText =
      "Покупка отменена или возвращена. Персональный статус начисления для этого аккаунта недоступен — неизвестная сумма, это не означает нулевое вознаграждение.";
    if (order.proBonus > 0) {
      lifecycleNote = `В снимке покупки: ${formatMoneyRub(order.proBonus)} (без привязки к этому аккаунту).`;
    }
  } else if (rewardLoaded) {
    helperText =
      "Персональный статус начисления недоступен для этого аккаунта. Сумма в снимке покупки не показана как ваше вознаграждение.";
    if (order.proBonus > 0) {
      lifecycleNote = `В снимке покупки: ${formatMoneyRub(order.proBonus)} (без привязки к этому аккаунту).`;
    }
  }

  const history: AccrualHistoryEvent[] = [
    {
      label: `Покупка: ${purchaseStatus}`,
      done: ["CONFIRMED", "COMPLETED"].includes(order.status?.toUpperCase() ?? ""),
      pending: !["CONFIRMED", "COMPLETED", "CANCELLED", "RETURNED"].includes(order.status?.toUpperCase() ?? ""),
      cancelled,
    },
  ];

  if (access.recipient && access.summary && summaryHasRecipientActivity(access.summary)) {
    const s = access.summary;
    if (cancelled) {
      history.push({ label: "Покупка отменена", done: false, cancelled: true });
    }
    if (s.review > 0) {
      history.push({ label: "Требуется сверка", done: false, pending: true });
    }
    if (s.suspended > 0) {
      history.push({ label: "Сумма приостановлена", done: false, pending: true });
    }
    if (s.confirmed > 0) history.push({ label: "Подтверждено к расчёту", done: true });
    if (s.pending > 0) history.push({ label: "Ожидает подтверждения", done: false, pending: true });
    if (s.paid > 0) {
      history.push({
        label: s.paid >= s.amount && s.amount > 0 ? "Выплата завершена" : "Частичная или полная выплата",
        done: s.paid >= s.amount && s.amount > 0,
        pending: s.paid > 0 && (s.amount <= 0 || s.paid < s.amount),
      });
    } else if (s.confirmed > 0) {
      history.push({ label: "Выплата", done: false, pending: true });
    }
    history.push(...buildLifecycleHistory(reward));
  } else if (cancelled && rewardLoaded) {
    history.push({ label: "Персональный статус начисления недоступен", done: false, cancelled: true });
  }

  return {
    loading: false,
    headline,
    amountText,
    amountTone,
    statusBadge,
    helperText,
    purchaseStatus,
    purchaseNumber: shortPurchaseNumber(order.id),
    purchaseDateLabel: formatPurchaseDate(order.createdAt),
    merchantName: order.certificatePartner?.storeName?.trim() || "Название не сохранено",
    paidRub,
    categoryLines,
    calcLines,
    showCalc,
    showBreakdown,
    breakdown,
    history,
    lifecycleNote,
  };
}
