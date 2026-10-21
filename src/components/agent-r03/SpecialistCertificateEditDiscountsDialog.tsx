"use client";

import { useEffect, useMemo, useState } from "react";
import { displayCategoryLabel } from "@/lib/category-display";
import {
  categoryFieldKey,
  computeCategoryPercents,
  previewIssuerPercent,
  resolvePoolPercent,
} from "@/lib/certificate-percent";
import type { AgentCertificateRow } from "@/lib/agent-r03/types";
import { RemcardApiError } from "@/lib/api-client";
import { patchSpecialistIssuerCertificate } from "@/lib/specialist-certificates/api";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import styles from "./agent-r03.module.css";

type RowModel = {
  key: string;
  storeUserId: string;
  category: string;
  partnerName: string;
  categoryLabel: string;
  poolPercent: number | null;
  isSelfScan: boolean;
  initialDiscount: string;
};

function buildRows(cert: AgentCertificateRow): RowModel[] {
  const offers = cert.partnerOffers ?? [];
  const rows: RowModel[] = [];
  for (const offer of offers) {
    const storeUserId = offer.storeUserId?.trim();
    if (!storeUserId) continue;
    for (const cat of offer.categories ?? []) {
      const category = cat.category?.trim();
      if (!category) continue;
      const poolPercent = resolvePoolPercent({
        category,
        categoryLabel: cat.categoryLabel,
        poolPercent:
          cat.discountPercent != null && cat.issuerBonusPercent != null
            ? cat.discountPercent + cat.issuerBonusPercent
            : undefined,
        isSelfScan: false,
      });
      rows.push({
        key: categoryFieldKey(storeUserId, category),
        storeUserId,
        category,
        partnerName: offer.storeName,
        categoryLabel: cat.categoryLabel,
        poolPercent,
        isSelfScan: false,
        initialDiscount: String(cat.discountPercent),
      });
    }
  }
  return rows;
}

type Props = {
  open: boolean;
  cert: AgentCertificateRow | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export function SpecialistCertificateEditDiscountsDialog({ open, cert, onClose, onSaved }: Props) {
  const rows = useMemo(() => (cert ? buildRows(cert) : []), [cert]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !cert) return;
    const next: Record<string, string> = {};
    for (const row of buildRows(cert)) {
      next[row.key] = row.initialDiscount;
    }
    setDrafts(next);
    setFieldErrors({});
    setSubmitError("");
  }, [open, cert]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, saving]);

  if (!open || !cert) return null;

  const blocked = cert.hasOrders || cert.status === "CANCELLED";

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (blocked || saving) return;

    const errors: Record<string, string> = {};
    const updates: Array<{ storeUserId: string; category: string; discountPercent: number }> = [];

    for (const row of rows) {
      const raw = drafts[row.key] ?? "";
      const result = computeCategoryPercents(
        {
          category: row.category,
          categoryLabel: row.categoryLabel,
          poolPercent: row.poolPercent ?? undefined,
          isSelfScan: row.isSelfScan,
        },
        raw,
      );
      if (!result.ok) {
        errors[row.key] = result.message;
        continue;
      }
      updates.push({
        storeUserId: row.storeUserId,
        category: row.category,
        discountPercent: result.value.discountPercent,
      });
    }

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setSubmitError("Проверьте значения скидок");
      return;
    }
    if (!updates.length) {
      setSubmitError("Нет категорий для сохранения");
      return;
    }

    setSaving(true);
    setSubmitError("");
    const activeCert = cert;
    try {
      await patchSpecialistIssuerCertificate(activeCert.id, {
        action: "updateDiscounts",
        updates,
      });
      await onSaved();
      onClose();
    } catch (caught) {
      setSubmitError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.dialogBackdrop} role="presentation" onClick={() => !saving && onClose()}>
      <form
        className={`${styles.r03Root} ${styles.dialogPanel}`}
        role="dialog"
        aria-labelledby="edit-discounts-title"
        data-testid="specialist-certificate-edit-discounts-dialog"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void handleSave(e)}
      >
        <div className={styles.dialogTitleRow}>
          <h2 id="edit-discounts-title">Изменить скидки</h2>
          <button
            type="button"
            className={styles.dialogCloseBtn}
            aria-label="Закрыть"
            onClick={onClose}
            disabled={saving}
          >
            ×
          </button>
        </div>

        {blocked ? (
          <p className={styles.errorText} role="alert">
            {cert.hasOrders
              ? "Нельзя изменить условия сертификата с покупками или использованиями."
              : "Сертификат отключён."}
          </p>
        ) : null}

        <div className={styles.termsBody}>
          {rows.map((row) => {
            const draftValue = drafts[row.key] ?? row.initialDiscount;
            const issuerPreview = previewIssuerPercent(
              {
                category: row.category,
                categoryLabel: row.categoryLabel,
                poolPercent: row.poolPercent ?? undefined,
                isSelfScan: row.isSelfScan,
              },
              draftValue,
            );
            return (
              <div key={row.key} className={styles.field}>
                <strong>
                  {row.partnerName} — {displayCategoryLabel(row.category, row.categoryLabel)}
                </strong>
                {row.poolPercent != null ? (
                  <p className={styles.muted}>Согласованный процент: {row.poolPercent}%</p>
                ) : (
                  <p className={styles.errorText}>Нет согласованного процента для этой категории</p>
                )}
                <TextField
                  label="Скидка клиенту, %"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  disabled={blocked || saving || row.poolPercent == null}
                  value={draftValue}
                  error={fieldErrors[row.key]}
                  onChange={(event) => {
                    const next = event.target.value;
                    setDrafts((prev) => ({ ...prev, [row.key]: next }));
                    if (fieldErrors[row.key]) {
                      setFieldErrors((prev) => {
                        const copy = { ...prev };
                        delete copy[row.key];
                        return copy;
                      });
                    }
                  }}
                />
                {row.poolPercent != null ? (
                  <p className={styles.muted}>
                    Бонус issuer: {issuerPreview != null ? `${issuerPreview}%` : "—"}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        {submitError ? (
          <p className={styles.errorText} role="alert">
            {submitError}
          </p>
        ) : null}

        <div className={styles.dialogActions}>
          <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={blocked || saving || rows.length === 0}>
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
        </div>
      </form>
    </div>
  );
}
