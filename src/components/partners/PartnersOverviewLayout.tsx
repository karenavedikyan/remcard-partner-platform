"use client";

import type { ReactNode } from "react";
import type { PartnersHubAudience } from "@/lib/partners-hub-presentation";
import type { PartnerOverviewZone } from "@/lib/partners-prototype-v1/overview-groups";
import { PartnersNewPartnerEmpty } from "@/components/partners/partners-new-partner-empty/PartnersNewPartnerEmpty";
import { PartnersOverviewLegacyDisclosure } from "@/components/partners/PartnersOverviewLegacyDisclosure";
import {
  isOverviewCurrentEmpty,
  OVERVIEW_LEGACY_DISCLOSURE_PANEL_ID,
  shouldShowApprovedPartnersGreeting,
} from "@/components/partners/partners-overview-greeting";
import styles from "./PartnersOverviewLayout.module.css";
import disclosureStyles from "./PartnersOverviewLegacyDisclosure.module.css";

export type PartnersOverviewLayoutProps = {
  lead: string;
  counts: { active: number; decisions: number; outgoing: number };
  loading: boolean;
  error: string;
  listReady: boolean;
  onRetry: () => void;
  onOpenFind: () => void;
  onOpenLink: () => void;
  onTileNavigate: (zone: PartnerOverviewZone) => void;
  waitingOpen: boolean;
  onWaitingOpenChange: (open: boolean) => void;
  decideZeroHint?: boolean;
  decisionSlot: ReactNode;
  activeSlot: ReactNode;
  waitingSlot: ReactNode;
  zoneRefs: {
    active: React.RefObject<HTMLDivElement>;
    decide: React.RefObject<HTMLDivElement>;
    waiting: React.RefObject<HTMLDetailsElement>;
  };
  partnersAudience?: PartnersHubAudience;
  /** Full authorized collection length === 0 after valid list response. */
  collectionIsEmpty: boolean;
  greetingVariant: "true-empty" | "history";
  hasArchivedOrHiddenActive: boolean;
  collectionCount: number;
  legacyDisclosureOpen: boolean;
  onLegacyDisclosureOpenChange: (open: boolean) => void;
  /** Force legacy panel open (archive view, bulk outcome, terms=, etc.). */
  legacyChromePinned: boolean;
  /** Hide hero while pinned bulk outcome is visible. */
  legacyBulkOutcomeVisible: boolean;
};

const LEAD_DEFAULT =
  "Магазины, мастера и компании, с которыми вы обмениваетесь клиентами. Условия по каждому партнёру открываются в его строке.";

