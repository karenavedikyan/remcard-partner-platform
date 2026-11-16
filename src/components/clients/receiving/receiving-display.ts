/** Shared presentation helpers for the receiving list and card (prototype `stagePillClass`, `sourceDisplay`). */

import { systemStageAliasOf } from "./receiving-detail-stage-model";

/**
 * `stagePillClass` mapping of the frozen client-appeals prototype. The caption is part of the identity:
 * a status named like a system one («Новое обращение») gets the system style everywhere, so the same
 * status never renders in two colours across the list, card, filter and history.
 */
export function stagePillClass(stageId: string, label?: string | null): string {
  const id = systemStageAliasOf(stageId, label) ?? stageId;
  if (id === "sys_refused") return "ca-pill--danger";
  if (id === "sys_return") return "ca-pill--warn";
  if (id === "sys_paid" || id === "sys_shipped") return "ca-pill--good";
  return id === "sys_new" ? "" : "ca-pill--info";
}

/** Class list of the one status badge used by the list, the card, the observer and the stage settings. */
export function stageBadgeClassName(stageId: string, label?: string | null): string {
  return ["pill", stagePillClass(stageId, label)].filter(Boolean).join(" ");
}

const DATE_ONLY = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Moscow",
});

export function formatCardDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : DATE_ONLY.format(d);
}

/** `YYYY-MM-DD` of an instant in Moscow time — the day boundary users and the public certificate share. */
export function toMoscowDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(date);
}

/** ISO instant for a calendar day chosen in the card (noon MSK keeps the day stable in every zone). */
export function moscowNoonIso(day: string): string {
  return new Date(`${day}T12:00:00+03:00`).toISOString();
}
