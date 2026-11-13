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
import styles from "./observer.module.css";

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
      className={styles.partnerCard}
      data-testid="ca-observer-partner-card"
      data-observer-bucket={bucket}
    >
      <div className={styles.compactTop}>
        <div className={styles.partnerGroupHead}>
          <label className={styles.personalCheck}>
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
            className={styles.partnerOpenBtn}
            data-ca-action={`observer:partner:${partner.id}`}
            aria-label={`Открыть партнёра: ${partner.name}`}
            onClick={onPartnerOpen}
          >
            <div className={styles.partnerCardHead}>
              <strong>
                {partner.name} <span className={styles.partnerArrow} aria-hidden="true">→</span>
              </strong>
              <span className={styles.partnerCategory}>
                {[partner.category, partner.city].filter(Boolean).join(" · ")}
              </span>
            </div>
          </button>
        </div>
        <dl className={styles.stats} aria-label="Показатели видимых клиентов">
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
        className={styles.disclosure}
        open={expanded}
        onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)}
        data-observer-partner-details={partner.id}
      >
        <summary aria-controls={panelId}>
          <span className={styles.meta}>
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
          <span className={styles.toggleLabel}>
            Клиенты <b>{appeals.length}</b>
            <span className={expanded ? styles.hideLabel : styles.showLabel}>
              {expanded ? "Скрыть" : "Показать"}
            </span>
            <span className={styles.chevron} aria-hidden="true">
              ⌄
            </span>
          </span>
        </summary>
        <div id={panelId} className={styles.expandedClients}>
          <div className={styles.clientsHeading}>
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
          <div className={styles.clientColumns} aria-hidden="true">
            <span />
            <span>Клиент и интерес</span>
            <span>Статус у партнёра</span>
            <span>Обновлено</span>
            {bucket !== "trash" ? <span>Личная запись</span> : null}
          </div>
          <div className={styles.personalRows}>
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