export function PartnersOverviewLayout({
  lead = LEAD_DEFAULT,
  counts,
  loading,
  error,
  listReady,
  onRetry,
  onOpenFind,
  onOpenLink,
  onTileNavigate,
  waitingOpen,
  onWaitingOpenChange,
  decideZeroHint = false,
  decisionSlot,
  activeSlot,
  waitingSlot,
  zoneRefs,
  partnersAudience,
  collectionIsEmpty,
  greetingVariant,
  hasArchivedOrHiddenActive,
  collectionCount,
  legacyDisclosureOpen,
  onLegacyDisclosureOpenChange,
  legacyChromePinned,
  legacyBulkOutcomeVisible,
}: PartnersOverviewLayoutProps) {
  const showGreetingBase = shouldShowApprovedPartnersGreeting({
    loading,
    error,
    listReady,
    counts,
  });
  const showFullLegacyOverview =
    listReady && !loading && !error && !isOverviewCurrentEmpty(counts);
  const inGreetingZeroOverview = showGreetingBase && !showFullLegacyOverview;

  const effectiveDisclosureOpen = legacyDisclosureOpen || legacyChromePinned;

  const showGreetingHero =
    showGreetingBase && !(legacyChromePinned && legacyBulkOutcomeVisible);

  const legacyPanelVisible =
    showFullLegacyOverview ||
    (inGreetingZeroOverview &&
      !collectionIsEmpty &&
      effectiveDisclosureOpen);

  const showDisclosureSummary =
    inGreetingZeroOverview && !collectionIsEmpty && !showFullLegacyOverview;

  const hideOverviewHead =
    showGreetingHero && (collectionIsEmpty || !effectiveDisclosureOpen);

  const legacyOverviewPanel = (
    <>
      <div className={styles.tiles} data-testid="partners-overview-tiles">
        <button
          type="button"
          className={styles.tile}
          onClick={() => onTileNavigate("active")}
          aria-label={`Действующие: ${counts.active}`}
          data-testid="partners-tile-active"
        >
          <strong>{counts.active}</strong>
          <span className={styles.tileBody}>
            <span className={styles.tileTitle}>Действующие</span>
            <small className={styles.tileNote}>Можно рекомендовать клиентам</small>
          </span>
        </button>
        <button
          type="button"
          className={`${styles.tile} ${counts.decisions ? styles.tileAttention : ""}`}
          onClick={() => onTileNavigate("decide")}
          aria-label={`Ждут вашего решения: ${counts.decisions}`}
          data-testid="partners-tile-decide"
        >
          <strong>{counts.decisions}</strong>
          <span className={styles.tileBody}>
            <span className={styles.tileTitle}>
              Ждут <span className={styles.tileLong}>вашего </span>решения
            </span>
            <small className={styles.tileNote}>Предложения условий от партнёров</small>
          </span>
        </button>
        <button
          type="button"
          className={styles.tile}
          onClick={() => onTileNavigate("waiting")}
          aria-label={`Ожидают ответа: ${counts.outgoing}`}
          data-testid="partners-tile-waiting"
        >
          <strong>{counts.outgoing}</strong>
          <span className={styles.tileBody}>
            <span className={styles.tileTitle}>Ожидают ответа</span>
            <small className={styles.tileNote}>Ваши приглашения партнёрам</small>
          </span>
        </button>
      </div>

      {counts.decisions > 0 ? (
        <div
          className={`${styles.zone} ${styles.zoneDecide}`}
          id="pr-zone-decide"
          data-testid="partners-zone-decide"
          ref={zoneRefs.decide}
        >
          <div className={styles.zoneHead}>
            <div>
              <h2>
                Ждут вашего решения <span className={styles.badge}>{counts.decisions}</span>
              </h2>
              <p className={styles.zoneHint}>
                Пока вы не ответите, условия не вступят в силу. Решение можно отложить,
                предложение останется здесь.
              </p>
            </div>
          </div>
          <div className={styles.zoneBody}>{decisionSlot}</div>
        </div>
      ) : (
        <div
          id="pr-zone-decide"
          data-testid="partners-zone-decide-zero"
          ref={zoneRefs.decide}
          className={decideZeroHint ? styles.emptyInline : undefined}
          hidden={!decideZeroHint}
          role={decideZeroHint ? "status" : undefined}
        >
          {decideZeroHint
            ? "Сейчас нет предложений, которые ждут вашего решения."
            : null}
        </div>
      )}

      <div
        className={styles.zone}
        id="pr-zone-active"
        data-testid="partners-zone-active"
        ref={zoneRefs.active}
      >
        <div className={styles.zoneHead}>
          <div>
            <h2>
              Действующие партнёры <span className={styles.badge}>{counts.active}</span>
            </h2>
            <p className={styles.zoneHint}>
              Кому вы можете рекомендовать клиентов и кто рекомендует вас. Архив скрывает запись
              только из списка, не отменяя условия.
            </p>
          </div>
        </div>
        <div className={styles.zoneBody}>{activeSlot}</div>
      </div>

      <details
        className={`${styles.zone} ${styles.waiting}`}
        id="pr-zone-waiting"
        data-testid="partners-zone-waiting"
        open={waitingOpen}
        ref={zoneRefs.waiting}
        onToggle={(e) => onWaitingOpenChange((e.target as HTMLDetailsElement).open)}
      >
        <summary>
          <span>
            <h2>
              Ожидают ответа <span className={styles.badge}>{counts.outgoing}</span>
            </h2>
            <small className={styles.zoneHint}>
              Отправленные приглашения и предложения. Партнёр увидит их в своём кабинете.
            </small>
          </span>
          <span className={styles.waitingChevron} aria-hidden="true">
            ▾
          </span>
        </summary>
        <div className={styles.zoneBody}>
          <div className={styles.waitingActions}>
            <button type="button" className={styles.ghostBtn} onClick={onOpenFind}>
              Найти в RemCard
            </button>
            <button type="button" className={styles.ghostBtn} onClick={onOpenLink}>
              Пригласить по ссылке
            </button>
          </div>
          {waitingSlot}
        </div>
      </details>
    </>
  );

  return (
    <div className={styles.root} data-testid="partners-overview">
      {!hideOverviewHead ? (
        <div className={styles.head}>
          <p className={styles.lead}>{lead || LEAD_DEFAULT}</p>
          <button
            type="button"
            className={styles.primaryCta}
            onClick={onOpenFind}
            data-testid="partners-overview-cta-find"
          >
            Найти партнёра
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className={styles.statusBanner} data-testid="partners-overview-loading">
          Загрузка партнёрств…
        </p>
      ) : null}

      {error ? (
        <div role="alert" data-testid="partners-overview-error">
          <p className={styles.errorBanner}>{error}</p>
          <button type="button" className={styles.ghostBtn} onClick={onRetry}>
            Повторить
          </button>
        </div>
      ) : null}

      {showGreetingHero ? (
        <PartnersNewPartnerEmpty
          audience={partnersAudience ?? "agent-r04"}
          variant={greetingVariant}
          hasArchivedOrHiddenActive={hasArchivedOrHiddenActive}
          onOpenFind={onOpenFind}
          onOpenLink={onOpenLink}
        />
      ) : null}

      {showDisclosureSummary ? (
        <>
          <PartnersOverviewLegacyDisclosure
            open={effectiveDisclosureOpen}
            pinned={legacyChromePinned}
            panelTargetMounted
            onOpenChange={onLegacyDisclosureOpenChange}
            collectionCount={collectionCount}
          />
          <div
            key="partners-overview-legacy-stable"
            id={OVERVIEW_LEGACY_DISCLOSURE_PANEL_ID}
            data-testid="partners-overview-legacy-stable"
            className={disclosureStyles.attachedLegacyPanel}
            hidden={!legacyPanelVisible}
          >
            {legacyPanelVisible ? legacyOverviewPanel : null}
          </div>
        </>
      ) : legacyPanelVisible ? (
        <div
          key="partners-overview-legacy-stable"
          id={OVERVIEW_LEGACY_DISCLOSURE_PANEL_ID}
          data-testid="partners-overview-legacy-stable"
          className={showDisclosureSummary ? disclosureStyles.attachedLegacyPanel : undefined}
        >
          {legacyOverviewPanel}
        </div>
      ) : null}
    </div>
  );
}
