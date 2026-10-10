/** Same tokenization as ProfileEditor «Территории обслуживания» textarea. */
const AREAS_TEXT_SPLIT = /[\n,;]+/;

/** Parse free-text field into territory tokens (trim, drop empties). */
export function parseAreasFromText(text: string): string[] {
  return text
    .split(AREAS_TEXT_SPLIT)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Flatten server/working `areas` arrays (legacy rows may store comma-separated cities in one element).
 */
export function normalizeAreasList(raw: string[] | null | undefined): string[] {
  const out: string[] = [];
  for (const item of raw ?? []) {
    if (typeof item !== "string") continue;
    for (const part of parseAreasFromText(item)) {
      out.push(part);
    }
  }
  return out;
}

/** Canonical textarea value after load / applyProfile / save. */
export function formatAreasForTextField(raw: string[] | null | undefined): string {
  return normalizeAreasList(raw).join("\n");
}

/** Same source rule as legacy `(w?.areas ?? u.areas ?? [])`. */
export function resolveWorkingAreasForDraft(
  workingProfile: { areas?: string[] } | null | undefined,
  userAreas: string[] | null | undefined,
): string[] {
  return normalizeAreasList(workingProfile?.areas ?? userAreas ?? []);
}
