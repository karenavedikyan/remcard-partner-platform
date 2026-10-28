"use client";

import type { PartnerRegistryFacets } from "@/lib/prof-admin-management-api";
import styles from "./AdminPartners.module.css";

type Props = {
  facets: PartnerRegistryFacets | null;
  matchedTotal: number;
  partnerType: string;
  registration: string;
  catalog: string;
  archived: string;
  onPartnerType: (value: string) => void;
  onRegistration: (value: string) => void;
  onCatalog: (value: string) => void;
  onArchived: (value: string) => void;
  filtersDisabled?: boolean;
};

const KIND_BUTTONS: { label: string; param: string; key: keyof PartnerRegistryFacets["partnerKind"] }[] = [
  { label: "Всего", param: "", key: "all" },
  { label: "Агенты", param: "AGENT", key: "agent" },
  { label: "Специалисты", param: "MASTER", key: "specialist" },
  { label: "Магазины", param: "STORE", key: "store" },
  { label: "Компании", param: "COMPANY", key: "company" },
];

export function AdminPartnersMetricsBar(props: Props) {
  const { facets, matchedTotal, partnerType, filtersDisabled = false } = props;
  const unknown = facets?.partnerKind.unknown ?? 0;

  return (
    <section className={styles.metrics} aria-label="Показатели реестра партнёров">
      <p className={styles.metricsLead}>
        Найдено по выбранным фильтрам: <strong>{matchedTotal}</strong>
        {facets ? (
          <span className={styles.metricsHint}>
            {" "}
            Счётчики типов учитывают остальные фильтры, но не фильтр типа.
          </span>
        ) : null}
      </p>
      <div className={styles.metricsRow} role="group" aria-label="Счётчики по типу партнёра">
        {KIND_BUTTONS.map(({ label, param, key }) => (
          <button
            key={label}
            type="button"
            className={`${styles.metricChip} ${partnerType === param ? styles.metricChipActive : ""}`}
            aria-pressed={partnerType === param}
            disabled={filtersDisabled}
            onClick={() => props.onPartnerType(param)}
          >
            <span>{label}</span>
            <strong>{facets?.partnerKind[key] ?? "—"}</strong>
          </button>
        ))}
        {unknown > 0 ? (
          <span className={styles.metricChipStatic} title="Тип не классифицирован">
            Неизвестный тип: <strong>{unknown}</strong>
          </span>
        ) : null}
      </div>
      {facets ? (
        <div className={styles.metricsCompact} role="group" aria-label="Дополнительные показатели">
          <button type="button" className={styles.metricChipSmall} disabled={filtersDisabled} aria-pressed={props.registration === "active"} onClick={() => props.onRegistration(props.registration === "active" ? "" : "active")}>
            Новая регистрация <strong>{facets.registration.active}</strong>
          </button>
          <button type="button" className={styles.metricChipSmall} disabled={filtersDisabled} aria-pressed={props.registration === "demo"} onClick={() => props.onRegistration(props.registration === "demo" ? "" : "demo")}>
            Демо <strong>{facets.registration.demo}</strong>
          </button>
          <button type="button" className={styles.metricChipSmall} disabled={filtersDisabled} aria-pressed={props.catalog === "visible"} onClick={() => props.onCatalog(props.catalog === "visible" ? "" : "visible")}>
            В каталоге <strong>{facets.catalog.visible}</strong>
          </button>
          <button type="button" className={styles.metricChipSmall} disabled={filtersDisabled} aria-pressed={props.catalog === "hidden"} onClick={() => props.onCatalog(props.catalog === "hidden" ? "" : "hidden")}>
            Скрыты <strong>{facets.catalog.hidden}</strong>
          </button>
          <button type="button" className={styles.metricChipSmall} disabled={filtersDisabled} aria-pressed={props.archived === "true"} onClick={() => props.onArchived(props.archived === "true" ? "" : "true")}>
            Архив <strong>{facets.archive.archived}</strong>
          </button>
        </div>
      ) : null}
    </section>
  );
}
