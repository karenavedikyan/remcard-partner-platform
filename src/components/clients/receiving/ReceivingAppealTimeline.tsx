"use client";

import { formatAppealHistoryTimelineText } from "@/lib/clients-parity/appeal-history-stage-text";
import { formatObserverDateTime } from "@/lib/clients-parity/observer-display";
import type { ReceivingAppealHistoryEntry } from "./ReceivingAppealHistory";

export type TimelineRow = {
  key: string;
  at: string;
  text: string;
  author: string | null;
  tone: "" | "good" | "warn" | "danger";
};

function toneFor(text: string): TimelineRow["tone"] {
  const t = text.toLowerCase();
  if (/отказ/.test(t)) return "danger";
  if (/возврат/.test(t)) return "warn";
  if (/оплач|отгруж/.test(t)) return "good";
  return "";
}

/** Prototype `renderDetailPage` timeline: newest first, `text — reason`, real dates and authors. */
export function buildTimelineRows(entries: ReceivingAppealHistoryEntry[]): TimelineRow[] {
  return [...entries]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .map((e, i) => {
      const base = formatAppealHistoryTimelineText(String(e.text ?? "")).trim();
      const text = [base, e.reason?.trim() ? `— ${e.reason.trim()}` : ""].join(" ").trim();
      return {
        key: `${e.at}:${i}`,
        at: e.at,
        text,
        author: e.author?.trim() || null,
        tone: toneFor(text),
      };
    })
    .filter((r) => r.text.length > 0);
}

type Props = {
  entries: ReceivingAppealHistoryEntry[];
  emptyLabel?: string;
};

export function ReceivingAppealTimeline({ entries, emptyLabel = "В истории пока нет записей." }: Props) {
  const rows = buildTimelineRows(entries);
  return (
    <section className="panel stack" data-testid="ca-receiving-appeal-history" aria-labelledby="ca-receiving-history-h">
      <h3 id="ca-receiving-history-h">История</h3>
      {rows.length === 0 ? (
        <p className="small muted">{emptyLabel}</p>
      ) : (
        <ol className="ca-timeline">
          {rows.map((row) => (
            <li key={row.key} className="ca-tl-item" data-tone={row.tone || undefined}>
              <span className="ca-tl-dot" aria-hidden="true" />
              <div>
                <time className="small muted" dateTime={row.at}>
                  {formatObserverDateTime(row.at)}
                  {row.author ? ` · ${row.author}` : ""}
                </time>
                <p>{row.text}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
