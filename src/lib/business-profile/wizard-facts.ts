import { formatPhoneForDisplay } from "@/lib/contact-phone-display";
import { displayCategoryLabel } from "@/lib/category-display";
import { masterDirectionLabel } from "@/lib/master-direction-label";
import type { ProfileDraft } from "@/lib/profile-save";
import type { PartnerTaxonomyItem, WorkingPrimaryDirection } from "@/lib/types";
import type { BusinessWizardCopy } from "./wizard-copy";

export type BusinessFactRow = { term: string; value: string };

function displayOrEmpty(value: string | undefined | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "Не указано";
}

export function buildBusinessDirectionLabelMap(items: {
  products?: PartnerTaxonomyItem[];
  services?: PartnerTaxonomyItem[];
  stages?: PartnerTaxonomyItem[];
}): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items.products ?? []) {
    map.set(`product:${item.id}`, `Товар: ${item.label}`);
  }
  for (const item of items.services ?? []) {
    map.set(`service:${item.id}`, `Услуга: ${item.label}`);
  }
  for (const item of items.stages ?? []) {
    map.set(`stage:${item.id}`, `Этап: ${item.label}`);
  }
  return map;
}

export function businessDirectionChipLabel(
  kind: "product" | "service" | "stage",
  id: string,
  labelByKey?: Map<string, string>,
): string {
  const key = `${kind === "product" ? "product" : kind === "service" ? "service" : "stage"}:${id}`;
  const fromTaxonomy = labelByKey?.get(key);
  if (fromTaxonomy) return fromTaxonomy;
  if (kind === "product") return `Товар: ${displayCategoryLabel(id, id)}`;
  if (kind === "service") return `Услуга: ${masterDirectionLabel(id)}`;
  return `Этап: ${masterDirectionLabel(id)}`;
}

const WORK_MODE_LABELS: Record<string, string> = {
  ON_SITE: "По адресу",
  MOBILE: "На выезде",
  BOTH: "По адресу и на выезде",
  ONLINE: "Онлайн",
};

export function businessWorkingProfileFactRows(
  draft: ProfileDraft,
  copy: BusinessWizardCopy,
  options?: {
    labelByKey?: Map<string, string>;
    areasText?: string;
  },
): BusinessFactRow[] {
  const rows: BusinessFactRow[] = [
    { term: "Организация", value: displayOrEmpty(draft.organizationName) },
    { term: "Представитель", value: displayOrEmpty(draft.displayName) },
    { term: "Город", value: displayOrEmpty(draft.city) },
    {
      term: "Телефон",
      value: displayOrEmpty(
        draft.partnershipContactPhone
          ? formatPhoneForDisplay(draft.partnershipContactPhone)
          : "",
      ),
    },
    { term: "Email", value: displayOrEmpty(draft.partnershipContactEmail) },
  ];

  const website = draft.website?.trim();
  if (website) rows.push({ term: "Сайт", value: website });

  const telegram = draft.telegram?.trim();
  if (telegram) rows.push({ term: "Telegram", value: telegram });

  const workMode = draft.partnerWorkMode?.trim();
  if (workMode && WORK_MODE_LABELS[workMode]) {
    rows.push({ term: "Формат работы", value: WORK_MODE_LABELS[workMode] });
  }

  const areas =
    options?.areasText?.trim() ||
    (draft.areas?.length ? draft.areas.join(", ") : "");
  if (areas) rows.push({ term: "Территория работы", value: areas });

  const contactPerson = draft.partnershipContactName?.trim();
  if (contactPerson) rows.push({ term: "Контактное лицо", value: contactPerson });

  return rows;
}

export function businessWorkingProfileDirectionLabels(
  draft: Pick<
    ProfileDraft,
    "productCategoryIds" | "serviceSpecializationIds" | "navigatorStageIds"
  >,
  labelByKey?: Map<string, string>,
): string[] {
  const out: string[] = [];
  for (const id of draft.productCategoryIds) {
    out.push(businessDirectionChipLabel("product", id, labelByKey));
  }
  for (const id of draft.serviceSpecializationIds) {
    out.push(businessDirectionChipLabel("service", id, labelByKey));
  }
  for (const id of draft.navigatorStageIds) {
    out.push(businessDirectionChipLabel("stage", id, labelByKey));
  }
  return out;
}

export function businessSummaryInitials(draft: ProfileDraft): string {
  const source = draft.organizationName.trim() || draft.displayName.trim() || "?";
  return source.slice(0, 2).toUpperCase();
}

export function primaryDirectionLabel(
  primary: WorkingPrimaryDirection | null,
  labelByKey?: Map<string, string>,
): string | null {
  if (!primary) return null;
  return businessDirectionChipLabel(primary.kind, primary.id, labelByKey);
}
