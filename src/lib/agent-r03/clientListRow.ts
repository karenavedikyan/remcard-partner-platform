import type { AgentClientRow } from "./types";

function certificateCountLabel(count: number): string {
  const n = Math.abs(count);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} сертификат`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} сертификата`;
  return `${n} сертификатов`;
}

/** Under client name (reference caption): task / purpose, then city fallback. */
export function clientRowCaption(client: AgentClientRow): string {
  const task = client.note?.trim();
  if (task) return task;
  return client.city?.trim() || "";
}

/** Mobile list subtitle: task · city (frozen reference list density). */
export function clientRowMobileSubtitle(client: AgentClientRow): string {
  const task = client.note?.trim();
  const city = client.city?.trim();
  if (task && city) return `${task} · ${city}`;
  return task || city || "Добавьте задачу в карточке";
}

/** Details column: certificate count + honest bonus placeholder (no totals API). */
export function clientRowDetail(client: AgentClientRow): string {
  const countPart =
    client.certificateCount > 0
      ? certificateCountLabel(client.certificateCount)
      : "Пока без сертификатов";
  return `${countPart} · бонус —`;
}

export function clientPurchaseStatusLabel(client: AgentClientRow, archivedView: boolean): string {
  if (archivedView) return "В архиве";
  if (client.hasPurchases === true) return "Есть покупки";
  if (client.hasPurchases === false) return "Пока без покупок";
  return "—";
}
