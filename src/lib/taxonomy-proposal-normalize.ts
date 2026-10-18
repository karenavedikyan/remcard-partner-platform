export function cleanTaxonomyProposalText(value: string): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeTaxonomyProposalKey(value: string): string {
  return cleanTaxonomyProposalText(value)
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е");
}
