/** URL → registry filter state (registration / partnerType only). */
export function registrationFromSearchParam(raw: string | null): string {
  return raw === "active" || raw === "demo" ? raw : "";
}

export function partnerTypeFromSearchParam(raw: string | null): string {
  return raw?.trim() ?? "";
}

export function urlRegistryFilterKey(searchParams: { get: (key: string) => string | null }): string {
  return `${searchParams.get("registration") ?? ""}|${searchParams.get("partnerType") ?? ""}`;
}

export function registryFiltersFromSearchParams(searchParams: {
  get: (key: string) => string | null;
}): { registration: string; partnerType: string } {
  return {
    registration: registrationFromSearchParam(searchParams.get("registration")),
    partnerType: partnerTypeFromSearchParam(searchParams.get("partnerType")),
  };
}
