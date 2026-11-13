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
  return (
    <div className={styles.section} data-testid="ca-observer-partner-page">
      <button type="button" className={styles.backBtn} data-ca-action="observer:back" onClick={onBack}>
        ← Назад к партнёрам
      </button>
      <header className={styles.partnerPageHead}>
        <h2>{partner.name}</h2>
        <p className={styles.mutedSmall}>
          {[partner.category, partner.city].filter(Boolean).join(" · ")}
        </p>
        <dl className={styles.statsInline}>
          <motionStat label="Направлено" value={stats.total} />
          <motionStat label="С оплатой" value={stats.paidThrough} />
        </dl>
      </header>
      <div className={styles.personalRows}>
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
    </div>
  );
}

function motionStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
