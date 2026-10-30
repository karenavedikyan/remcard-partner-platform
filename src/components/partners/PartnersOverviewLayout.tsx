"use client";

import type { ReactNode } from "react";
import type { PartnerOverviewZone } from "@/lib/partners-prototype-v1/overview-groups";
import styles from "./PartnersOverviewLayout.module.css";

export type PartnersOverviewLayoutProps = {
  lead: string;
  counts: { active: number; decisions: number; outgoing: number };
  loading: boolean;
  error: string;
  onRetry: () => void;
  onOpenFind: () => void;
  onOpenLink: () => void;
  onTileNavigate: (zone: PartnerOverviewZone) => void;
  waitingOpen: boolean;
  onWaitingOpenChange: (open: boolean) => void;
  /** Visible response when the decide tile is pressed at count 0 (no big empty panel). */
  decideZeroHint?: boolean;
  decisionSlot: ReactNode;
  activeSlot: ReactNode;
  waitingSlot: ReactNode;
  /** Ref targets for scrollIntoView */
  zoneRefs: {
    active: React.RefObject<HTMLDivElement>;
    decide: React.RefObject<HTMLDivElement>;
    waiting: React.RefObject<HTMLDetailsElement>;
  };
};

const LEAD_DEFAULT =
  "Магазины, мастера и компании, с которыми вы обмениваетесь клиентами. Условия по каждому партнёру открываются в его строке.";

export function PartnersOverviewLayout({
  lead = LEAD_DEFAULT,
  counts,
  loading,
  error,
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
}: PartnersOverviewLayoutProps) {
  const isEmpty =
    !loading && !error && counts.active === 0 && counts.decisions === 0 && counts.outgoing === 0;

  return (
    <div className={styles.root} data-testid="partners-overview">
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

      {!loading && !error && isEmpty ? (
        <section className={styles.empty} data-testid="partners-empty">
          <h2>Партнёров пока нет</h2>
          <p className={styles.emptyMuted}>
            Партнёр — это магазин, мастер или компания, которым вы рекомендуете клиентов и которые
            рекомендуют вас. Начните с одного из двух путей.
          </p>
          <div className={styles.scenarios}>
            <button
              type="button"
              className={styles.scenario}
              onClick={onOpenFind}
              data-testid="partners-scenario-find"
            >
              <span className={styles.scenarioEyebrow}>Уже в RemCard</span>
              <strong>Найти в RemCard</strong>
              <p>
                Партнёр уже зарегистрирован. Посмотрите витрину по этапам ремонта и направлениям,
                сравните условия и отправьте приглашение.
              </p>
              <span className={styles.scenarioLink}>Открыть витрину</span>
            </button>
            <button
              type="button"
              className={styles.scenario}
              onClick={onOpenLink}
              data-testid="partners-scenario-link"
            >
              <span className={styles.scenarioEyebrow}>Ещё не в RemCard</span>
              <strong>Пригласить по ссылке</strong>
              <p>
                Знакомого магазина или мастера нет на платформе. Создайте приглашение: по нему он
                зарегистрируется и вернётся к обсуждению условий.
              </p>
              <span className={styles.scenarioLink}>Создать приглашение</span>
            </button>
          </div>
        </section>
      ) : null}

      {!loading && !error && !isEmpty ? (
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
      ) : null}
    </div>
  );
}
