"use client";

import { formatObserverDateTime } from "@/lib/clients-parity/observer-display";
import styles from "../observer/observer.module.css";

/** K1 row — aligns with prototype `history[]` item (server-sourced only). */
export type ReceivingAppealHistoryEntry = {
  at: string;
  text: string;
  reason?: string | null;
  author?: string;
};

export type ReceivingHistoryProjection = "receiving-full" | "referrer-public";

const PUBLIC_PAID_HISTORY = /^оплачено(?=\s|[·:—(]|$)/i;
const PUBLIC_SHIPPED_HISTORY = /^отгружено(?=\s|[·:—(]|$)/i;

/** K2 safe projection — frozen prototype `isPublicReferrerHistoryEntry` / `publicHistoryLine`. */
export function isPublicReferrerHistoryEntry(
  entry: ReceivingAppealHistoryEntry,
  refusedReason?: string | null,
): boolean {
  const t = String(entry.text || "").trim();
  if (!t) return false;
  if (/служебн|заметк|архив|корзин|скрыто|перемещено|вручную/i.test(t)) return false;
  if (/группов/i.test(t) && !/^этап изменён:/i.test(t)) return false;
  if (/^этап изменён:/i.test(t)) return true;
  if (/^статус:/i.test(t)) return true;
  if (/создано обращение по сертификату/i.test(t)) return true;
  if (entry.reason && /отказ/i.test(t)) return true;
  if (/^отказ$/i.test(t) && refusedReason) return true;
  if (/^отказ:/i.test(t) && entry.reason) return true;
  if (PUBLIC_PAID_HISTORY.test(t)) return true;
  if (PUBLIC_SHIPPED_HISTORY.test(t)) return true;
  if (/^возврат/i.test(t)) return true;
  return false;
}

export function publicHistoryLine(
  entry: ReceivingAppealHistoryEntry,
  refusedReason?: string | null,
): string {
  const t = String(entry.text || "").trim();
  if (/^этап изменён:\s*/i.test(t)) {
    const label = t.replace(/^этап изменён:\s*/i, "").replace(/\s*\(.*группов.*\)\s*$/i, "").trim();
    return label ? `Этап: ${label}` : "";
  }
  if (/^статус:\s*/i.test(t)) return t.replace(/\s*\(.*группов.*\)\s*$/i, "").trim();
  if (/создано обращение по сертификату/i.test(t)) return "Создано обращение по сертификату";
  if (entry.reason && /отказ/i.test(t)) return `Отказ: ${entry.reason}`;
  if (/^отказ$/i.test(t) && refusedReason) return `Отказ: ${refusedReason}`;
  if (/^отказ:/i.test(t) && entry.reason) return `Отказ: ${entry.reason}`;
  if (PUBLIC_PAID_HISTORY.test(t)) return "Оплачено";
  if (PUBLIC_SHIPPED_HISTORY.test(t)) return "Отгружено";
  if (/^возврат/i.test(t)) return "Возврат";
  return "";
}

export function projectReceivingHistory(
  entries: ReceivingAppealHistoryEntry[],
  projection: ReceivingHistoryProjection,
  refusedReason?: string | null,
): { at: string; text: string }[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
  if (projection === "receiving-full") {
    return sorted.map((e) => ({
      at: e.at,
      text: [e.text, e.reason ? `— ${e.reason}` : ""].join("").trim(),
    }));
  }
  return sorted
    .filter((e) => isPublicReferrerHistoryEntry(e, refusedReason))
    .map((e) => ({ at: e.at, text: publicHistoryLine(e, refusedReason) }))
    .filter((e) => e.text);
}

type Props = {
  entries: ReceivingAppealHistoryEntry[];
  projection: ReceivingHistoryProjection;
  emptyLabel?: string;
  refusedReason?: string | null;
};

export function ReceivingAppealHistory({
  entries,
  projection,
  emptyLabel = "Публичных событий пока нет.",
  refusedReason,
}: Props) {
  const rows = projectReceivingHistory(entries, projection, refusedReason);
  return (
    <section className={styles.blocked} data-testid="ca-receiving-appeal-history">
      <h3>История</h3>
      {projection === "referrer-public" ? (
        <p className={styles.mutedSmall}>Без внутренних заметок принимающего партнёра.</p>
      ) : null}
      {rows.length === 0 ? (
        <p className={styles.mutedSmall}>{emptyLabel}</p>
      ) : (
        <ol className={styles.detailGrid} role="list">
          {rows.map((row) => (
            <li key={`${row.at}:${row.text}`}>
              <time className={styles.mutedSmall} dateTime={row.at}>
                {formatObserverDateTime(row.at)}
              </time>
              <p>{row.text}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
