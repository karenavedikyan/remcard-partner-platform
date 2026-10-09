export type BranchDayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type BranchDaySchedule = {
  closed: boolean;
  open: string;
  close: string;
};

export const BRANCH_DAY_ORDER: BranchDayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const BRANCH_DAY_LABELS: Record<BranchDayKey, string> = {
  mon: "пн",
  tue: "вт",
  wed: "ср",
  thu: "чт",
  fri: "пт",
  sat: "сб",
  sun: "вс",
};

export function weekTemplateSchedule(): Record<BranchDayKey, BranchDaySchedule> {
  return {
    mon: { closed: false, open: "09:00", close: "18:00" },
    tue: { closed: false, open: "09:00", close: "18:00" },
    wed: { closed: false, open: "09:00", close: "18:00" },
    thu: { closed: false, open: "09:00", close: "18:00" },
    fri: { closed: false, open: "09:00", close: "18:00" },
    sat: { closed: true, open: "10:00", close: "16:00" },
    sun: { closed: true, open: "10:00", close: "16:00" },
  };
}

/** @deprecated use weekTemplateSchedule for explicit user template action */
export function emptyWeekSchedule(): Record<BranchDayKey, BranchDaySchedule> {
  return weekTemplateSchedule();
}

export function serializeBranchWorkingHours(days: Record<BranchDayKey, BranchDaySchedule>): string {
  return BRANCH_DAY_ORDER.map((key) => {
    const label = BRANCH_DAY_LABELS[key];
    const d = days[key];
    if (d.closed) return `${label} выходной`;
    return `${label} ${d.open}–${d.close}`;
  }).join(", ");
}

const LEGACY_DAY_RE =
  /^(пн|вт|ср|чт|пт|сб|вс)\s+(?:выходной|(\d{1,2}:\d{2})[–-](\d{1,2}:\d{2}))/i;

function normalizeTime(t: string): string {
  const [h, m] = t.split(":");
  return `${h!.padStart(2, "0")}:${m!.padStart(2, "0")}`;
}

function validateTimeToken(hhRaw: string, mmRaw: string): boolean {
  const hh = Number(hhRaw);
  const mm = Number(mmRaw);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false;
  return hh <= 23 && mm <= 59;
}

function validateRangePair(open: string, close: string): boolean {
  const [oh, om] = open.split(":");
  const [ch, cm] = close.split(":");
  if (!validateTimeToken(oh!, om!) || !validateTimeToken(ch!, cm!)) return false;
  const openM = Number(oh) * 60 + Number(om);
  const closeM = Number(ch) * 60 + Number(cm);
  return closeM > openM;
}

export function validateBranchWorkingHoursText(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  const timeRe = /\b(\d{1,2}):(\d{2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = timeRe.exec(trimmed)) !== null) {
    if (!validateTimeToken(m[1]!, m[2]!)) {
      return `Некорректное время: ${m[1]}:${m[2]}`;
    }
  }
  const rangeRe = /(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/g;
  let r: RegExpExecArray | null;
  while ((r = rangeRe.exec(trimmed)) !== null) {
    if (!validateRangePair(r[1]!, r[2]!)) {
      return `Некорректный интервал: ${r[1]}–${r[2]}`;
    }
  }
  return null;
}

export function parseBranchWorkingHours(raw: string | null | undefined):
  | { mode: "empty" }
  | { mode: "grid"; days: Record<BranchDayKey, BranchDaySchedule> }
  | { mode: "legacy"; text: string } {
  const text = raw?.trim() ?? "";
  if (!text) return { mode: "empty" };
  if (/перерыв/i.test(text)) return { mode: "legacy", text };

  const parts = text.split(/[,;]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { mode: "legacy", text };

  const days = weekTemplateSchedule();
  const seen = new Set<BranchDayKey>();
  let matched = 0;

  for (const part of parts) {
    const m = part.match(LEGACY_DAY_RE);
    if (!m) return { mode: "legacy", text };
    const abbrev = m[1]!.toLowerCase();
    const key = (Object.entries(BRANCH_DAY_LABELS).find(([, v]) => v === abbrev)?.[0] ??
      null) as BranchDayKey | null;
    if (!key || seen.has(key)) return { mode: "legacy", text };
    seen.add(key);
    matched += 1;
    if (part.toLowerCase().includes("выходной")) {
      days[key] = { ...days[key], closed: true };
    } else {
      const open = normalizeTime(m[2]!);
      const close = normalizeTime(m[3]!);
      if (!validateRangePair(open, close)) return { mode: "legacy", text };
      days[key] = { closed: false, open, close };
    }
  }

  if (matched === 7) return { mode: "grid", days };
  return { mode: "legacy", text };
}

export function formatWorkingHoursShort(raw: string | null | undefined): string {
  const text = raw?.trim();
  if (!text) return "—";
  if (text.length <= 48) return text;
  return `${text.slice(0, 45)}…`;
}
