"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { partnerAppealStats } from "@/lib/clients-parity/observer-stats";
import {
  displayClientName,
  formatObserverDateTime,
  observerAppealStatusLabel,
} from "@/lib/clients-parity/observer-display";
import type { OutgoingClientsState } from "./useOutgoingPartnerClients";
import styles from "./PartnerOutgoingSheet.module.css";

type Props = {
  partnerName: string;
  clientsHref: string;
  state: OutgoingClientsState;
  onRetry: () => void;
};

const EMPTY_META: Record<string, { alias?: string | null }> = {};

export function PartnerOutgoingClientsTab({ partnerName, clientsHref, state, onRetry }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const rows = useMemo(() => (state.phase === "ready" ? state.appeals : []), [state]);
  const meta = state.phase === "ready" ? state.personalMeta : EMPTY_META;

  const statusOptions = useMemo(
    () => Array.from(new Set(rows.map((appeal) => observerAppealStatusLabel(appeal)))).sort(),
    [rows],
  );
  const needle = query.trim().toLowerCase();
  const visible = rows.filter((appeal) => {
    if (status && observerAppealStatusLabel(appeal) !== status) return false;
    if (!needle) return true;
    return (
      displayClientName(appeal, meta[appeal.id]?.alias).toLowerCase().includes(needle) ||
      appeal.clientName.toLowerCase().includes(needle) ||
      appeal.certificateId.toLowerCase().includes(needle)
    );
  });
  const stats = partnerAppealStats(rows);

  return (
    <div className={styles.clientsTab} data-testid="partner-sheet-clients">
      <h3 className={styles.panelTitle}>Клиенты по вашим сертификатам → {partnerName}</h3>

      {state.phase === "loading" || state.phase === "idle" ? (
        <p className={styles.muted} role="status" data-testid="partner-sheet-clients-loading">
          Загрузка…
        </p>
      ) : null}

      {state.phase === "blocked" || state.phase === "error" ? (
        <div role="alert" data-testid="partner-sheet-clients-error" className={styles.errorBox}>
          <p>{state.message}</p>
          {state.retryable ? (
            <button type="button" className={styles.linkButton} onClick={onRetry}>
              Повторить
            </button>
          ) : null}
        </div>
      ) : null}

      {state.phase === "ready" ? (
        <>
          <dl className={styles.stats} data-testid="partner-sheet-clients-stats">
            <div>
              <dt>Клиентов</dt>
              <dd>{stats.total}</dd>
            </div>
            <div>
              <dt>В работе</dt>
              <dd>{stats.inWork}</dd>
            </div>
            <div>
              <dt>Дошли до оплаты</dt>
              <dd>{stats.paidThrough}</dd>
            </div>
          </dl>

          {rows.length > 0 ? (
            <div className={styles.clientTools}>
              <label className={styles.field}>
                <span>Имя или номер сертификата</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  data-testid="partner-sheet-clients-search"
                />
              </label>
              <label className={styles.field}>
                <span>Статус</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  data-testid="partner-sheet-clients-status"
                >
                  <option value="">Все статусы</option>
                  {statusOptions.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {rows.length === 0 ? (
            <p className={styles.muted} data-testid="partner-sheet-clients-empty">
              По этому партнёру у вас пока нет направленных клиентов.
            </p>
          ) : visible.length === 0 ? (
            <p className={styles.muted} data-testid="partner-sheet-clients-none-found">
              Ничего не найдено. Измените поиск или статус.
            </p>
          ) : (
            <ul className={styles.clientRows} data-testid="partner-sheet-clients-rows">
              {visible.map((appeal) => (
                <li key={appeal.id} className={styles.clientRow} data-testid="partner-sheet-client-row">
                  <div className={styles.clientMain}>
                    <strong>{displayClientName(appeal, meta[appeal.id]?.alias)}</strong>
                    <span className={styles.muted}>
                      {appeal.certificateId ? `Сертификат ${appeal.certificateId}` : "Без сертификата"}
                    </span>
                  </div>
                  <span className={styles.statusPill}>{observerAppealStatusLabel(appeal)}</span>
                  <time className={styles.muted} dateTime={appeal.updatedAt}>
                    {formatObserverDateTime(appeal.updatedAt)}
                  </time>
                  <Link href={clientsHref} className={styles.openLink} data-testid="partner-sheet-client-open">
                    Открыть
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p className={styles.privacy} data-testid="partner-sheet-clients-privacy">
            Только ваши направления. Внутренние заметки партнёра не видны.
          </p>
        </>
      ) : null}
    </div>
  );
}
