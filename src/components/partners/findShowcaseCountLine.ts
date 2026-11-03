/** Russian plural forms (prototype partners-redesign.js plural()). */
export function russianPlural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export function formatFindShowcasePartnerTotal(partnerTotal: number): string {
  return `${partnerTotal} ${russianPlural(partnerTotal, "партнёр", "партнёра", "партнёров")}`;
}

export function formatFindShowcaseCountLine(partnerTotal: number, openTotal: number): string {
  return `${formatFindShowcasePartnerTotal(partnerTotal)} · ${openTotal} ${russianPlural(openTotal, "открыт", "открыты", "открыты")} к сотрудничеству`;
}
