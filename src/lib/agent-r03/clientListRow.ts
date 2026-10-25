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

function specialistDetailLine(client: AgentClientRow): string {
  const city = client.city?.trim();
  const need = client.need?.trim();
  if (city && need) return `${city} · ${need}`;
  return city || need || "Добавьте задачу в карточке";
}

/** Under client name in collection table/cards. */
export function clientRowCaption(
  client: AgentClientRow,
  mode: OwnerClientsAccessMode = "agent",
): string {
  if (mode === "specialist" || mode === "business") {
    if (mode === "business") {
      const task = client.note?.trim();
      if (task) return task;
      return client.city?.trim() || "";
    }
    return client.certificateCount > 0
      ? certificateCountLabel(client.certificateCount)
      : "Пока без сертификатов";
  }
  const task = client.note?.trim();
  if (task) return task;
  return client.city?.trim() || "";
}

/** Collection «Подробности» column or card detail line. */
export function clientRowDetail(
  client: AgentClientRow,
  mode: OwnerClientsAccessMode = "agent",
): string {
  if (mode === "specialist") {
    return specialistDetailLine(client);
  }
  if (mode === "business") {
    return client.certificateCount > 0
      ? certificateCountLabel(client.certificateCount)
      : "Пока без сертификатов";
  }
  const countPart =
    client.certificateCount > 0
      ? certificateCountLabel(client.certificateCount)
      : "Пока без сертификатов";
  return `${countPart} · бонус —`;
}

/** Mobile list subtitle. */
export function clientRowMobileSubtitle(
  client: AgentClientRow,
  mode: OwnerClientsAccessMode = "agent",
): string {
  if (mode === "specialist" || mode === "business") {
    if (mode === "business") {
      const city = client.city?.trim();
      const task = client.note?.trim();
      if (city && task) return `${city} · ${task}`;
      return city || task || "Добавьте заметку в карточке";
    }
    return specialistDetailLine(client);
  }
  const task = client.note?.trim();
  const city = client.city?.trim();
  if (city && task) return `${city} · ${task}`;
  return city || task || "Добавьте задачу в карточке";
}

/** Secondary mobile line (specialist: certificate count). */
export function clientRowMobileMeta(
  client: AgentClientRow,
  mode: OwnerClientsAccessMode = "agent",
): string {
  if (mode === "specialist" || mode === "business") {
    if (mode === "business") {
      return client.certificateCount > 0
        ? certificateCountLabel(client.certificateCount)
        : "Пока без сертификатов";
    }
    return client.certificateCount > 0
      ? certificateCountLabel(client.certificateCount)
      : "Пока без сертификатов";
  }
  return clientRowDetail(client, mode);
}

export function clientPurchaseStatusLabel(client: AgentClientRow, archivedView: boolean): string {
  if (archivedView) return "В архиве";
  if (client.hasPurchases === true) return "Есть покупки";
  if (client.hasPurchases === false) return "Пока без покупок";
  return "—";
}
