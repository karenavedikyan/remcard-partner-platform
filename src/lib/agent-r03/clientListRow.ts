import type { OwnerClientsAccessMode } from "@/components/clients/OwnerClientsModeContext";
import type { AgentClientRow } from "./types";

function certificateCountLabel(count: number): string {
  const n = Math.abs(count);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} сертификат`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} сертификата`;
  return `${n} сертификатов`;
}

function taskLine(client: AgentClientRow, mode: OwnerClientsAccessMode): string {
  if (mode === "specialist") {
    return client.need?.trim() || "";
  }
  return client.note?.trim() || "";
}

/** Under client name (reference caption): task / note, then city fallback. */
export function clientRowCaption(
  client: AgentClientRow,
  mode: OwnerClientsAccessMode = "agent",
): string {
  const task = taskLine(client, mode);
  if (task) return task;
  return client.city?.trim() || "";
}

/** Mobile list subtitle: city · task (frozen reference collection detail order). */
export function clientRowMobileSubtitle(
  client: AgentClientRow,
  mode: OwnerClientsAccessMode = "agent",
): string {
  const task = taskLine(client, mode);
  const city = client.city?.trim();
  if (city && task) return `${city} · ${task}`;
  return city || task || (mode === "specialist" ? "Добавьте задачу в карточке" : "Добавьте задачу в карточке");
}

/** Details column: certificate count; agent keeps bonus placeholder. */
export function clientRowDetail(
  client: AgentClientRow,
  mode: OwnerClientsAccessMode = "agent",
): string {
  const countPart =
    client.certificateCount > 0
      ? certificateCountLabel(client.certificateCount)
      : "Пока без сертификатов";
  if (mode === "specialist") return countPart;
  return `${countPart} · бонус —`;
}

export function clientPurchaseStatusLabel(client: AgentClientRow, archivedView: boolean): string {
  if (archivedView) return "В архиве";
  if (client.hasPurchases === true) return "Есть покупки";
  if (client.hasPurchases === false) return "Пока без покупок";
  return "—";
}
