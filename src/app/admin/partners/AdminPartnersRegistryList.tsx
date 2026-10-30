"use client";

import type { PartnerRegistryItem } from "@/lib/prof-admin-partners-api";
import styles from "./AdminPartners.module.css";
import { PartnerCollaborationCountLink } from "./PartnerCollaborationCountLink";
import type { PageSelectionState } from "./adminPartnersSelection";
import type { PartnersEffectiveViewMode } from "./adminPartnersViewMode";
import {
  catalogVisibilityToken,
  cooperationVisibilityToken,
  partnerIdentitySubtitle,
  partnerInitials,
  partnershipTotalLabel,
  registrationPillLabel,
  registrationPillTone,
} from "./partnerRegistryPresentation";
import { hasPartnershipCounts } from "./partnerCollaborationDisplay";

type ListProps = {
  viewMode: PartnersEffectiveViewMode;
  items: PartnerRegistryItem[];
  loading: boolean;
  selectedIds: ReadonlyMap<string, { id: string; displayName: string | null }>;
  pageSelectState: PageSelectionState;
  onTogglePageSelect: () => void;
  onToggleRow: (row: PartnerRegistryItem) => void;
  selectionBlocked: boolean;
  singleSelected: PartnerRegistryItem | null;
  onOpenPartner: (row: PartnerRegistryItem, trigger: HTMLElement | null) => void;
  interactionsDisabled: boolean;
  headerSelectRef: React.RefObject<HTMLInputElement>;
  /** Kept for layout effect indeterminate sync; page select lives in toolbar only. */
  cardsPageSelectRef: React.RefObject<HTMLInputElement>;
};

function EyeIcon({ on }: { on: boolean | null }) {
  if (on === true) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M4 4l16 16" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VisibilityCell({
  token,
  ariaLabel,
}: {
  token: { label: string; visible: boolean | null };
  ariaLabel: string;
}) {
  const cls =
    token.visible === true
      ? `${styles.visibility} ${styles.visibilityYes}`
      : token.visible === false
        ? `${styles.visibility} ${styles.visibilityNo}`
        : `${styles.visibility} ${styles.visibilityUnknown}`;
  return (
    <span className={cls} aria-label={ariaLabel}>
      <EyeIcon on={token.visible} />
      <span>{token.label}</span>
    </span>
  );
}

function PartnerNameButton({
  row,
  onOpen,
  disabled,
}: {
  row: PartnerRegistryItem;
  onOpen: (trigger: HTMLElement) => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      className={styles.partnerName}
      disabled={disabled}
      data-partner-open-trigger={row.id}
      onClick={(e) => onOpen(e.currentTarget)}
      aria-label={`Открыть карточку ${row.displayName ?? row.id}`}
    >
      <span className={styles.partnerAvatar} aria-hidden="true">
        {partnerInitials(row.displayName, row.id)}
      </span>
      <span className={styles.partnerNameText}>
        <strong>{row.displayName ?? row.id}</strong>
        <small>{partnerIdentitySubtitle(row)}</small>
      </span>
    </button>
  );
}

function RegistrationPill({ row }: { row: PartnerRegistryItem }) {
  const tone = registrationPillTone(row);
  return (
    <span
      className={`${styles.regPill} ${
        tone === "good" ? styles.regPillGood : tone === "archived" ? styles.regPillArchived : ""
      }`}
    >
      <span className={styles.regPillDot} aria-hidden="true" />
      {registrationPillLabel(row)}
    </span>
  );
}

