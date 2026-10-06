"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import {
  buildCreateCertificatePayload,
  categoryFieldKey,
  partnershipTermsHref,
  previewIssuerPercent,
  resolvePoolPercent,
} from "@/lib/certificate-percent";
import type { CategoryValidationFailureReason } from "@/lib/certificate-percent";
import type {
  AvailablePartner,
  AvailablePartnersResponse,
  StoreCertificate,
} from "@/lib/certificate-types";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import { CertificateResultView } from "./CertificateResultView";
import styles from "./recommendations.module.css";

type ValidityPreset = "1" | "3" | "6" | "12" | "unlimited";

const VALIDITY_OPTIONS: Array<{ value: ValidityPreset; label: string }> = [
  { value: "1", label: "1 месяц" },
  { value: "3", label: "3 месяца" },
  { value: "6", label: "6 месяцев" },
  { value: "12", label: "12 месяцев" },
  { value: "unlimited", label: "Без ограничения" },
];

function partnerKey(partner: AvailablePartner): string {
  return `${partner.storeUserId}:${partner.partnershipId ?? "self"}`;
}

function validityToIso(value: ValidityPreset): string | undefined {
  if (value === "unlimited") {
    return undefined;
  }
  const date = new Date();
  date.setMonth(date.getMonth() + Number(value));
  return date.toISOString();
}

