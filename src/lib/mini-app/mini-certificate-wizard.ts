import type { AvailablePartner } from "@/lib/certificate-types";
import { categoryFieldKey, isCategoryIssuable } from "@/lib/certificate-percent";
import { partnerSelectionKey } from "@/lib/specialist-certificate-create-ui";
import type { MiniAppBootstrap } from "@/lib/mini-app/types";

export function filterSelectablePartners(partners: AvailablePartner[]): AvailablePartner[] {
  return partners.filter(
    (p) =>
      p.programReady !== false &&
      p.categories.length > 0 &&
      !p.categories.every((c) => c.issuable === false),
  );
}

export function countIssuableCategories(partners: AvailablePartner[]): number {
  let n = 0;
  for (const partner of partners) {
    n += partner.categories.filter((c) => isCategoryIssuable(c, partner.isSelfScan)).length;
  }
  return n;
}

/**
 * Two-step wizard only when the role and program shape benefit from it — never for a forced
 * multi-branch picker (branch stays on the home screen).
 */
export function miniCertificateUsesWizard(
  role: MiniAppBootstrap["role"],
  selectable: AvailablePartner[],
): boolean {
  if (role === "specialist" || role === "agent") {
    return true;
  }
  if (selectable.length > 1) {
    return true;
  }
  if (selectable.length === 1) {
    const issuable = selectable[0].categories.filter((c) =>
      isCategoryIssuable(c, selectable[0].isSelfScan),
    );
    return issuable.length > 1;
  }
  return false;
}

export function miniCertificateCategoryKeySet(partners: AvailablePartner[]): Set<string> {
  const keys = new Set<string>();
  for (const partner of partners) {
    for (const cat of partner.categories) {
      if (isCategoryIssuable(cat, partner.isSelfScan)) {
        keys.add(categoryFieldKey(partner.storeUserId, cat.category));
      }
    }
  }
  return keys;
}

export function miniCertificatePartnerKeySet(partners: AvailablePartner[]): Set<string> {
  return new Set(selectablePartnersKeys(partners));
}

function selectablePartnersKeys(partners: AvailablePartner[]): string[] {
  return filterSelectablePartners(partners).map((p) => partnerSelectionKey(p));
}

export function miniCertificateRequireTenthStep(role: MiniAppBootstrap["role"]): boolean {
  return role === "specialist";
}

export function branchLabelForCreate(
  bootstrap: MiniAppBootstrap,
  branchId: string | null,
): string | null {
  if (!branchId) return null;
  const match = bootstrap.branches.find((b) => b.id === branchId);
  return match?.label?.trim() || null;
}