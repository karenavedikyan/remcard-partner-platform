"use client";

import { useEffect, useMemo, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { categoryLabel } from "@/lib/partnership-labels";
import { parsePoolPercentInput } from "@/lib/parse-pool-percent";
import {
  GENERAL_PARTNERSHIP_CATEGORY,
  inviteRowsToTerms,
  partnershipInviteTermsEmpty,
  type InviteTermRow,
  type PartnershipActionKind,
} from "@/lib/partnership-rules";
import type { Partnership } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { TextAreaField } from "@/components/ui/FormField";
import { TextField } from "@/components/ui/FormField";
import styles from "./PartnerInviteDialog.module.css";

type OrgLimitRow = {
  category: string;
  categoryLabel: string;
  poolPercent: number | null;
};

type PartnerCounterOfferDialogProps = {
  partnership: Partnership;
  patchAction: Extract<PartnershipActionKind, "counter_offer" | "counter_offer_back">;
  busy: boolean;
  onClose: () => void;
  onSent: () => void;
};

function rowsFromPartnershipTerms(partnership: Partnership): InviteTermRow[] {
  const active = partnership.terms.filter((t) => !t.isExcluded);
  if (!active.length) return [];
  return active.map((t) => ({
    category: t.category,
    percent: String(t.storePercent),
    excluded: false,
  }));
}

function rowsFromLimits(limits: OrgLimitRow[]): InviteTermRow[] {
  return limits.map((l) => ({
    category: l.category,
    percent: l.poolPercent == null ? "" : String(l.poolPercent),
    excluded: false,
  }));
}

function emptyDraftRow(): InviteTermRow[] {
  return [{ category: GENERAL_PARTNERSHIP_CATEGORY, percent: "", excluded: false }];
}

export function PartnerCounterOfferDialog({
  partnership,
  patchAction,
  busy,
  onClose,
  onSent,
}: PartnerCounterOfferDialogProps) {
  const [rows, setRows] = useState<InviteTermRow[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const title =
    patchAction === "counter_offer_back" ? "Запросить другие условия" : "Предложение агенту";

  const pendingTerms = useMemo(() => rowsFromPartnershipTerms(partnership), [partnership]);

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    setLoadError("");

    if (partnership.status === "PENDING" && pendingTerms.length > 0) {
      setRows(pendingTerms);
      setLoadState("ready");
      return () => {
        cancelled = true;
      };
    }

    void remcardFetch<{ limits?: OrgLimitRow[] }>("/api/pro/limits/org")
      .then((data) => {
        if (cancelled) return;
        const fromOrg = rowsFromLimits(data.limits ?? []);
        setRows(fromOrg.length ? fromOrg : emptyDraftRow());
        setLoadState("ready");
      })
      .catch((caught) => {
        if (cancelled) return;
        setLoadError(
          caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить общие условия",
        );
        if (pendingTerms.length) {
          setRows(pendingTerms);
          setLoadState("ready");
        } else {
          setRows([]);
          setLoadState("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [partnership.status, pendingTerms]);

  async function submit() {
    setError("");
    const active = rows.filter((r) => !r.excluded && r.category);
    if (!active.length) {
      setError("Укажите хотя бы одну категорию");
      return;
    }
    for (const row of active) {
      const parsed = parsePoolPercentInput(row.percent);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
    }
    setSending(true);
    try {
      await remcardFetch(`/api/partnership/${partnership.id}`, {
        method: "PATCH",
        body: {
          action: patchAction,
          note: message.trim() || undefined,
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
        <h3 id="counter-offer-title">{title}</h3>
        <p className={styles.hint}>
          {patchAction === "counter_offer_back"
            ? "Скорректируйте предложенные категории и общий процент или добавьте комментарий партнёру."
            : "Укажите персональные категории и общий процент. Это не меняет опубликованные общие условия для агентов."}
        </p>
        {partnership.status === "PENDING" && !partnershipInviteTermsEmpty(partnership) ? (
          <p className={styles.hint}>Текущее предложение предзаполнено из персональных условий.</p>
        ) : null}
        {loadState === "loading" ? <p className={styles.hint}>Загрузка…</p> : null}
        {loadError ? (
          <p className={styles.error} role="alert">
            {loadError}
          </p>
        ) : null}
        {loadState === "error" ? (
          <p className={styles.error} role="alert">
            Нельзя составить предложение без категорий.{" "}
            <button type="button" onClick={() => window.location.reload()}>
              Обновить
            </button>
          </p>
        ) : null}
        {loadState === "ready" ? (
          <div className={styles.termsList}>
            {rows.map((row, index) => (
              <div key={`${row.category}-${index}`} className={styles.termRow}>
                <strong>{categoryLabel(row.category)}</strong>
                <TextField
                  label="Общий %"
                  type="text"
                  inputMode="decimal"
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
        <TextAreaField
          label="Комментарий"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          hint="Необязательно"
        />
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button disabled={busy || sending || loadState !== "ready"} onClick={() => void submit()}>
            {sending ? "Отправка…" : "Отправить"}
          </Button>
          <Button variant="secondary" disabled={sending} onClick={onClose}>
            Отмена
          </Button>
        </div>
      </div>
    </div>
  );
}
