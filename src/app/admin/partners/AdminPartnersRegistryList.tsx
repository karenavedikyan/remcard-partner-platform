"use client";

import { Fragment } from "react";
import { Button } from "@/components/ui/Button";
import type { PartnerRegistryItem } from "@/lib/prof-admin-partners-api";
import { AdminPartnersSingleManagementPanel } from "./AdminPartnersSingleManagementPanel";
import styles from "./AdminPartners.module.css";
import {
  catalogStatusClass,
  catalogStatusLabel,
  filteredPublicLinks,
  partnerTypeLabel,
  selectedPartnerRef,
} from "./partnerRegistryDisplay";
import type { PageSelectionState } from "./adminPartnersSelection";

type PendingPreview = {
  action: string;
  effects: string[];
  warnings: string[];
  confirmToken: string;
};

type ListProps = {
  viewMode: "table" | "cards";
  items: PartnerRegistryItem[];
  loading: boolean;
  selectedIds: ReadonlyMap<string, { id: string; displayName: string | null }>;
  pageSelectState: PageSelectionState;
  onTogglePageSelect: () => void;
  onToggleRow: (row: PartnerRegistryItem) => void;
  selectionBlocked: boolean;
  singleSelected: PartnerRegistryItem | null;
  onSelectSingle: (row: PartnerRegistryItem) => void;
  onCloseSingle: () => void;
  reason: string;
  onReasonChange: (v: string) => void;
  pendingPreview: PendingPreview | null;
  onCancelPreview: () => void;
  onRequestPreview: (action: string) => void;
  onConfirmApply: () => void;
  isApplyingSingle: boolean;
  interactionsDisabled: boolean;
  headerSelectRef: React.RefObject<HTMLInputElement>;
  cardsPageSelectRef: React.RefObject<HTMLInputElement>;
};

function RowLinksMenu({ row }: { row: PartnerRegistryItem }) {
  const publicLinks = filteredPublicLinks(row);
  return (
    <details className={styles.rowMenu}>
      <summary>Профиль и ссылки</summary>
      <div className={styles.rowMenuBody}>
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
            Профиль организации: {org.name}
          </a>
        ))}
        {publicLinks.map((link) => (
          <a key={link.path} href={`https://remcard.ru${link.path}`} target="_blank" rel="noopener noreferrer">
            На remcard.ru: {link.label}
          </a>
        ))}
        {publicLinks.length === 0 ? <span className={styles.mutedInline}>Публичных карточек нет</span> : null}
      </div>
    </details>
  );
}

