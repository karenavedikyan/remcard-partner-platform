/** P3 nav/back helpers (aligned with P4 @ 9d22694f — owned here to avoid editing P4 view). */

export type ObserverClientBackFrom = "partner-clients" | "partners-list" | "flat-list";

export function resolveObserverClientBackLabel(
  backFrom?: ObserverClientBackFrom,
  backLabel?: string,
): string {
  if (backLabel) return backLabel;
  if (backFrom === "partner-clients") return "← К списку клиентов";
  if (backFrom === "partners-list") return "← К партнёрам";
  if (backFrom === "flat-list") return "← Назад к списку";
  return "← Назад";
}

export type ObserverClientBackFromInput = {
  navPartnerId?: string;
  layout?: "partners" | "list";
};

export function resolveObserverClientBackFrom(
  input: ObserverClientBackFromInput,
): ObserverClientBackFrom {
  if (input.navPartnerId) return "partner-clients";
  if (input.layout === "list") return "flat-list";
  return "partners-list";
}

export type ObserverClientNavSlice = { partnerId?: string };

export function observerClientBackFrom(
  clientNav: ObserverClientNavSlice,
  layout: "partners" | "list",
): ObserverClientBackFrom {
  return resolveObserverClientBackFrom({ navPartnerId: clientNav.partnerId, layout });
}
