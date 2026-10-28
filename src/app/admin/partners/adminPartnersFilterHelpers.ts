export type RegistryFilterFields = {
  registration: string;
  partnerType: string;
  city: string;
  catalog: string;
  archived: string;
};

export function countActiveRegistryFilters(fields: RegistryFilterFields): number {
  let n = 0;
  if (fields.registration) n += 1;
  if (fields.partnerType) n += 1;
  if (fields.city.trim()) n += 1;
  if (fields.catalog) n += 1;
  if (fields.archived) n += 1;
  return n;
}

export const EMPTY_REGISTRY_FILTERS: RegistryFilterFields = {
  registration: "",
  partnerType: "",
  city: "",
  catalog: "",
  archived: "",
};
