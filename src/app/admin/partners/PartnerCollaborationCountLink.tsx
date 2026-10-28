"use client";

import Link from "next/link";
import type { PartnerRegistryItem } from "@/lib/prof-admin-partners-api";
import type { PartnershipCountKey } from "./partnerCollaborationDisplay";
import {
  formatRegistryCount,
  hasPartnershipCounts,
  partnershipCountLabel,
  partnershipCountsSummary,
} from "./partnerCollaborationDisplay";
import {
  adminPartnerPartnershipsDrilldownHref,
  COUNT_KEY_TO_STATUS,
  isPartnershipCountDrilldownAvailable,
  partnershipCountNumericValue,
} from "./partnerCollaborationDrilldown";
import styles from "./AdminPartners.module.css";

type Props = {
  row: PartnerRegistryItem;
  countKey: PartnershipCountKey;
  className?: string;
};

function staticCountDisplay(row: PartnerRegistryItem, countKey: PartnershipCountKey): string {
  if (!hasPartnershipCounts(row)) {
    return countKey === "active" || countKey === "total" ? "Нет данных" : "—";
  }
  return formatRegistryCount(partnershipCountNumericValue(row, countKey) ?? undefined);
}

export function PartnerCollaborationCountLink({ row, countKey, className }: Props) {
  const summary = partnershipCountsSummary(row);
  const display =
    countKey === "active"
      ? summary.active
      : countKey === "total"
        ? summary.total
        : staticCountDisplay(row, countKey);

  if (!isPartnershipCountDrilldownAvailable(row, countKey)) {
    return (
      <strong className={className ?? styles.collaborationCountStatic} aria-label={partnershipCountLabel(countKey)}>
        {display}
      </strong>
    );
  }

  const value = partnershipCountNumericValue(row, countKey)!;
  const status = COUNT_KEY_TO_STATUS[countKey];
  const href = adminPartnerPartnershipsDrilldownHref(row.id, status, {
    contextName: row.displayName,
  });

  return (
    <Link
      href={href}
      className={className ?? styles.collaborationCountLink}
      aria-label={`${partnershipCountLabel(countKey)}: ${value}. Открыть список контрагентов`}
    >
      {String(value)}
    </Link>
  );
}
