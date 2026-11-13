"use client";

import type { ObserverPartnerMeta, ObserverReferredAppeal } from "@/lib/clients-parity/types";
import { partnerAppealStats } from "@/lib/clients-parity/observer-stats";
import { ObserverPersonalClientRow } from "./ObserverPersonalClientRow";
import styles from "./observer.module.css";

type Props = {
  partner: ObserverPartnerMeta;
  appeals: ObserverReferredAppeal[];
  selectedIds: Set<string>;
  onBack: () => void;
  onClientOpen: (id: string) => void;
  onClientSelect: (id: string, checked: boolean) => void;
};

export function ObserverPartnerDetailView({
  partner,
  appeals,
  selectedIds,
  onBack,
  onClientOpen,
  onClientSelect,
}: Props) {
  const stats = partnerAppealStats(appeals);
  const metaLine = [partner.category, partner.city].filter(Boolean).join(" · ");

  return (
    <div className={styles.section} data-testid="ca-observer-partner-page">
      <button
        type="button"
        className={styles.backBtn}
        data-ca-action="observer:back"
        data-testid="ca-clients-back"
        onClick={onBack}
      >
        ← Назад к партнёрам
      </button>
      <header className={styles.partnerPageHead}>
        <h2 id="ca-observer-partner-title">{partner.name}</h2>
        {metaLine ? <p className={styles.mutedSmall}>{metaLine}</p> : null}
        <p className={styles.mutedSmall}>
          Направлено {stats.total} · в работе {stats.inWork} · дошли до оплаты {stats.paidThrough} ·
          возвратов {stats.returns} · отказов {stats.refusals}
        </p>
        <dl className={styles.statsInline} role="list" aria-label="Ключевые показатели партнёра">
          <StatPair label="Направлено" value={stats.total} />
          <StatPair label="С оплатой" value={stats.paidThrough} />
        </dl>
      </header>
      {appeals.length === 0 ? (
        <p className={styles.mutedSmall} data-testid="ca-observer-partner-filter-empty">
          Нет обращений по выбранным фильтрам.
        </p>
      ) : (
        <div
          className={styles.personalRows}
          aria-labelledby="ca-observer-partner-title"
          role="region"
          aria-label="Клиенты у партнёра"
        >
          {appeals.map((a) => (
            <ObserverPersonalClientRow
              key={a.id}
              appeal={a}
              selected={selectedIds.has(a.id)}
              onSelect={(c) => onClientSelect(a.id, c)}
              grouped
              showEdit={false}
              onOpen={() => onClientOpen(a.id)}
              onEdit={undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatPair({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

type PartnerMissingProps = {
  partnerId?: string;
  onBack: () => void;
};

/** Synthetic 404 — shell renders when `nav.partnerId` does not resolve (read P3). */
export function ObserverPartnerDetailMissing({ partnerId, onBack }: PartnerMissingProps) {
  return (
    <div
      className={styles.section}
      data-testid="ca-observer-partner-page"
      data-ca-state="missing"
    >
      <button
        type="button"
        className={styles.backBtn}
        data-ca-action="observer:back"
        data-testid="ca-clients-back"
        onClick={onBack}
      >
        ← Назад к партнёрам
      </button>
      <section className={styles.blocked} data-testid="ca-observer-partner-missing">
        <h2>Партнёр не найден</h2>
        <p className={styles.mutedSmall}>
          {partnerId
            ? `Партнёр «${partnerId}» недоступен в текущем списке.`
            : "Партнёр недоступен в текущем списке."}
        </p>
      </section>
    </div>
  );
}
