import { RemcardApiError, remcardFetch } from "@/lib/api-client";

export const BRANCH_CONTACT_KINDS = [
  "telegram",
  "max",
  "vk",
  "yandex",
  "phone",
  "email",
  "site",
  "whatsapp",
] as const;

export type BranchContactKind = (typeof BRANCH_CONTACT_KINDS)[number];

export type BranchContactChannel = {
  isActive: boolean;
  value: string;
};

export type BranchContactsForm = Record<BranchContactKind, BranchContactChannel>;

export type BranchPublicContactRow = {
  type: string;
  value: string;
  isActive: boolean;
};

export type OrgPublicContactRow = {
  type: string;
  value: string;
  isActive?: boolean;
};

export function emptyBranchContactsForm(): BranchContactsForm {
  return Object.fromEntries(
    BRANCH_CONTACT_KINDS.map((k) => [k, { isActive: false, value: "" }]),
  ) as BranchContactsForm;
}

export function branchContactsFromRows(rows: BranchPublicContactRow[]): BranchContactsForm {
  const form = emptyBranchContactsForm();
  for (const row of rows) {
    const kind = row.type as BranchContactKind;
    if (!BRANCH_CONTACT_KINDS.includes(kind)) continue;
    form[kind] = { isActive: row.isActive !== false, value: row.value ?? "" };
  }
  return form;
}

export function orgContactsToSelectable(rows: OrgPublicContactRow[]): OrgPublicContactRow[] {
  return rows.filter((r) => r.value?.trim() && r.isActive !== false);
}

export async function persistBranchPublicContacts(
  branchId: string,
  form: BranchContactsForm,
): Promise<void> {
  const channels: Record<string, { isActive: boolean; value: string }> = {};
  for (const kind of BRANCH_CONTACT_KINDS) {
    channels[kind] = {
      isActive: form[kind].isActive,
      value: form[kind].value.trim(),
    };
  }
  await remcardFetch(
    `/api/pro/organization/branches/${encodeURIComponent(branchId)}/public-contacts`,
    { method: "PATCH", body: { channels } },
  );
}

export function mergeSelectedOrgContacts(
  current: BranchContactsForm,
  orgRows: OrgPublicContactRow[],
  selectedTypes: string[],
): BranchContactsForm {
  const next = { ...current };
  for (const kind of selectedTypes) {
    const row = orgRows.find((r) => r.type === kind);
    if (!row?.value?.trim()) continue;
    if (!BRANCH_CONTACT_KINDS.includes(kind as BranchContactKind)) continue;
    next[kind as BranchContactKind] = { isActive: true, value: row.value.trim() };
  }
  return next;
}

export function hasAnyActiveBranchContact(form: BranchContactsForm): boolean {
  return BRANCH_CONTACT_KINDS.some((k) => form[k].isActive && form[k].value.trim());
}

export function contactSaveErrorMessage(caught: unknown): string {
  if (caught instanceof RemcardApiError) {
    const body = caught.body as { fieldErrors?: { field: string; message: string }[] } | undefined;
    const first = body?.fieldErrors?.[0]?.message;
    return first ?? caught.message;
  }
  return "Не удалось сохранить контакты";
}