export function AdminPartnersRegistryList(props: ListProps) {
  const {
    viewMode,
    items,
    loading,
    selectedIds,
    pageSelectState,
    onTogglePageSelect,
    onToggleRow,
    singleSelected,
    onSelectSingle,
    onCloseSingle,
    reason,
    onReasonChange,
    pendingPreview,
    onCancelPreview,
    onRequestPreview,
    onConfirmApply,
    isApplyingSingle,
    interactionsDisabled,
    headerSelectRef,
    cardsPageSelectRef,
  } = props;

  if (viewMode === "cards") {
    return (
      <div className={styles.cardGridWrap}>
        <label className={styles.pageSelectBar}>
          <input
            ref={cardsPageSelectRef}
            type="checkbox"
            aria-label="Выбрать на странице"
            checked={pageSelectState === "all"}
            disabled={interactionsDisabled || items.length === 0}
            onChange={onTogglePageSelect}
          />
          <span>Выбрать на странице</span>
        </label>
        <div className={styles.cardGrid} aria-label="Реестр партнёров" aria-busy={loading}>
        {items.map((row) => {
          const checked = selectedIds.has(row.id);
          const expanded = singleSelected?.id === row.id;
          return (
            <article key={row.id} className={styles.partnerCard} data-selected={checked || undefined}>
              <div className={styles.cardHead}>
                <label className={styles.rowCheck}>
                  <input
                    type="checkbox"
                    className={styles.rowCheckInput}
                    aria-label={`Выбрать ${row.displayName ?? row.id}`}
                    checked={checked}
                    disabled={interactionsDisabled}
                    onChange={() => onToggleRow(row)}
                  />
                </label>
                <div className={styles.cardTitleBlock}>
                  <h3>{row.displayName ?? row.id}</h3>
                  <p className={styles.cardMeta}>
                    {partnerTypeLabel(row)} · {row.city ?? "—"}
                    {row.organizationName ? ` · ${row.organizationName}` : ""}
                  </p>
                </div>
              </div>
              <div className={styles.cardBadges}>
                <span className={`${styles.badge} ${row.registrationLabel === "ACTIVE" ? styles.visible : ""}`}>
                  {row.registrationLabel === "ACTIVE" ? "Активный" : "Демо"}
                </span>
                <span className={`${styles.badge} ${catalogStatusClass(row, styles.visible, styles.inactive)}`}>
                  {catalogStatusLabel(row)}
                </span>
              </div>
              <RowLinksMenu row={row} />
              <div className={styles.cardActions}>
                <Button
                  variant="secondary"
                  aria-expanded={expanded}
                  disabled={interactionsDisabled}
                  onClick={() => onSelectSingle(row)}
                >
                  Действия
                </Button>
                <Button
                  variant="secondary"
                  className={styles.danger}
                  disabled={interactionsDisabled}
                  onClick={() => onSelectSingle(row)}
                >
                  Удалить
                </Button>
              </div>
              {expanded ? (
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
              ) : null}
            </article>
          );
        })}
        </div>
      </div>
    );
  }

  return (
    <table className={`${styles.table} ${styles.tableCompact}`} aria-label="Реестр партнёров" aria-busy={loading}>
      <colgroup>
        <col className={styles.colCheck} />
        <col className={styles.colName} />
        <col className={styles.colType} />
        <col className={styles.colCity} />
        <col className={styles.colReg} />
        <col className={styles.colCatalog} />
        <col className={styles.colAccess} />
      </colgroup>
      <thead className={styles.tableHeadSticky}>
        <tr>
          <th className={styles.checkCol}>
            <label className={styles.headerCheckLabel}>
              <input
                ref={headerSelectRef}
                type="checkbox"
                className={styles.rowCheckInput}
                aria-label="Выбрать на странице"
                checked={pageSelectState === "all"}
                disabled={interactionsDisabled || items.length === 0}
                onChange={onTogglePageSelect}
              />
            </label>
          </th>
          <th>Имя</th>
          <th>Тип</th>
          <th>Город / организация</th>
          <th>Регистрация</th>
          <th>Каталог</th>
          <th>Доступ</th>
        </tr>
      </thead>
      <tbody>
        {items.map((row) => {
          const publicLinks = filteredPublicLinks(row);
          const expanded = singleSelected?.id === row.id;
          return (
            <Fragment key={row.id}>
              <tr className={styles.compactRow}>
                <td data-label="Выбор" className={styles.checkCol}>
                  <label className={styles.rowCheck}>
                    <input
                      type="checkbox"
                      className={styles.rowCheckInput}
                      aria-label={`Выбрать ${row.displayName ?? row.id}`}
                      checked={selectedIds.has(row.id)}
                      disabled={interactionsDisabled}
                      onChange={() => onToggleRow(row)}
                    />
                  </label>
                </td>
                <td data-label="Имя">{row.displayName ?? row.id}</td>
                <td data-label="Тип">{partnerTypeLabel(row)}</td>
                <td data-label="Город / организация">
                  {row.city ?? "—"}
                  {row.organizationName ? (
                    <>
                      <br />
                      {row.organizationName}
                    </>
                  ) : null}
                </td>
                <td data-label="Регистрация">
                  <span className={`${styles.badge} ${row.registrationLabel === "ACTIVE" ? styles.visible : ""}`}>
                    {row.registrationLabel === "ACTIVE" ? "Активный" : "Демо"}
                  </span>
                </td>
                <td data-label="Каталог">
                  <span className={`${styles.badge} ${catalogStatusClass(row, styles.visible, styles.inactive)}`}>
                    {catalogStatusLabel(row)}
                  </span>
                </td>
                <td data-label="Доступ" className={styles.accessCol}>
                  <RowLinksMenu row={row} />
                  <div className={styles.compactRowActions}>
                    <Button
                      variant="secondary"
                      aria-expanded={expanded}
                      disabled={interactionsDisabled}
                      onClick={() => onSelectSingle(row)}
                    >
                      Действия
                    </Button>
                    <Button
                      variant="secondary"
                      className={styles.danger}
                      disabled={interactionsDisabled}
                      onClick={() => onSelectSingle(row)}
                    >
                      Удалить
                    </Button>
                  </div>
                  {publicLinks.length > 1 ? (
                    <details className={styles.moreLinks}>
                      <summary>Ещё карточки: {publicLinks.length - 1}</summary>
                      <div className={styles.publicLinks}>
                        {publicLinks.slice(1).map((link) => (
                          <a
                            key={link.path}
                            href={`https://remcard.ru${link.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            На remcard.ru: {link.label}
                          </a>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </td>
              </tr>
              {expanded ? (
                <tr className={styles.managementRow}>
                  <td colSpan={7}>
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
                  </td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

export { selectedPartnerRef };
