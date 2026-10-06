"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type {
  AvailablePartner,
  AvailablePartnersResponse,
  CreateCertificateBody,
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

  function discountKey(storeUserId: string, category: string) {
    return `${storeUserId}::${category}`;
  }

  async function submit() {
    if (submitting || created) {
      return;
    }
    setSubmitError("");
    if (selectedPartners.length === 0) {
      setSubmitError("Выберите хотя бы одного партнёра");
      return;
    }

    const body: CreateCertificateBody = {
      validUntil: validityToIso(validityPreset),
      maxUsages: 0,
      partners: [],
    };

    for (const partner of selectedPartners) {
      const categories = partner.categories.map((cat) => {
        const raw =
          discountDrafts[discountKey(partner.storeUserId, cat.category)] ??
          String(cat.discountPercent);
        const discountPercent = Number(raw);
        if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
          throw new Error(`Некорректная скидка для ${cat.categoryLabel}`);
        }
        const pool = cat.poolPercent ?? 100;
        if (discountPercent + (cat.issuerPercent ?? 0) > pool + 0.001) {
          throw new Error(
            `Скидка и вознаграждение не могут превышать ${pool}% для ${cat.categoryLabel}`,
          );
        }
        return {
          category: cat.category,
          categoryLabel: cat.categoryLabel,
          discountPercent,
          issuerPercent: cat.issuerPercent ?? 0,
        };
      });
      body.partners.push({
        storeUserId: partner.storeUserId,
        storeName: partner.storeName,
        partnershipId: partner.partnershipId,
        isSelfScan: partner.isSelfScan,
        categories,
      });
    }

    setSubmitting(true);
    try {
      const result = await remcardFetch<StoreCertificate>("/api/store/certificate", {
        method: "POST",
        body,
      });
      setCreated(result);
    } catch (caught) {
      if (caught instanceof Error && !(caught instanceof RemcardApiError)) {
        setSubmitError(caught.message);
      } else {
        setSubmitError(
          caught instanceof RemcardApiError ? caught.message : "Не удалось создать документ",
        );
      }
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
                Укажите скидку по каждой категории. Партнёр и сервер проверят допустимые пределы.
              </p>
              <div className={styles.conditionsGrid}>
                {selectedPartners.flatMap((partner) =>
                  partner.categories.map((cat) => {
                    const key = discountKey(partner.storeUserId, cat.category);
                    const pool = cat.poolPercent ?? cat.discountPercent;
                    return (
                      <div key={key} className={styles.conditionRow}>
                        <strong>
                          {partner.storeName} — {cat.categoryLabel}
                        </strong>
                        <p className={styles.conditionMeta}>
                          Доступный предел: {pool}% (скидка + ваше вознаграждение)
                        </p>
                        <TextField
                          label="Скидка клиенту, %"
                          type="number"
                          min={0}
                          max={100}
                          value={
                            discountDrafts[key] ??
                            String(cat.discountPercent ?? cat.poolPercent ?? 10)
                          }
                          onChange={(event) =>
                            setDiscountDrafts((prev) => ({
                              ...prev,
                              [key]: event.target.value,
                            }))
                          }
                        />
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
            onClick={() => {
              try {
                void submit();
              } catch (caught) {
                setSubmitError(caught instanceof Error ? caught.message : "Ошибка проверки");
              }
            }}
          >
            {submitting ? "Создание…" : "Создать рекомендацию"}
          </Button>
        </>
      ) : null}
    </>
  );
}
