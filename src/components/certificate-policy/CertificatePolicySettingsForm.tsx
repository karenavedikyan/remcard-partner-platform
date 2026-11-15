"use client";

import { useEffect, useState } from "react";
import { CERTIFICATE_POLICY_MOSCOW_EXPIRY_NOTE } from "@/lib/certificate-policy/defaults";
import {
  certificatePolicyDaysWord,
  certificatePolicyLimitsSummary,
  certificatePolicyPurchaseMode,
} from "@/lib/certificate-policy/format";
import { isCertificatePolicyStaleSessionError } from "@/lib/certificate-policy/stale-session";
import { parseCertificatePolicyTermsInput, rejectNoOpIndividualProposal } from "@/lib/certificate-policy/validate";
import type { CertificatePolicyScope, CertificatePolicyTerms } from "@/lib/certificate-policy/types";
import { Button } from "@/components/ui/Button";
import styles from "./certificate-policy.module.css";

type Props = {
  scope: CertificatePolicyScope;
  effective: CertificatePolicyTerms;
  baselineForRates: CertificatePolicyTerms;
  disabled?: boolean;
  saveLabel: string;
  onDirtyChange?: (dirty: boolean) => void;
  /** Skip resetting draft when parent refreshes OCC baseline (409 recovery). */
  freezeDraftReset?: boolean;
  onSubmit: (terms: CertificatePolicyTerms) => Promise<void>;
};

function ratesByCategory(terms: CertificatePolicyTerms): Map<string, number> {
  return new Map(terms.categoryRates.map((r) => [r.category, r.poolPercent]));
}

