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

export function emptyWeekSchedule(): Record<BranchDayKey, BranchDaySchedule> {
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

export function parseBranchWorkingHours(raw: string | null | undefined):
  | { mode: "grid"; days: Record<BranchDayKey, BranchDaySchedule> }
  | { mode: "legacy"; text: string } {
  const text = raw?.trim() ?? "";
  if (!text) return { mode: "grid", days: emptyWeekSchedule() };
  const parts = text.split(/[,;]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { mode: "legacy", text };
  const days = emptyWeekSchedule();
  let matched = 0;
  for (const part of parts) {
    const m = part.match(LEGACY_DAY_RE);
    if (!m) continue;
    const abbrev = m[1]!.toLowerCase();
    const key = (Object.entries(BRANCH_DAY_LABELS).find(([, v]) => v === abbrev)?.[0] ??
      null) as BranchDayKey | null;
    if (!key) continue;
    matched += 1;
    if (part.toLowerCase().includes("выходной")) {
      days[key] = { ...days[key], closed: true };
    } else {
      days[key] = {
        closed: false,
        open: normalizeTime(m[2]!),
        close: normalizeTime(m[3]!),
      };
    }
  }
  if (matched >= 3) return { mode: "grid", days };
  return { mode: "legacy", text };
}

function normalizeTime(t: string): string {
  const [h, m] = t.split(":");
  return `${h!.padStart(2, "0")}:${m!.padStart(2, "0")}`;
}

export function formatWorkingHoursShort(raw: string | null | undefined): string {
  const text = raw?.trim();
  if (!text) return "—";
  if (text.length <= 48) return text;
  return `${text.slice(0, 45)}…`;
}
