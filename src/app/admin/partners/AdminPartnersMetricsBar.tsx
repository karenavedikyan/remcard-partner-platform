"use client";

import type { PartnerRegistryFacets } from "@/lib/prof-admin-management-api";
import styles from "./AdminPartners.module.css";

type Props = {
  facets: PartnerRegistryFacets | null;
  matchedTotal: number;
  partnerType: string;
  onPartnerType: (value: string) => void;
  filtersDisabled?: boolean;
  /** Mobile dense layout: chips scroll horizontally. */
  compact?: boolean;
};

const KIND_BUTTONS: { label: string; param: string; key: keyof PartnerRegistryFacets["partnerKind"] }[] = [
  { label: "Все типы", param: "", key: "all" },
  { label: "Агенты", param: "AGENT", key: "agent" },
  { label: "Специалисты", param: "MASTER", key: "specialist" },
  { label: "Магазины", param: "STORE", key: "store" },
  { label: "Компании", param: "COMPANY", key: "company" },
];

/**
 * R1 type filter chips — counts from API-authoritative facets.partnerKind.
 * Secondary registration/catalog/archive facets live in toolbar selects (not duplicate chips).
 */
export function AdminPartnersMetricsBar(props: Props) {
  const { facets, partnerType, filtersDisabled = false, compact = false } = props;
  const unknown = facets?.partnerKind.unknown ?? 0;

  return (
    <section
      className={`${styles.filterChips} ${compact ? styles.filterChipsCompact : ""}`}
      aria-label="Типы партнёров"
    >
      {KIND_BUTTONS.map(({ label, param, key }) => (
        <button
          key={label}
          type="button"
          className={`${styles.filterChip} ${partnerType === param ? styles.filterChipActive : ""}`}
          aria-pressed={partnerType === param}
          disabled={filtersDisabled}
          onClick={() => props.onPartnerType(param)}
        >
          {label}{" "}
          <span className={styles.typeCounter}>{facets?.partnerKind[key] ?? "—"}</span>
        </button>
      ))}
      {unknown > 0 ? (
        <span className={styles.filterChipStatic} title="Тип не классифицирован">
          Неизвестный тип <span className={styles.typeCounter}>{unknown}</span>
        </span>
      ) : null}
    </section>
  );
}
