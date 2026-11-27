/** Fixed demo anchor — Europe/Moscow calendar math uses UTC date parts consistently. */
export const ACCRUAL_DEMO_ANCHOR = "2026-11-03";

export const ACCRUAL_SCENARIOS = {
  "pending-only": "Пока только ожидаются",
  mixed: "Часть подтверждена",
};

export const DIRECTION_LABEL = {
  in: "Мне должны",
  out: "Я должен",
};

const dayIndex = (iso) => {
  if (!iso) return NaN;
  return Date.parse(`${iso.slice(0, 10)}T12:00:00+03:00`) / 86400000;
};

export function daysUntil(anchorIso, targetIso) {
  const a = dayIndex(anchorIso);
  const t = dayIndex(targetIso);
  if (!Number.isFinite(a) || !Number.isFinite(t)) return null;
  return Math.max(0, Math.round(t - a));
}

export function isValidRubles(value) {
  return Number.isFinite(value) && value >= 0 && Math.round(value) === value;
}

export function formatRub(value) {
  return `${new Intl.NumberFormat("ru-RU").format(Math.round(value))}\u00a0₽`;
}

export function formatMoscowDate(iso) {
  if (!iso) return "дата не определена";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso.slice(0, 10)}T12:00:00+03:00`));
}

export function formatHistoryDate(iso) {
  if (!iso) return "дата не указана";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso.slice(0, 10)}T12:00:00+03:00`));
}

function scheduleSortKey(row) {
  if (row.kind === "handover") return [3, Infinity];
  if (row.kind === "term-only") return [2, Infinity];
  if (row.confirmDate) return [0, dayIndex(row.confirmDate)];
  return [1, Infinity];
}

export function sortScheduleRows(rows) {
  return [...rows].sort((a, b) => {
    const [ka, da] = scheduleSortKey(a);
    const [kb, db] = scheduleSortKey(b);
    if (ka !== kb) return ka - kb;
    if (da !== db) return da - db;
    return a.category.localeCompare(b.category, "ru");
  });
}

export function buildScheduleRows(line, anchor = ACCRUAL_DEMO_ANCHOR) {
  if (line.waitingConfirmation <= 0) return [];
  if (line.handoverPending) {
    return [
      {
        lineId: line.id,
        direction: line.direction,
        directionLabel: DIRECTION_LABEL[line.direction],
        category: line.category,
        partner: line.partner,
        purchaseId: line.purchaseId || null,
        amount: line.waitingConfirmation,
        kind: "handover",
        label: "Ожидает передачи/принятия работ",
        confirmDate: null,
        days: null,
        termsDays: line.confirmDays,
        termsLabel: `Договорной срок подтверждения: ${line.confirmDays} дн. (дата начнётся после передачи)`,
      },
    ];
  }
  if (!line.confirmDate) {
    return [
      {
        lineId: line.id,
        direction: line.direction,
        directionLabel: DIRECTION_LABEL[line.direction],
        category: line.category,
        partner: line.partner,
        purchaseId: line.purchaseId || null,
        amount: line.waitingConfirmation,
        kind: "term-only",
        label: "Дата автоматического подтверждения ещё не определена",
        confirmDate: null,
        days: null,
        termsDays: line.confirmDays,
        termsLabel: `Договорной срок: ${line.confirmDays} дн.`,
      },
    ];
  }
  const days = daysUntil(anchor, line.confirmDate);
  return [
    {
      lineId: line.id,
      direction: line.direction,
      directionLabel: DIRECTION_LABEL[line.direction],
      category: line.category,
      partner: line.partner,
      purchaseId: line.purchaseId || null,
      amount: line.waitingConfirmation,
      kind: "countdown",
      label: `Автоматически подтвердится, если нет возврата или приостановления · ${formatMoscowDate(line.confirmDate)}`,
      confirmDate: line.confirmDate,
      days,
      termsDays: line.confirmDays,
      termsLabel: line.confirmDays === 0 ? "Срок 0 дн. · подтверждение в день расчёта" : `Договорной срок: ${line.confirmDays} дн.`,
    },
  ];
}

export function assertLineInvariant(line) {
  if (line.excluded) return;
  const fields = ["gross", "confirmedUnpaid", "waitingConfirmation", "suspended", "paid"];
  for (const key of fields) {
    if (!isValidRubles(line[key])) {
      throw new Error(`Line ${line.id}.${key} must be a non-negative integer ruble amount`);
    }
  }
  const historySum = (line.paidHistory || []).reduce((n, h) => n + h.amount, 0);
  if (historySum !== line.paid) {
    throw new Error(`Line ${line.id} paid ${line.paid} != history ${historySum}`);
  }
  for (const h of line.paidHistory || []) {
    if (!isValidRubles(h.amount)) throw new Error(`Line ${line.id} history amount invalid`);
  }
  const parts = line.confirmedUnpaid + line.waitingConfirmation + line.suspended + line.paid;
  if (parts !== line.gross) {
    throw new Error(`Line ${line.id} parts ${parts} != gross ${line.gross}`);
  }
  if (line.confirmDays === 0 && line.waitingConfirmation > 0 && line.confirmDate) {
    throw new Error(`Line ${line.id} zero-term waiting must not combine with dated countdown`);
  }
}

export function assertScenarioTotals(lines) {
  for (const line of lines) assertLineInvariant(line);
}

export function filterLinesByAccess(lines, allowedDirections) {
  const allowed = new Set(allowedDirections);
  return lines.filter((line) => line.excluded || allowed.has(line.direction));
}

export function summarizeDirection(lines, direction, anchor = ACCRUAL_DEMO_ANCHOR) {
  const scoped = lines.filter((line) => !line.excluded && line.direction === direction);
  const confirmedNow = scoped.reduce((n, line) => n + line.confirmedUnpaid, 0);
  const waiting = scoped.reduce((n, line) => n + line.waitingConfirmation, 0);
  const suspended = scoped.reduce((n, line) => n + line.suspended, 0);
  const paid = scoped.reduce((n, line) => n + line.paid, 0);
  const schedule = sortScheduleRows(scoped.flatMap((line) => buildScheduleRows(line, anchor)));
  const nearest = schedule.find((row) => row.kind === "countdown" && row.confirmDate);
  return { confirmedNow, waiting, suspended, paid, schedule, nearest, lines: scoped };
}

export function mergeSchedule(overview, allowedDirections) {
  const allowed = new Set(allowedDirections);
  const rows = [];
  if (allowed.has("in")) rows.push(...overview.receivable.schedule);
  if (allowed.has("out")) rows.push(...overview.payable.schedule);
  return sortScheduleRows(rows);
}

export function accrualOverview(lines, anchor = ACCRUAL_DEMO_ANCHOR, options = {}) {
  const active = filterLinesByAccess(lines, options.allowedDirections || ["in", "out"]);
  return {
    receivable: summarizeDirection(active, "in", anchor),
    payable: summarizeDirection(active, "out", anchor),
    excluded: lines.filter((l) => l.excluded),
  };
}

export function allowedDirections(incomingOnly) {
  return incomingOnly ? ["in"] : ["in", "out"];
}

export function findAccessibleLine(lines, lineId, incomingOnly) {
  const line = lines.find((l) => l.id === lineId && !l.excluded);
  if (!line) return null;
  if (incomingOnly && line.direction === "out") return null;
  return line;
}
