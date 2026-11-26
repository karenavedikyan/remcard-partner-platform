import type { ProProfileResponse } from "@/lib/types";

export type DoorOfferPartnerFields = {
  company: string;
  manager: string;
  phone: string;
  messenger: string;
  email: string;
  site: string;
  address: string;
  note: string;
  logo: string;
};

const DEFAULT_OFFER_NOTE =
  "Предложение рассчитано по данным замера. Окончательная стоимость подтверждается при оформлении заказа.";

export function doorOfferPartnerFromProfile(profile: ProProfileResponse): DoorOfferPartnerFields {
  const catalogOnOrg = profile.catalogPublication?.catalogEntity === "organization";
  const org = profile.organization;
  const user = profile.user;

  const company = catalogOnOrg
    ? org?.name?.trim() ?? ""
    : user.catalogDisplayName?.trim() || user.displayName?.trim() || "";
  const phone = (catalogOnOrg ? org?.publicPhone : user.publicPhone)?.trim() ?? "";
  const email = (catalogOnOrg ? org?.publicEmail : user.publicEmail)?.trim() ?? "";
  const site = (catalogOnOrg ? org?.website : user.website)?.trim() ?? "";
  const messenger = (catalogOnOrg ? org?.telegram : user.telegram)?.trim() ?? "";
  const logo = (catalogOnOrg ? org?.logoUrl : user.photoUrl)?.trim() ?? "";
  const manager = user.displayName?.trim() ?? "";
  const address = user.city?.trim() ?? "";

  return {
    company,
    manager,
    phone,
    messenger,
    email,
    site,
    address,
    note: DEFAULT_OFFER_NOTE,
    logo,
  };
}