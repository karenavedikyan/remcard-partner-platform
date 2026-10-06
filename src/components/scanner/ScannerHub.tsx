"use client";

import { useCallback, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { extractCertificateCode } from "@/lib/certificate-code";
import {
  buildOrderItems,
  computeOrderTotals,
  validateOrderAmounts,
} from "@/lib/order-totals";
import type {
  OrderCreateResponse,
  OrderPreviewAllowed,
  OrderPreviewDenied,
  OrderPreviewResponse,
} from "@/lib/order-types";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import { QrScanner } from "./QrScanner";
import styles from "./scanner.module.css";

type ScanMode = "choose" | "camera" | "manual" | "preview" | "success";

const UNCERTAIN_ORDER_MESSAGE =
  "Результат покупки не подтверждён. Проверьте операции перед повтором.";

function formatUsage(usageCount: number, maxUsages: number) {
  if (maxUsages > 0) {
    return `${usageCount} из ${maxUsages}`;
  }
  return `${usageCount} (без ограничений)`;
}

function formatRub(value: number) {
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

function PartnerAcceptance({ preview }: { preview: OrderPreviewAllowed }) {
  const [expanded, setExpanded] = useState(false);
  const cards = preview.certificate.partnerCards ?? [];

  if (cards.length === 0) {
    return (
      <p className={styles.meta} style={{ marginTop: "var(--space-3)" }}>
        Принимается у партнёра {preview.partner.storeName}
      </p>
    );
  }

  return (
    <div style={{ marginTop: "var(--space-4)" }}>
      <button
        type="button"
        className={styles.expandButton}
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        Где действует документ
        <span aria-hidden>{expanded ? "▴" : "▾"}</span>
      </button>
      {expanded ? (
        <ul className={styles.partnerList}>
          {cards.map((card, index) => (
            <li key={`${card.publicName ?? "partner"}-${index}`} className={styles.partnerItem}>
              <strong>{card.publicName ?? "Партнёр"}</strong>
              {card.city ? <span className={styles.meta}> · {card.city}</span> : null}
              {card.categories?.length ? (
                <ul className={styles.categoryList}>
                  {card.categories.map((cat) => (
                    <li key={cat.categoryLabel}>
                      {cat.categoryLabel}: −{cat.discountPercent}%
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ScannerHub() {
  const [mode, setMode] = useState<ScanMode>("manual");
  const [manualCode, setManualCode] = useState("");
  const [certificateCode, setCertificateCode] = useState("");
  const [preview, setPreview] = useState<OrderPreviewAllowed | OrderPreviewDenied | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<OrderCreateResponse | null>(null);
  const [cameraError, setCameraError] = useState("");

  const resetAll = useCallback(() => {
    setMode("manual");
    setManualCode("");
    setCertificateCode("");
    setPreview(null);
    setPreviewError("");
    setPreviewLoading(false);
    setAmountDrafts({});
    setSubmitError("");
    setSubmitting(false);
    setSuccess(null);
    setCameraError("");
  }, []);

  const runPreview = useCallback(async (raw: string) => {
    const code = extractCertificateCode(raw);
    if (!code) {
      setPreviewError("Укажите код документа");
      return;
    }

    setPreviewLoading(true);
    setPreviewError("");
    setSubmitError("");
    setSuccess(null);
    setPreview(null);
    setCertificateCode(code);
    setMode("preview");

    try {
      const data = await remcardFetch<OrderPreviewResponse>("/api/store/order/preview", {
        method: "POST",
        body: { certificateCode: code },
      });

      if ("allowed" in data && data.allowed) {
        setPreview(data);
        const drafts: Record<string, string> = {};
        for (const cat of data.availableCategories) {
          drafts[cat.category] = "";
        }
        setAmountDrafts(drafts);
      } else {
        setPreview(data as OrderPreviewDenied);
      }
    } catch (caught) {
      setPreview(null);
      setPreviewError(
        caught instanceof RemcardApiError
          ? caught.message
          : "Не удалось проверить документ",
      );
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  async function submitOrder() {
    if (!preview || !preview.allowed || submitting) {
      return;
    }

    const validation = validateOrderAmounts(preview.availableCategories, amountDrafts);
    if (!validation.ok) {
      setSubmitError(validation.message);
      return;
    }

    const items = buildOrderItems(preview.availableCategories, amountDrafts);
    setSubmitting(true);
    setSubmitError("");

    try {
      const data = await remcardFetch<OrderCreateResponse>("/api/store/order", {
        method: "POST",
        body: { certificateCode, items },
      });
      setSuccess(data);
      setPreview(null);
      setMode("success");
    } catch (caught) {
      if (caught instanceof RemcardApiError) {
        setSubmitError(caught.message);
      } else {
        setSubmitError(UNCERTAIN_ORDER_MESSAGE);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const totals =
    preview && preview.allowed
      ? computeOrderTotals(preview.availableCategories, amountDrafts)
      : null;

  if (mode === "success" && success) {
    return (
      <div>
        <div className={styles.successBanner}>Покупка подтверждена</div>
        <div className={`${styles.card} ${styles.cardDark}`} style={{ marginTop: "var(--space-4)" }}>
          <p className={styles.meta}>Операция #{success.order.id}</p>
          <p className={styles.previewTitle}>Документ {certificateCode}</p>
          <div className={styles.summaryRow}>
            <span>Сумма покупки</span>
            <span>{formatRub(success.summary.totalAmount)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Скидка клиенту</span>
            <span>−{formatRub(success.summary.discountAmount)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>К оплате</span>
            <strong>{formatRub(success.summary.totalAmount - success.summary.discountAmount)}</strong>
          </div>
          {!success.summary.isSelfScan &&
          (success.summary.issuerBonusAmount ?? success.summary.proBonusAmount) ? (
            <p className={styles.meta} style={{ marginTop: "var(--space-3)" }}>
              Вознаграждение PROF (начисление по правилам сервера):{" "}
              {formatRub(
                success.summary.issuerBonusAmount ?? success.summary.proBonusAmount ?? 0,
              )}
            </p>
          ) : null}
        </div>
        <Button onClick={resetAll}>Сканировать следующий код</Button>
      </div>
    );
  }

  if (preview && preview.allowed) {
    return (
      <div>
        <div className={`${styles.card} ${styles.cardDark}`}>
          <p className={styles.meta}>Документ</p>
          <p className={styles.previewTitle}>{preview.certificate.promoCode}</p>
          <p className={styles.meta}>
            {preview.certificate.issuer.label}: {preview.certificate.issuer.name}
          </p>
          <p className={styles.meta}>Статус: {preview.certificate.status}</p>
          <p className={styles.meta}>
            Действует до:{" "}
            {preview.certificate.validUntil
              ? new Date(preview.certificate.validUntil).toLocaleDateString("ru-RU")
              : "без ограничения"}
          </p>
          <p className={styles.meta}>
            Использований:{" "}
            {formatUsage(preview.certificate.usageCount, preview.certificate.maxUsages)}
          </p>
          {preview.certificate.userAlias ? (
            <p className={styles.meta}>Клиент: {preview.certificate.userAlias}</p>
          ) : null}
          <PartnerAcceptance preview={preview} />
        </div>

        <div className={styles.card}>
          <h3 className={styles.previewTitle}>Оформление покупки</h3>
          <p className={styles.meta}>
            Партнёр: {preview.partner.storeName}
            {preview.partner.isSelfScan ? " · самосканирование" : ""}
          </p>
          <p className={styles.meta}>
            Сумма указывается до скидки, в рублях. Скидка и итог рассчитывает сервер.
          </p>

          <div style={{ display: "grid", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
            {preview.availableCategories.map((category) => (
              <div key={category.category} className={styles.categoryRow}>
                <div className={styles.categoryHeader}>
                  <strong>{category.categoryLabel}</strong>
                  <span className={styles.discountBadge}>−{category.discountPercent}%</span>
                </div>
                <TextField
                  label="Сумма покупки до скидки, ₽"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={amountDrafts[category.category] ?? ""}
                  disabled={submitting}
                  onChange={(event) =>
                    setAmountDrafts((prev) => ({
                      ...prev,
                      [category.category]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>

          {totals ? (
            <div className={styles.summary} style={{ marginTop: "var(--space-4)" }}>
              <div className={styles.summaryRow}>
                <span>Сумма покупки</span>
                <span>{formatRub(totals.totalAmount)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Скидка клиенту</span>
                <span>−{formatRub(totals.totalDiscount)}</span>
              </div>
              <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                <span>К оплате (ориентир)</span>
                <span>{formatRub(totals.payableAmount)}</span>
              </div>
              {!preview.partner.isSelfScan && totals.totalIssuerBonus > 0 ? (
                <p className={styles.meta} style={{ color: "rgba(255,255,255,0.65)" }}>
                  Вознаграждение PROF (ориентир): {formatRub(totals.totalIssuerBonus)}
                </p>
              ) : null}
            </div>
          ) : null}

          {submitError ? (
            <p className={styles.errorText} role="alert">
              {submitError}
            </p>
          ) : null}

          <div className={styles.actionsRow}>
            <Button variant="secondary" disabled={submitting} onClick={resetAll}>
              Отмена
            </Button>
            <Button
              disabled={submitting || !totals || totals.totalAmount <= 0}
              onClick={() => void submitOrder()}
            >
              {submitting ? "Подтверждение…" : "Подтвердить покупку"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (preview && !preview.allowed) {
    return (
      <div className={styles.deniedBlock}>
        <p className={styles.previewTitle}>
          Документ {preview.certificate?.promoCode ?? certificateCode}
        </p>
        <p className={styles.errorText} role="alert">
          {preview.message}
        </p>
        <div style={{ marginTop: "var(--space-4)" }}>
          <Button variant="secondary" onClick={resetAll}>
            Сканировать другой код
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {mode !== "camera" ? (
        <>
          <div className={styles.scannerHero}>
            <span className={styles.scannerIcon} aria-hidden>
              ▣
            </span>
            <p className={styles.scannerLead}>
              Сканируйте QR-код документа или введите промокод вручную. Предпросмотр не создаёт
              покупку — подтверждение только по кнопке ниже.
            </p>
          </div>
          <div className={styles.modeSwitch}>
            <button
              type="button"
              className={`${styles.modeButton} ${mode !== "camera" ? styles.modeButtonActive : ""}`}
              onClick={() => {
                setCameraError("");
                setPreviewError("");
                setMode("manual");
              }}
            >
              ⌨ Ввести код
            </button>
            <button
              type="button"
              className={`${styles.modeButton} ${mode === "camera" ? styles.modeButtonActive : ""}`}
              onClick={() => {
                setCameraError("");
                setPreviewError("");
                setMode("camera");
              }}
            >
              📷 Сканировать QR
            </button>
          </div>

          {mode !== "camera" ? (
            <div className={styles.manualRow}>
              <div className={styles.manualInput}>
                <TextField
                  label="Код или промокод"
                  value={manualCode}
                  placeholder="RC-XXXXXX"
                  onChange={(event) => setManualCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void runPreview(manualCode);
                    }
                  }}
                />
              </div>
              <Button disabled={previewLoading} onClick={() => void runPreview(manualCode)}>
                {previewLoading ? "Проверка…" : "Найти"}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}

      {mode === "camera" ? (
        <>
          <QrScanner
            onCode={(code) => void runPreview(code)}
            onError={(message) => {
              setCameraError(message);
              setMode("manual");
            }}
          />
          <div style={{ marginTop: "var(--space-3)" }}>
            <Button variant="secondary" onClick={() => setMode("manual")}>
              Ввести код вручную
            </Button>
          </div>
        </>
      ) : null}

      {previewLoading ? <p className={styles.meta}>Проверка документа…</p> : null}

      {(previewError || cameraError) && !previewLoading ? (
        <div className={styles.errorBlock} role="alert">
          <p>{previewError || cameraError}</p>
          {cameraError ? (
            <Button variant="secondary" onClick={() => setMode("manual")}>
              Ввести код вручную
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
