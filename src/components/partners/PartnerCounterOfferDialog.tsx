"use client";

import { useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { categoryLabel } from "@/lib/partnership-labels";
import {
  GENERAL_PARTNERSHIP_CATEGORY,
  inviteRowsToTerms,
  type InviteTermRow,
} from "@/lib/partnership-rules";
import type { Partnership } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import styles from "./PartnerInviteDialog.module.css";

type OrgLimitRow = {
  category: string;
  categoryLabel: string;
  poolPercent: number | null;
};

type PartnerCounterOfferDialogProps = {
  partnership: Partnership;
  busy: boolean;
  onClose: () => void;
  onSent: () => void;
};

function rowsFromLimits(limits: OrgLimitRow[]): InviteTermRow[] {
  if (limits.length) {
    return limits.map((l) => ({
      category: l.category,
      percent: String(l.poolPercent ?? 0),
      excluded: false,
    }));
  }
  return [{ category: GENERAL_PARTNERSHIP_CATEGORY, percent: "", excluded: false }];
}

export function PartnerCounterOfferDialog({
  partnership,
  busy,
  onClose,
  onSent,
}: PartnerCounterOfferDialogProps) {
  const [rows, setRows] = useState<InviteTermRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void remcardFetch<{ limits?: OrgLimitRow[] }>("/api/pro/limits/org")
      .then((data) => {
        if (cancelled) return;
        setRows(rowsFromLimits(data.limits ?? []));
      })
      .catch(() => {
        if (!cancelled) setRows(rowsFromLimits([]));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    setError("");
    const active = rows.filter((r) => !r.excluded);
    if (!active.length) {
      setError("Укажите хотя бы одну категорию");
      return;
    }
    for (const row of active) {
      const value = Number(row.percent);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        setError("Процент должен быть от 0 до 100");
        return;
      }
    }
    setSending(true);
    try {
      await remcardFetch(`/api/partnership/${partnership.id}`, {
        method: "PATCH",
        body: {
          action: "counter_offer",
          terms: inviteRowsToTerms(rows).map((term) => ({
            ...term,
            categoryLabel: categoryLabel(term.category),
          })),
        },
      });
      onSent();
      onClose();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось отправить предложение");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.backdrop} role="presentation">
      <div className={styles.dialog} role="dialog" aria-labelledby="counter-offer-title">
        <h3 id="counter-offer-title">Предложение агенту</h3>
        <p className={styles.hint}>
          Укажите персональные категории и общий процент. Это не меняет опубликованные общие условия
          для агентов.
        </p>
        {loading ? <p className={styles.hint}>Загрузка ваших общих условий…</p> : null}
        {!loading ? (
          <div className={styles.termsList}>
            {rows.map((row, index) => (
              <div key={`${row.category}-${index}`} className={styles.termRow}>
                <strong>{categoryLabel(row.category)}</strong>
                <TextField
                  label="Общий %"
                  type="number"
                  min={0}
                  max={100}
                  value={row.percent}
                  onChange={(event) =>
                    setRows((prev) =>
                      prev.map((r, i) => (i === index ? { ...r, percent: event.target.value } : r)),
                    )
                  }
                />
              </div>
            ))}
          </div>
        ) : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button disabled={busy || sending || loading} onClick={() => void submit()}>
            {sending ? "Отправка…" : "Отправить предложение"}
          </Button>
          <Button variant="secondary" disabled={sending} onClick={onClose}>
            Отмена
          </Button>
        </div>
      </div>
    </div>
  );
}
