import type { AccrualType } from "./history-types";

/** Parse accrual type from URL query; rejects unknown values. */
export function parseAccrualType(raw: string | null | undefined): AccrualType | undefined {
  if (raw === "bonus" || raw === "agentBonus") {
    return raw;
  }
  return undefined;
}

export function accrualDetailHref(id: string, accrualType?: AccrualType): string {
  const path = `/history/accruals/${encodeURIComponent(id)}`;
  if (!accrualType) {
    return path;
  }
  return `${path}?type=${encodeURIComponent(accrualType)}`;
}
