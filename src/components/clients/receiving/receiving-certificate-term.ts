import { formatCardDate } from "./receiving-display";

/** Server projection of the frozen per-recipient certificate term (same model as the public page and the red card). */
export type ReceivingCertificateTerm = {
  validUntil: string;
  purchaseLimit: number | null;
  consumedUses: number;
  remainingPurchases: number | null;
};

export type CertificateTermRow = { label: string; value: string };

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = Math.abs(n) % 10;
  const mod100 = Math.abs(n) % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function purchaseCountLabel(count: number): string {
  return `${count} ${pluralRu(count, "покупка", "покупки", "покупок")}`;
}

function purchasesText(term: ReceivingCertificateTerm): string | null {
  const consumed = Math.max(0, term.consumedUses);
  const limit = term.purchaseLimit;
  if (limit == null) return consumed > 0 ? purchaseCountLabel(consumed) : null;
  const remaining = term.remainingPurchases ?? Math.max(0, limit - consumed);
  return consumed > 0 || remaining <= 0
    ? `${purchaseCountLabel(limit)} · ${remaining > 0 ? `осталось ${remaining}` : "все использованы"}`
    : purchaseCountLabel(limit);
}

/**
 * Rows of the «Сертификат» card for the receiving partner: the frozen term and this partner's purchases.
 * A legacy certificate without a frozen policy keeps the certificate-level date; «—» only when no term exists.
 */
export function certificateTermRows(input: {
  term?: ReceivingCertificateTerm | null;
  legacyValidUntil?: string | null;
  now?: Date;
}): CertificateTermRow[] {
  const now = input.now ?? new Date();
  const term = input.term ?? null;
  if (term) {
    const until = new Date(term.validUntil);
    const date = formatCardDate(term.validUntil);
    const expired = !Number.isNaN(until.getTime()) && until.getTime() < now.getTime();
    const rows: CertificateTermRow[] = [
      { label: expired ? "Срок истёк" : "Действует до", value: date || "—" },
    ];
    const purchases = purchasesText(term);
    if (purchases) rows.push({ label: "Покупки", value: purchases });
    return rows;
  }
  return [{ label: "Действует до", value: formatCardDate(input.legacyValidUntil) || "—" }];
}
