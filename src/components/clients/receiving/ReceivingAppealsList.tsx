"use client";

import type {
  ReceivingAppealsListResponse,
  ReceivingListFilters,
} from "@/lib/clients-parity/receiving-appeals-api";

/** P4: detail/history navigation — callback contract only until routes exist. */
export type ReceivingAppealsListProps = {
  data: ReceivingAppealsListResponse;
  filters?: ReceivingListFilters;
  onOpenAppeal?: (appealId: string) => void;
  onFiltersChange?: (next: ReceivingListFilters) => void;
};

/**
 * Incoming list shell — full renderListPage parity owned with P5 (bulk) / P7 (CSS).
 * Renders only when fetchReceivingAppealsWorkspace returns ok:true (proxy ready).
 */
export function ReceivingAppealsList({ data, onOpenAppeal }: ReceivingAppealsListProps) {
  if (data.appeals.length === 0) {
    return (
      <section data-testid="ca-receiving-appeals-empty" className="panel empty ca-empty">
        <h2>Пока нет обращений</h2>
        <p className="muted">Список загружен с сервера; данных пока нет.</p>
      </section>
    );
  }

  return (
    <section data-testid="ca-receiving-appeals-list" aria-label="Клиенты у меня">
      <ul>
        {data.appeals.map((row) => (
          <li key={row.id}>
            <button type="button" onClick={() => onOpenAppeal?.(row.id)}>
              {row.clientName}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
