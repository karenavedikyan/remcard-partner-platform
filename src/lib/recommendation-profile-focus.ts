import type { CertificateRecommendationIssuerMissingField } from "@/lib/certificate-types";

export type ProfileFocusTarget = "displayName" | "city" | "agentActivity" | "directions";

export function profileFocusForIssuerCode(
  code: CertificateRecommendationIssuerMissingField["code"],
): ProfileFocusTarget {
  switch (code) {
    case "publicName":
      return "displayName";
    case "city":
      return "city";
    case "directionOrAgent":
      return "agentActivity";
    default:
      return "directions";
  }
}

export function profileHrefForIssuerMissing(
  code: CertificateRecommendationIssuerMissingField["code"],
  returnTo: string,
): string {
  const params = new URLSearchParams();
  params.set("returnTo", returnTo);
  params.set("section", "basics");
  params.set("focus", profileFocusForIssuerCode(code));
  return `/profile?${params.toString()}`;
}

export function ctaLabelForIssuerCode(
  code: CertificateRecommendationIssuerMissingField["code"],
): string {
  return code === "directionOrAgent" ? "Выбрать в профиле" : "Заполнить в профиле";
}