function MobilePartnerCard({
  row,
  checked,
  interactionsDisabled,
  onToggleRow,
  onOpenPartner,
}: {
  row: PartnerRegistryItem;
  checked: boolean;
  interactionsDisabled: boolean;
  onToggleRow: (row: PartnerRegistryItem) => void;
  onOpenPartner: (row: PartnerRegistryItem, trigger: HTMLElement | null) => void;
}) {
  const catalog = catalogVisibilityToken(row);
  const coop = cooperationVisibilityToken(row);
  return (
    <article className={styles.mobileCard} data-selected={checked || undefined}>
      <div className={styles.mobileCardTop}>
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
        <PartnerNameButton
          row={row}
          disabled={interactionsDisabled}
          onOpen={(trigger) => onOpenPartner(row, trigger)}
        />
        <RegistrationPill row={row} />
      </div>
      <div className={styles.mobileMeta}>
        <span
          className={`${styles.visibility} ${
            catalog.visible === true
              ? styles.visibilityYes
              : catalog.visible === false
                ? styles.visibilityNo
                : styles.visibilityUnknown
          }`}
        >
          <EyeIcon on={catalog.visible} />
          Каталог: {catalog.visible === true ? "да" : catalog.visible === false ? "нет" : "н/д"}
        </span>
        <span
          className={`${styles.visibility} ${
            coop.visible === true
              ? styles.visibilityYes
              : coop.visible === false
                ? styles.visibilityNo
                : styles.visibilityUnknown
          }`}
        >
          <EyeIcon on={coop.visible} />
          Поиск: {coop.visible === true ? "да" : coop.visible === false ? "нет" : "н/д"}
        </span>
      </div>
      <div className={styles.mobileCardBottom}>
        <span>
          {hasPartnershipCounts(row) ? (
            <>
              Партнёрств: <PartnerCollaborationCountLink row={row} countKey="total" />
            </>
          ) : (
            partnershipTotalLabel(row)
          )}
        </span>
        <span>Визит: нет данных</span>
      </div>
    </article>
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
    onOpenPartner,
    interactionsDisabled,
    headerSelectRef,
  } = props;

  if (viewMode === "dense" || viewMode === "cards") {
    return (
      <div className={styles.partnerCardsWrap} aria-label="Реестр партнёров" aria-busy={loading}>
        {/* Page select stays in toolbar — avoid duplicate compact-card chrome. */}
        <div className={styles.partnerCards}>
          {items.map((row) => (
            <MobilePartnerCard
              key={row.id}
              row={row}
              checked={selectedIds.has(row.id)}
              interactionsDisabled={interactionsDisabled}
              onToggleRow={onToggleRow}
              onOpenPartner={onOpenPartner}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.partnersTableWrap}>
      <table className={styles.partnersTable} aria-label="Реестр партнёров" aria-busy={loading}>
        <thead>
          <tr>
            <th className={styles.checkCell}>
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
            <th>Партнёр</th>
            <th>Регистрация</th>
            <th>Каталог</th>
            <th>Сотрудничество</th>
            <th>Визит*</th>
            <th className={styles.rowActionCol}>
              <span className={styles.srOnly}>Карточка</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const catalog = catalogVisibilityToken(row);
            const coop = cooperationVisibilityToken(row);
            return (
              <tr key={row.id} data-testid={`partner-row-${row.id}`}>
                <td className={styles.checkCell}>
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
                <td>
                  <PartnerNameButton
                    row={row}
                    disabled={interactionsDisabled}
                    onOpen={(trigger) => onOpenPartner(row, trigger)}
                  />
                </td>
                <td>
                  <RegistrationPill row={row} />
                </td>
                <td>
                  <VisibilityCell
                    token={catalog}
                    ariaLabel={`Каталог: ${row.displayName ?? row.id}, ${catalog.label}`}
                  />
                </td>
                <td className={styles.collaborationCol}>
                  <div className={styles.cooperationCell}>
                    <VisibilityCell
                      token={coop}
                      ariaLabel={`Поиск сотрудничества: ${row.displayName ?? row.id}, ${coop.label}`}
                    />
                    <small>
                      {hasPartnershipCounts(row) ? (
                        <>
                          Партнёрств:{" "}
                          <PartnerCollaborationCountLink row={row} countKey="total" />
                        </>
                      ) : (
                        partnershipTotalLabel(row)
                      )}
                    </small>
                  </div>
                </td>
                <td>
                  <span className={styles.mutedInline}>Нет данных</span>
                </td>
                <td className={styles.rowActionCol}>
                  <button
                    type="button"
                    className={styles.rowChevron}
                    aria-label={`Открыть строку ${row.displayName ?? row.id}`}
                    disabled={interactionsDisabled}
                    onClick={(e) => onOpenPartner(row, e.currentTarget)}
                  >
                    <ChevronIcon />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
