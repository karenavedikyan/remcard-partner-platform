import type { CertificatePolicyTerms } from "./types";

export function certificatePolicyDaysWord(count: number): string {
  return pluralRu(count, "день", "дня", "дней");
}

export function certificatePolicyPurchasesWord(count: number): string {
  return pluralRu(count, "покупка", "покупки", "покупок");
}

export function certificatePolicyPurchaseMode(count: number): string {
  return count === 1 ? "разовый" : "многоразовый";
}

export function certificatePolicyPurchaseChip(count: number): string {
  return count === 1 ? "Разовый" : `${count} ${certificatePolicyPurchasesWord(count)}`;
}

export function certificatePolicyRubles(amount: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(amount)} ₽`;
}

export function certificatePolicyChipLabels(terms: Pick<
  CertificatePolicyTerms,
  "promotionsCompatible" | "minimumPurchaseAmount"
>): string[] {
  const list = [
    terms.promotionsCompatible
      ? "Суммируется со скидками"
      : "Не суммируется со скидками",
  ];
  if (terms.minimumPurchaseAmount != null && terms.minimumPurchaseAmount > 0) {
    list.push(`Покупка от ${certificatePolicyRubles(terms.minimumPurchaseAmount)}`);
  }
  return list;
}

export function certificatePolicyLimitsSummary(terms: Pick<
  CertificatePolicyTerms,
  "minimumPurchaseAmount" | "promotionsCompatible"
>): string {
  const min =
    terms.minimumPurchaseAmount != null && terms.minimumPurchaseAmount > 0
      ? `от ${certificatePolicyRubles(terms.minimumPurchaseAmount)}`
      : "без минимума";
  const prom = terms.promotionsCompatible ? "суммируется" : "не суммируется";
  return `${min} · ${prom}`;
}

export function certificatePolicyMaxPoolPercent(
  categoryRates: CertificatePolicyTerms["categoryRates"],
): number | null {
  const values = categoryRates
    .map((r) => r.poolPercent)
    .filter((v) => Number.isFinite(v));
  if (!values.length) return null;
  return Math.max(...values);
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 10;
  const b = Math.abs(n) % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
}