import type { CertificateRecommendationIssuerMissingField } from "@/lib/certificate-types";

export const PROFILE_FOCUS_TARGETS = [
  "displayName",
  "city",
  "agentActivity",
  "directions",
] as const;

export type ProfileFocusTarget = (typeof PROFILE_FOCUS_TARGETS)[number];

const PROFILE_FOCUS_SET = new Set<string>(PROFILE_FOCUS_TARGETS);

export function parseProfileFocusFromQuery(raw: string | null | undefined): ProfileFocusTarget | undefined {
  const value = raw?.trim();
  if (!value || !PROFILE_FOCUS_SET.has(value)) return undefined;
  return value as ProfileFocusTarget;
}

export function profileFocusForIssuerCode(
  code: CertificateRecommendationIssuerMissingField["code"],
): ProfileFocusTarget {
  switch (code) {
    case "publicName":
      return "displayName";
    case "city":
      return "city";
    case "directionOrAgent":
      return "directions";
    default:
      return "directions";
  }
}

export function profileHrefForIssuerFocus(
  returnTo: string,
  focus: ProfileFocusTarget,
): string {
  const params = new URLSearchParams();
  params.set("returnTo", returnTo);
  params.set("section", "basics");
  params.set("focus", focus);
  return `/profile?${params.toString()}`;
}

export function profileHrefForIssuerMissing(
  code: CertificateRecommendationIssuerMissingField["code"],
  returnTo: string,
): string {
  return profileHrefForIssuerFocus(returnTo, profileFocusForIssuerCode(code));
}

export function ctaLabelForIssuerCode(
  code: CertificateRecommendationIssuerMissingField["code"],
): string {
  return code === "directionOrAgent" ? "Выбрать в профиле" : "Заполнить в профиле";
}

export function ctaLabelForIssuerFocus(focus: ProfileFocusTarget): string {
  if (focus === "agentActivity") return "Указать агента в профиле";
  if (focus === "directions") return "Выбрать специализацию";
  return "Заполнить в профиле";
}

export function resolveFocusableElement(root: Element): HTMLElement | null {
  if (root instanceof HTMLElement && root.matches("input, textarea, select, button")) {
    return root;
  }
  const nested = root.querySelector("input, textarea, select, button");
  return nested instanceof HTMLElement ? nested : null;
}
