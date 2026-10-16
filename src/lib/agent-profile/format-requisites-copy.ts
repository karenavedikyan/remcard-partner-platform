import type { AgentRequisitesItem } from "./types";

const KIND_LABELS: Record<string, string> = {
  person: "Физическое лицо",
  ip: "ИП",
  company: "Юридическое лицо",
};

/** Full requisites text for clipboard / manual fallback (requires unmasked account fields when present). */
export function formatRequisitesCopyText(item: AgentRequisitesItem): string {
  const lines: string[] = [];
  if (item.label?.trim()) lines.push(`Название: ${item.label.trim()}`);
  lines.push(item.legalName);
  lines.push(KIND_LABELS[item.kind] ?? item.kind);
  if (item.inn) lines.push(`ИНН ${item.inn}`);
  if (item.kpp) lines.push(`КПП ${item.kpp}`);
  if (item.bankName) lines.push(item.bankName);
  if (item.bik) lines.push(`БИК ${item.bik}`);
  const account = item.accountNumber ?? item.accountNumberMasked;
  if (account) lines.push(`Р/с ${account}`);
  const corr = item.corrAccount ?? item.corrAccountMasked;
  if (corr) lines.push(`К/с ${corr}`);
  return lines.join("\n");
}

export function hasFullRequisitesForCopy(item: AgentRequisitesItem): boolean {
  const account = item.accountNumber?.replace(/\D/g, "") ?? "";
  return account.length >= 10;
}
