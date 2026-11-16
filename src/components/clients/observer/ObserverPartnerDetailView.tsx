"use client";

import type { ObserverPartnerMeta, ObserverReferredAppeal } from "@/lib/clients-parity/types";
import { partnerAppealStats } from "@/lib/clients-parity/observer-stats";
import { ReceivingSubpageHead } from "../receiving/ReceivingSubpageHead";
import { ObserverPersonalClientRow } from "./ObserverPersonalClientRow";

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
    <div className="stack ca-section ca-section--observer" data-testid="ca-observer-partner-page">
      <ReceivingSubpageHead
        onBack={onBack}
        backLabel="К партнёрам"
        title={partner.name}
        titleId="ca-observer-partner-title"
      />
      <div className="ca-observer-partner-head stack">
        {metaLine ? <p className="small muted">{metaLine}</p> : null}
        <p className="small">
          Направлено {stats.total} · в работе {stats.inWork} · дошли до оплаты {stats.paidThrough} ·
          возвратов {stats.returns} · отказов {stats.refusals}
        </p>
      </div>
      {appeals.length === 0 ? (
        <p className="muted panel" data-testid="ca-observer-partner-filter-empty">
          Нет обращений по выбранным фильтрам.
        </p>
      ) : (
        <div
          className="ca-observer-client-rows ca-personal-rows ca-personal-flat"
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

type PartnerMissingProps = {
  partnerId?: string;
  onBack: () => void;
};

/** Synthetic 404 — shell renders when `nav.partnerId` does not resolve (read P3). */
export function ObserverPartnerDetailMissing({ partnerId, onBack }: PartnerMissingProps) {
  return (
    <div
      className="stack ca-section ca-section--observer"
      data-testid="ca-observer-partner-page"
      data-ca-state="missing"
    >
      <button type="button" className="ca-back" data-ca-action="observer:back" data-testid="ca-clients-back" onClick={onBack}>
        <span aria-hidden="true">←</span> К партнёрам
      </button>
      <section className="panel empty ca-empty" data-testid="ca-observer-partner-missing">
        <h2>Партнёр не найден</h2>
        <p className="muted">
          {partnerId
            ? `Партнёр «${partnerId}» недоступен в текущем списке.`
            : "Партнёр недоступен в текущем списке."}
        </p>
      </section>
    </div>
  );
}