export function CertificatePolicySettingsForm({
  scope,
  effective,
  baselineForRates,
  disabled = false,
  saveLabel,
  onDirtyChange,
  freezeDraftReset = false,
  onSubmit,
}: Props) {
  const [draft, setDraft] = useState(effective);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (freezeDraftReset) return;
    setDraft(effective);
    setError("");
    onDirtyChange?.(false);
  }, [effective, freezeDraftReset, onDirtyChange]);

  const poolByCategory = ratesByCategory(draft);
  const limitsSummary = certificatePolicyLimitsSummary(draft);

  function patch(partial: Partial<CertificatePolicyTerms>) {
    onDirtyChange?.(true);
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  function patchRate(category: string, poolPercent: number) {
    const base = baselineForRates.categoryRates.find((r) => r.category === category);
    if (!base) return;
    const nextRates = baselineForRates.categoryRates.map((r) => ({
      ...r,
      poolPercent: r.category === category ? poolPercent : poolByCategory.get(r.category) ?? r.poolPercent,
    }));
    patch({ categoryRates: nextRates });
  }

  function stepField(
    field: "validityDays" | "purchaseLimit",
    delta: number,
    min: number,
    max: number,
  ) {
    const current = draft[field];
    const next = Math.min(max, Math.max(min, current + delta));
    patch({ [field]: next });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (disabled || pending) return;
    const validated = parseCertificatePolicyTermsInput(draft, baselineForRates);
    if (!validated.ok) {
      setError(validated.message);
      return;
    }
    if (scope === "individual") {
      const noop = rejectNoOpIndividualProposal(effective, validated.terms);
      if (noop) {
        setError(noop);
        return;
      }
    }
    setPending(true);
    setError("");
    try {
      await onSubmit(validated.terms);
      onDirtyChange?.(false);
    } catch (submitError) {
      if (isCertificatePolicyStaleSessionError(submitError)) return;
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не удалось сохранить.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.cpForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.cpTiles}>
        <div className={styles.cpTile}>
          <span className={styles.cpEyebrow}>Срок скидки</span>
          <div className={styles.cpStepper}>
            <button
              type="button"
              aria-label="Уменьшить срок"
              disabled={disabled || pending}
              onClick={() => stepField("validityDays", -1, 1, 3650)}
            >
              −
            </button>
            <input
              id="cp-days"
              name="days"
              type="number"
              inputMode="numeric"
              min={1}
              max={3650}
              step={1}
              required
              value={draft.validityDays}
              aria-label="Срок действия и гарантии скидки, дней"
              data-testid="cp-days"
              disabled={disabled || pending}
              onChange={(e) => patch({ validityDays: Number(e.target.value) || 0 })}
            />
            <button
              type="button"
              aria-label="Увеличить срок"
              disabled={disabled || pending}
              onClick={() => stepField("validityDays", 1, 1, 3650)}
            >
              +
            </button>
          </div>
          <small className={styles.cpFine}>
            {certificatePolicyDaysWord(draft.validityDays)} с выпуска
          </small>
        </div>
        <div className={styles.cpTile}>
          <span className={styles.cpEyebrow}>Покупок</span>
          <div className={styles.cpStepper}>
            <button
              type="button"
              aria-label="Уменьшить число покупок"
              disabled={disabled || pending}
              onClick={() => stepField("purchaseLimit", -1, 1, 10_000)}
            >
              −
            </button>
            <input
              id="cp-operations"
              name="operations"
              type="number"
              inputMode="numeric"
              min={1}
              max={10_000}
              step={1}
              required
              value={draft.purchaseLimit}
              aria-label="Количество покупок по сертификату"
              data-testid="cp-operations"
              disabled={disabled || pending}
              onChange={(e) => patch({ purchaseLimit: Number(e.target.value) || 0 })}
            />
            <button
              type="button"
              aria-label="Увеличить число покупок"
              disabled={disabled || pending}
              onClick={() => stepField("purchaseLimit", 1, 1, 10_000)}
            >
              +
            </button>
          </div>
          <small className={styles.cpFine}>
            {certificatePolicyPurchaseMode(draft.purchaseLimit)}
          </small>
        </div>
      </div>

      <section className={styles.cpBlock}>
        <span className={styles.cpEyebrow}>Процент по категориям</span>
        <div className={styles.cpRates}>
          {baselineForRates.categoryRates.map((rate) => (
            <div className={styles.cpRate} key={rate.category}>
              <label htmlFor={`cp-rate-${rate.category}`}>{rate.categoryLabel}</label>
              <div className={styles.cpPct}>
                <input
                  id={`cp-rate-${rate.category}`}
                  name={`rate-${rate.category}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step={0.1}
                  value={poolByCategory.get(rate.category) ?? rate.poolPercent}
                  data-testid={`cp-rate-${rate.category}`}
                  disabled={disabled || pending}
                  onChange={(e) => patchRate(rate.category, Number(e.target.value))}
                />
                <span aria-hidden="true">%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <details className={styles.cpDetails}>
        <summary>
          <span>Ограничения</span>
          <small>{limitsSummary}</small>
        </summary>
        <div className={styles.cpDetailsBody}>
          <label className={styles.cpField} htmlFor="cp-minimum">
            <span>Покупка от, ₽</span>
            <input
              id="cp-minimum"
              name="minimum"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={draft.minimumPurchaseAmount ?? 0}
              data-testid="cp-minimum"
              disabled={disabled || pending}
              onChange={(e) =>
                patch({
                  minimumPurchaseAmount: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
          </label>
          <label className={styles.cpCheck}>
            <input
              name="promotions"
              id="cp-promotions"
              type="checkbox"
              checked={draft.promotionsCompatible}
              data-testid="cp-promotions"
              disabled={disabled || pending}
              onChange={(e) => patch({ promotionsCompatible: e.target.checked })}
            />
            <b>Суммируется с другими скидками</b>
          </label>
          <label className={styles.cpField} htmlFor="cp-exclusions">
            <span>Исключения</span>
            <textarea
              name="exclusions"
              id="cp-exclusions"
              rows={2}
              maxLength={500}
              value={draft.exclusionsText ?? ""}
              data-testid="cp-exclusions"
              disabled={disabled || pending}
              onChange={(e) => patch({ exclusionsText: e.target.value })}
            />
          </label>
          <p className={styles.cpConventions} role="note" data-testid="cp-moscow-expiry-note">
            {CERTIFICATE_POLICY_MOSCOW_EXPIRY_NOTE}
          </p>
        </div>
      </details>

      {error ? (
        <p className={styles.cpError} role="alert" data-testid="cp-error">
          {error}
        </p>
      ) : null}

      <div className={styles.cpActions}>
        <span className={styles.cpFine}>Выпущенные сертификаты не меняются</span>
        <Button
          type="submit"
          variant="primary"
          data-testid="cp-save"
          disabled={disabled || pending}
        >
          {pending ? "Сохранение…" : saveLabel}
        </Button>
      </div>
    </form>
  );
}