export function CertificateCreateForm() {
  const [partners, setPartners] = useState<AvailablePartner[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [validityPreset, setValidityPreset] = useState<ValidityPreset>("3");
  const [discountDrafts, setDiscountDrafts] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fieldErrorReasons, setFieldErrorReasons] = useState<
    Record<string, CategoryValidationFailureReason>
  >({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<StoreCertificate | null>(null);

  const loadPartners = useCallback(async () => {
    setLoadState("loading");
    setLoadError("");
    try {
      const data = await remcardFetch<AvailablePartnersResponse>(
        "/api/store/certificate/available-partners",
      );
      const rows = [...(data.partners ?? [])];
      if (data.selfScanPartner) {
        rows.push(data.selfScanPartner);
      }
      setPartners(rows);
      setLoadState("loaded");
    } catch (caught) {
      setPartners([]);
      setLoadState("error");
      setLoadError(
        caught instanceof RemcardApiError
          ? caught.message
          : "Не удалось загрузить партнёров для документа",
      );
    }
  }, []);

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);

  const selectablePartners = useMemo(
    () => partners.filter((p) => p.programReady !== false && p.categories.length > 0),
    [partners],
  );

  const selectedPartners = useMemo(
    () => selectablePartners.filter((p) => selectedKeys.includes(partnerKey(p))),
    [selectablePartners, selectedKeys],
  );

  function togglePartner(partner: AvailablePartner) {
    const key = partnerKey(partner);
    if (partner.programReady === false) {
      return;
    }
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  }

  async function submit() {
    if (submitting || created) {
      return;
    }

    setSubmitError("");
    setFieldErrors({});
    setFieldErrorReasons({});

    const payloadResult = buildCreateCertificatePayload({
      selectedPartners,
      discountDrafts,
      validUntil: validityToIso(validityPreset),
      maxUsages: 0,
    });

    if (!payloadResult.ok) {
      setSubmitError(payloadResult.formError ?? "Проверьте условия документа");
      setFieldErrors(payloadResult.fieldErrors);
      setFieldErrorReasons(payloadResult.fieldErrorReasons);
      return;
    }

    setSubmitting(true);
    try {
      const result = await remcardFetch<StoreCertificate>("/api/store/certificate", {
        method: "POST",
        body: payloadResult.body,
      });
      setCreated(result);
    } catch (caught) {
      setSubmitError(
        caught instanceof RemcardApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Не удалось создать документ",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return <CertificateResultView certificate={created} />;
  }

  return (
    <>
      {loadState === "loading" ? <p className={styles.loading}>Загрузка партнёров…</p> : null}
      {loadState === "error" ? (
        <div className={styles.errorBlock}>
          <p role="alert">{loadError}</p>
          <Button variant="secondary" onClick={() => void loadPartners()}>
            Повторить
          </Button>
        </div>
      ) : null}

      {loadState === "loaded" ? (
        <>
          <section className={styles.formSection}>
            <h3>Партнёры</h3>
            {selectablePartners.length === 0 ? (
              <p className={styles.meta}>
                Нет доступных партнёрств для создания документа. Сначала оформите активное
                партнёрство.
              </p>
            ) : (
              <div className={styles.partnerPick}>
                {partners.map((partner) => {
                  const key = partnerKey(partner);
                  const disabled = partner.programReady === false || partner.categories.length === 0;
                  const selected = selectedKeys.includes(key);
                  return (
                    <label
                      key={key}
                      className={`${styles.partnerOption} ${selected ? styles.partnerOptionSelected : ""} ${disabled ? styles.partnerOptionDisabled : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={disabled}
                        onChange={() => togglePartner(partner)}
                      />
                      <span>
                        <strong>{partner.storeName}</strong>
                        {partner.city ? ` · ${partner.city}` : ""}
                        {disabled && partner.programMissing?.length ? (
                          <span className={styles.conditionMeta}>
                            {" "}
                            — профиль партнёра не готов
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          {selectedPartners.length > 0 ? (
            <section className={styles.formSection}>
              <h3>Условия для клиента</h3>
              <p className={styles.meta}>
                Общий процент задаётся в условиях партнёрства. Здесь вы распределяете его между
                скидкой клиенту и своим вознаграждением.
              </p>
              <div className={styles.conditionsGrid}>
                {selectedPartners.flatMap((partner) =>
                  partner.categories.map((cat) => {
                    const key = categoryFieldKey(partner.storeUserId, cat.category);
                    const pool = resolvePoolPercent({
                      category: cat.category,
                      categoryLabel: cat.categoryLabel,
                      poolPercent: cat.poolPercent,
                      isSelfScan: partner.isSelfScan,
                    });
                    const draftValue =
                      discountDrafts[key] ??
                      (cat.discountPercent != null ? String(cat.discountPercent) : "");
                    const issuerPreview = previewIssuerPercent(
                      {
                        category: cat.category,
                        categoryLabel: cat.categoryLabel,
                        poolPercent: cat.poolPercent,
                        isSelfScan: partner.isSelfScan,
                      },
                      draftValue,
                    );
                    const rowBlocked = pool === null;
                    const termsHref = partnershipTermsHref(partner.partnershipId);

                    return (
                      <div
                        key={key}
                        className={`${styles.conditionRow} ${rowBlocked ? styles.conditionRowBlocked : ""}`}
                      >
                        <strong>
                          {partner.storeName} — {cat.categoryLabel}
                        </strong>
                        {pool !== null ? (
                          <p className={styles.agreedPercent}>
                            Согласованный процент: <strong>{pool}%</strong>
                          </p>
                        ) : (
                          <p className={styles.errorText} role="alert">
                            Нет согласованного процента для этой категории
                          </p>
                        )}
                        <TextField
                          label="Скидка клиенту, %"
                          type="number"
                          inputMode="decimal"
                          disabled={rowBlocked || submitting}
                          value={draftValue}
                          error={fieldErrors[key]}
                          onChange={(event) => {
                            const next = event.target.value;
                            setDiscountDrafts((prev) => ({ ...prev, [key]: next }));
                            if (fieldErrors[key]) {
                              setFieldErrors((prev) => {
                                const copy = { ...prev };
                                delete copy[key];
                                return copy;
                              });
                              setFieldErrorReasons((prev) => {
                                const copy = { ...prev };
                                delete copy[key];
                                return copy;
                              });
                            }
                          }}
                        />
                        {!partner.isSelfScan && pool !== null ? (
                          <p className={styles.conditionMeta}>
                            Ваше вознаграждение:{" "}
                            <strong>
                              {issuerPreview != null ? `${issuerPreview}%` : "—"}
                            </strong>
                          </p>
                        ) : null}
                        {fieldErrorReasons[key] === "over_limit" && termsHref ? (
                          <p className={styles.termsLinkWrap}>
                            <Link href={termsHref} className={styles.termsLink}>
                              Изменить условия партнёрства
                            </Link>
                          </p>
                        ) : null}
                        {partner.isSelfScan ? (
                          <p className={styles.conditionMeta}>
                            Самосканирование: только скидка клиенту, вознаграждение PROF — 0%
                          </p>
                        ) : null}
                      </div>
                    );
                  }),
                )}
              </div>
            </section>
          ) : null}

          <section className={styles.formSection}>
            <h3>Срок действия</h3>
            <label className={styles.meta}>
              Срок
              <select
                value={validityPreset}
                disabled={submitting}
                onChange={(event) => setValidityPreset(event.target.value as ValidityPreset)}
              >
                {VALIDITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {submitError ? (
            <p className={styles.errorText} role="alert">
              {submitError}
            </p>
          ) : null}

          <Button
            disabled={submitting || selectablePartners.length === 0}
            onClick={() => void submit()}
          >
            {submitting ? "Создание…" : "Создать рекомендацию"}
          </Button>
        </>
      ) : null}
    </>
  );
}
