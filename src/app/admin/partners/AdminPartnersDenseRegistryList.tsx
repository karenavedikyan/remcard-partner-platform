"use client";

import Link from "next/link";
import type { PartnerRegistryItem } from "@/lib/prof-admin-partners-api";
import { AdminPartnersSingleManagementPanel } from "./AdminPartnersSingleManagementPanel";
import styles from "./AdminPartners.module.css";
import {
  catalogStatusClass,
  catalogStatusLabel,
  filteredPublicLinks,
  partnerTypeLabel,
} from "./partnerRegistryDisplay";
import { PartnerCollaborationBlock } from "./PartnerCollaborationBlock";
import type { PageSelectionState } from "./adminPartnersSelection";
import {
  collaborationVisibilityPresentation,
  collaborationVisibilityPrimaryLabel,
  partnershipCountsSummary,
} from "./partnerCollaborationDisplay";

type PendingPreview = {
  action: string;
  effects: string[];
  warnings: string[];
  confirmToken: string;
};

type Props = {
  items: PartnerRegistryItem[];
  loading: boolean;
  selectedIds: ReadonlyMap<string, { id: string; displayName: string | null }>;
  pageSelectState: PageSelectionState;
  onTogglePageSelect: () => void;
  onToggleRow: (row: PartnerRegistryItem) => void;
  singleSelected: PartnerRegistryItem | null;
  onToggleExpand: (row: PartnerRegistryItem) => void;
  onCloseSingle: () => void;
  reason: string;
  onReasonChange: (v: string) => void;
  pendingPreview: PendingPreview | null;
  onCancelPreview: () => void;
  onRequestPreview: (action: string) => void;
  onConfirmApply: () => void;
  isApplyingSingle: boolean;
  interactionsDisabled: boolean;
  pageSelectRef: React.RefObject<HTMLInputElement>;
};

function registrationShort(row: PartnerRegistryItem): string {
  const raw = row.registrationLabel?.toUpperCase() ?? "";
  if (raw === "ACTIVE" || raw === "LIVE") return "ACTIVE";
  return "DEMO";
}

function DenseRowLinks({ row }: { row: PartnerRegistryItem }) {
  const publicLinks = filteredPublicLinks(row);
  return (
    <div className={styles.denseDetailLinks}>
      <a href={`/admin/moderation/partners/${encodeURIComponent(row.id)}`} target="_blank" rel="noopener noreferrer">
        Открыть профиль
      </a>
      {row.organizations?.map((org) => (
        <a
          key={org.id}
          href={`/admin/moderation/organizations/${encodeURIComponent(org.id)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Организация: {org.name}
        </a>
      ))}
      {publicLinks.map((link) => (
        <a key={link.path} href={`https://remcard.ru${link.path}`} target="_blank" rel="noopener noreferrer">
          remcard.ru: {link.label}
        </a>
      ))}
      <Link href={`/admin/partners/${encodeURIComponent(row.id)}/partnerships`}>Партнёрства</Link>
    </div>
  );
}

export function AdminPartnersDenseRegistryList(props: Props) {
  const {
    items,
    loading,
    selectedIds,
    pageSelectState,
    onTogglePageSelect,
    onToggleRow,
    singleSelected,
    onToggleExpand,
    onCloseSingle,
    reason,
    onReasonChange,
    pendingPreview,
    onCancelPreview,
    onRequestPreview,
    onConfirmApply,
    isApplyingSingle,
    interactionsDisabled,
    pageSelectRef,
  } = props;

  return (
    <div className={styles.denseListWrap}>
      <label className={styles.densePageSelect}>
        <input
          ref={pageSelectRef}
          type="checkbox"
          aria-label="Выбрать на странице"
          checked={pageSelectState === "all"}
          disabled={interactionsDisabled || items.length === 0}
          onChange={onTogglePageSelect}
        />
        <span>Выбрать на странице</span>
      </label>
      <ul className={styles.denseList} aria-label="Реестр партнёров" aria-busy={loading}>
        {items.map((row) => {
          const checked = selectedIds.has(row.id);
          const expanded = singleSelected?.id === row.id;
          const displayName = row.displayName ?? row.id;
          const collabPresentation = collaborationVisibilityPresentation(row);
          const collabPrimary = collaborationVisibilityPrimaryLabel(collabPresentation);
          const counts = partnershipCountsSummary(row);
          const catalogLabel = catalogStatusLabel(row);

          return (
            <li
              key={row.id}
              className={styles.denseItem}
              data-selected={checked || undefined}
              data-expanded={expanded || undefined}
            >
              <div className={styles.denseRow}>
                <label className={styles.denseCheck} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className={styles.rowCheckInput}
                    aria-label={`Выбрать ${displayName}`}
                    checked={checked}
                    disabled={interactionsDisabled}
                    onChange={() => onToggleRow(row)}
                  />
                </label>
                <button
                  type="button"
                  className={styles.denseMain}
                  aria-expanded={expanded}
                  disabled={interactionsDisabled}
                  onClick={() => onToggleExpand(row)}
                >
                  <span className={styles.denseName} title={displayName}>
                    {displayName}
                  </span>
                  <span className={styles.denseMeta}>
                    {partnerTypeLabel(row)} · {row.city ?? "—"} · {registrationShort(row)}
                  </span>
                  <span className={styles.denseStatusLine}>
                    <span className={`${styles.densePill} ${catalogStatusClass(row, styles.visible, styles.inactive)}`}>
                      {catalogLabel}
                    </span>
                    <span className={styles.densePill}>{collabPrimary}</span>
                    {counts.hasData ? (
                      <span className={styles.densePillMuted}>
                        связей: <strong>{counts.total}</strong>
                        {counts.active !== "—" ? (
                          <>
                            {" "}
                            · активных: <strong>{counts.active}</strong>
                          </>
                        ) : null}
                      </span>
                    ) : (
                      <span className={styles.densePillMuted}>связей: нет данных</span>
                    )}
                  </span>
                </button>
              </div>
              {expanded ? (
                <div className={styles.denseDetail}>
                  <p className={styles.denseFullName}>{displayName}</p>
                  {row.organizationName ? (
                    <p className={styles.denseOrgLine}>{row.organizationName}</p>
                  ) : null}
                  <section className={styles.denseDetailCollab} aria-label="Сотрудничество">
                    <PartnerCollaborationBlock row={row} variant="card" />
                  </section>
                  <DenseRowLinks row={row} />
                  <AdminPartnersSingleManagementPanel
                    row={row}
                    reason={reason}
                    onReasonChange={onReasonChange}
                    pendingPreview={pendingPreview}
                    onCancelPreview={onCancelPreview}
                    onRequestPreview={onRequestPreview}
                    onConfirmApply={onConfirmApply}
                    onClose={onCloseSingle}
                    isApplying={isApplyingSingle}
                    disabled={interactionsDisabled}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
