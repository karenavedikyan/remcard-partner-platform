// Allowlist only: saved profile -> editable public draft, never account login or bank data.
export const hasCatalogValue = (value) =>
  Array.isArray(value)
    ? value.length > 0
    : typeof value === "boolean"
      ? value
      : String(value ?? "").trim().length > 0;
export function profileCatalogSeed(
  profile = {},
  { organization = false, specialist = false } = {},
) {
  const text = (key) => String(profile[key] ?? "").trim();
  const missing = (key) => profile[`no_${key}`] === true;
  return {
    publicName:
      text("publicName") ||
      (organization ? text("organization") : text("name")),
    city: text("city"),
    products: specialist ? [] : [...(profile.products || [])],
    services: [...(profile.services || [])],
    stages: [...(profile.stages || [])],
    specialistKind: specialist ? text("specialistKind") : "",
    specialistTitle: specialist ? text("specialistTitle") : "",
    description: text("description"),
    branchAddress: text("branchAddress"),
    publicPhone: missing("publicPhone")
      ? ""
      : text("publicPhone") ||
        (missing("contactPhone") ? "" : text("contactPhone")),
    publicEmail: missing("publicEmail")
      ? ""
      : text("publicEmail") ||
        (missing("contactEmail") ? "" : text("contactEmail")),
    website: missing("website") ? "" : text("website"),
    telegram: missing("telegram") ? "" : text("telegram"),
    no_publicPhone: missing("publicPhone"),
    no_publicEmail: missing("publicEmail"),
    no_website: missing("website"),
    no_telegram: missing("telegram"),
    showFullName: false,
    image: text("image"),
  };
}
