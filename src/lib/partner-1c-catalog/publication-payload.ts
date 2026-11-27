import type { PublicationState } from "./models";

/** POST /api/pro/organization/partner-products/publication */
export function partnerProductsPublicationBody(
  modelId: string,
  branchId: string,
  excluded: boolean,
) {
  return {
    modelId,
    branches: [{ branchId, excluded }],
  };
}

/** POST /api/pro/organization/partner-products/branch-prices */
export function partnerProductsBranchPricesBody(
  modelId: string,
  branchId: string,
  customPrice: number | null,
) {
  return {
    modelId,
    branches: [{ branchId, customPrice }],
  };
}

/** POST /api/pro/organization/partner-products/branch-rules */
export function partnerProductsBranchRulesBody(branchId: string, adjustPercent: number) {
  return {
    branches: [{ branchId, adjustPercent }],
  };
}

export function collectBranchPricePayloads(
  pub: PublicationState,
  modelId: string,
): ReturnType<typeof partnerProductsBranchPricesBody>[] {
  const prices = pub.branchPrice.get(modelId);
  if (!prices) return [];
  return Object.entries(prices).map(([branchId, customPrice]) =>
    partnerProductsBranchPricesBody(modelId, branchId, customPrice),
  );
}

export function collectBranchRulePayloads(
  pub: PublicationState,
): ReturnType<typeof partnerProductsBranchRulesBody>[] {
  return Object.entries(pub.branchPct)
    .filter(([, pct]) => pct !== 0)
    .map(([branchId, adjustPercent]) => partnerProductsBranchRulesBody(branchId, adjustPercent));
}