"use client";

import { useId } from "react";
import { partnerAppealStats } from "@/lib/clients-parity/observer-stats";
import { formatObserverDateTime } from "@/lib/clients-parity/observer-display";
import type {
  ObserverPartnerMeta,
  ObserverPersonalMeta,
  ObserverReferredAppeal,
} from "@/lib/clients-parity/types";
import { ObserverPersonalClientRow } from "./ObserverPersonalClientRow";

type Props = {
  partner: ObserverPartnerMeta;
  appeals: ObserverReferredAppeal[];
  expanded: boolean;
  onToggle: (open: boolean) => void;
  partnerPartial: boolean;
  partnerSelected: boolean;
  onPartnerSelect: (checked: boolean) => void;
  selectedIds: Set<string>;
  onClientSelect: (id: string, checked: boolean) => void;
  personalMeta: Record<string, ObserverPersonalMeta>;
  bucket: string;
  onEditClient: (id: string) => void;
  onPartnerOpen: () => void;
  onClientOpen: (id: string) => void;
};

export function ObserverPartnerCard({
  partner,
  appeals,
  expanded,
  onToggle,
  partnerPartial,
  partnerSelected,
  onPartnerSelect,
  selectedIds,
  onClientSelect,
  personalMeta,
  bucket,
  onEditClient,
  onPartnerOpen,
  onClientOpen,
}: Props) {
  const stats = partnerAppealStats(appeals);
  const last = formatObserverDateTime(stats.lastUpdate);
  const panelId = useId();

  const groupCheckRef = (input: HTMLInputElement | null) => {
    if (!input) return;
    input.indeterminate = partnerPartial;
    input.setAttribute(
      "aria-checked",
      partnerPartial ? "mixed" : partnerSelected ? "true" : "false",
    );
  };

  return (
    <article
      className="panel ca-observer-partner-card"
      data-testid="ca-observer-partner-card"
      data-observer-bucket={bucket}
    >
      <div className="ca-observer-compact-top">
        <div className="ca-personal-group-head">
          <label className="ca-personal-check">
            <input
              ref={groupCheckRef}
              type="checkbox"
              data-observer-group={partner.id}
              aria-label={`Выбрать клиентов: ${partner.name}`}
              checked={partnerSelected}
              onChange={(e) => onPartnerSelect(e.target.checked)}
            />
          </label>
          <button
            type="button"
            className="ca-personal-partner-open"
            data-ca-action={`observer:partner:${partner.id}`}
            aria-label={`Открыть партнёра: ${partner.name}`}
            onClick={onPartnerOpen}
          >
            <div className="ca-observer-partner-card__head">
              <strong>{partner.name}</strong>
              <span className="ca-observer-partner-category">
                {[partner.category, partner.city].filter(Boolean).join(" · ")}
              </span>
            </div>
          </button>
        </div>
        <dl className="ca-observer-stats" aria-label="Показатели видимых клиентов">
          <div>
            <dt>Направлено</dt>
            <dd>{stats.total}</dd>
          </div>
          <div>
            <dt>В работе</dt>
            <dd>{stats.inWork}</dd>
          </div>
          <div>
            <dt>С оплатой</dt>
            <dd>{stats.paidThrough}</dd>
          </div>
          <div>
            <dt>Отказы</dt>
            <dd>{stats.refusals}</dd>
          </div>
        </dl>
      </div>
      <details
        className="ca-observer-disclosure"
        open={expanded}
        onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)}
        data-observer-partner-details={partner.id}
        aria-expanded={expanded}
      >
        <summary aria-controls={panelId} aria-expanded={expanded}>
          <span className="ca-observer-compact-meta">
            <span>
              Конверсия в оплату <strong>{stats.conv}</strong>
            </span>
            <span>
              Возвраты <strong>{stats.returns}</strong>
            </span>
            <span>
              Обновлено <time dateTime={stats.lastUpdate}>{last}</time>
            </span>
          </span>
          <span className="ca-observer-toggle-label">
            Клиенты <b>{appeals.length}</b>
            <span className="ca-observer-show">Показать</span>
            <span className="ca-observer-hide">Скрыть</span>
            <span className="ca-observer-chevron" aria-hidden="true">
              ⌄
            </span>
          </span>
        </summary>
        <div id={panelId} className="ca-observer-expanded-clients">
          <div className="ca-observer-clients-heading">
            <h2>
              Клиенты у партнёра <span>{appeals.length}</span>
            </h2>
            <p>
              Показатели выше относятся к клиентам в этом списке.
              {stats.returns
                ? " Клиенты с возвратом также могут входить в число дошедших до оплаты."
                : ""}
            </p>
          </div>
          <div className="ca-observer-client-columns" aria-hidden="true">
            <span />
            <span>Клиент и интерес</span>
            <span>Статус у партнёра</span>
            <span>Обновлено</span>
            {bucket !== "trash" ? <span>Личная запись</span> : null}
          </div>
          <div className="ca-personal-rows">
            {appeals.map((a) => (
              <ObserverPersonalClientRow
                key={a.id}
                appeal={a}
                meta={personalMeta[a.id]}
                selected={selectedIds.has(a.id)}
                onSelect={(checked) => onClientSelect(a.id, checked)}
                grouped
                showEdit={bucket !== "trash"}
                onEdit={() => onEditClient(a.id)}
                onOpen={() => onClientOpen(a.id)}
              />
            ))}
          </div>
        </div>
      </details>
    </article>
  );
}
